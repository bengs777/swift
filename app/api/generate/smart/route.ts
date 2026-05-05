import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { ProviderRouter } from "@/lib/ai/provider-router"
import {
  detectGenerationMode,
  extractFileContext,
  parseGenerationResponse,
  extractJSON,
  buildCodeGenerationPrompt,
  mergeFiles,
  isValidJSON,
} from "@/lib/ai/code-parser"
import type { GeneratedFile, PromptAttachment } from "@/lib/types"
import { z } from "zod"

export const runtime = "nodejs"

const GenerateSmartSchema = z.object({
  prompt: z.string().min(1).max(5000),
  projectId: z.string().min(1),
  selectedModel: z.string().min(1),
  existingFiles: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
        language: z.string(),
      })
    )
    .optional()
    .default([]),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validation = GenerateSmartSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${validation.error.message}`,
          files: [],
        },
        { status: 400 }
      )
    }

    const { prompt, projectId, selectedModel, existingFiles = [] } = validation.data

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found or unauthorized",
          files: [],
        },
        { status: 404 }
      )
    }

    // Detect mode: CREATE or EXTEND
    const mode = detectGenerationMode(existingFiles)

    // Build context if EXTEND mode
    let contextStr = ""
    if (mode === "EXTEND") {
      contextStr = extractFileContext(existingFiles)
    }

    // Build enhanced prompt with mode awareness
    const systemPrompt = buildCodeGenerationPrompt(prompt, mode, contextStr)

    // Get provider router and generate
    const router = ProviderRouter.getInstance()
    let aiResponse: string

    try {
      aiResponse = await router.generate({
        systemPrompt,
        userPrompt: prompt,
        model: selectedModel,
        temperature: 0.7,
        maxTokens: 4000,
      })
    } catch (error) {
      console.error("[v0] AI generation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          files: [],
        },
        { status: 500 }
      )
    }

    // Extract and parse JSON from response
    let jsonStr = aiResponse
    if (!isValidJSON(aiResponse)) {
      console.log("[v0] Attempting to extract JSON from response")
      jsonStr = extractJSON(aiResponse)

      if (!isValidJSON(jsonStr)) {
        // If still not valid, try to fix it
        jsonStr = attemptJSONRepair(jsonStr)
      }
    }

    // Parse generation response
    let generationResult
    try {
      generationResult = parseGenerationResponse(jsonStr)
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse AI output: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          files: [],
        },
        { status: 400 }
      )
    }

    // Merge with existing files if EXTEND mode
    let finalFiles = generationResult.files
    if (mode === "EXTEND" && existingFiles.length > 0) {
      finalFiles = mergeFiles(existingFiles, generationResult.files)
    }

    return NextResponse.json({
      success: true,
      files: finalFiles,
      mode,
      error: generationResult.error,
    })
  } catch (error) {
    console.error("[v0] Unexpected error in /api/generate/smart:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        files: [],
      },
      { status: 500 }
    )
  }
}

/**
 * Attempt to fix malformed JSON by adding missing brackets or quotes
 */
function attemptJSONRepair(text: string): string {
  let repaired = text.trim()

  // If starts with [ or {, assume it's JSON
  if (!repaired.startsWith("{") && !repaired.startsWith("[")) {
    // Try to find JSON object
    const match = repaired.match(/\{[\s\S]*\}/)
    if (match) {
      repaired = match[0]
    } else {
      // Wrap in object if needed
      repaired = `{ "files": [${repaired}] }`
    }
  }

  // Try to close unclosed braces
  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  if (openBraces > closeBraces) {
    repaired += "}".repeat(openBraces - closeBraces)
  }

  return repaired
}
