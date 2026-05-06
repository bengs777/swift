import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { orchestratorProvider } from "@/lib/ai/providers/orchestrator-provider"
import { GenerateBillingService } from "@/lib/services/generate-billing.service"
import { BillingService } from "@/lib/services/billing.service"
import type { GeneratedFile } from "@/lib/types"

interface OrchestratorGenerateRequest {
  prompt: string
  projectId: string
  mode?: "CREATE" | "EXTEND"
  existingFiles?: GeneratedFile[]
}

const PROVIDER = "orchestrator"
const MODEL = "deepseek/deepseek-v4-flash"
const COST_PER_REQUEST = 5000 // IDR

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = (await request.json()) as OrchestratorGenerateRequest

    // Validate request
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const { prompt, projectId, mode = "CREATE", existingFiles = [] } = body

    // Check provider configuration
    if (!orchestratorProvider.isConfigured()) {
      return NextResponse.json(
        { error: "Orchestrator provider is not configured" },
        { status: 503 }
      )
    }

    // Check user balance
    const balanceCheck = await GenerateBillingService.checkBalance(session.user.id, COST_PER_REQUEST)

    if (!balanceCheck.hasBalance) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          currentBalance: balanceCheck.currentBalance,
          requiredBalance: COST_PER_REQUEST,
          shortfall: balanceCheck.shortfall,
        },
        { status: 402 }
      )
    }

    // Generate code using Orchestrator
    const result = await orchestratorProvider.generate({
      prompt,
      mode: mode as "CREATE" | "EXTEND",
      existingFiles,
    })

    if (!result.success) {
      // Log failed generation attempt
      await prisma.billingLog.create({
        data: {
          userId: session.user.id,
          provider: PROVIDER,
          model: MODEL,
          costAmount: 0,
          costCurrency: "IDR",
          status: "FAILED",
          projectId: projectId || null,
          details: result.error || "Generation failed",
        },
      }).catch(() => {}) // Silently fail logging

      return NextResponse.json(
        { error: result.error || "Failed to generate code with Orchestrator" },
        { status: 502 }
      )
    }

    // Charge user for successful generation
    const chargeResult = await GenerateBillingService.chargeUser(
      session.user.id,
      COST_PER_REQUEST,
      PROVIDER,
      MODEL,
      projectId
    )

    if (!chargeResult.success) {
      return NextResponse.json(
        { error: "Failed to process billing" },
        { status: 500 }
      )
    }

    // Return generated files
    return NextResponse.json({
      success: true,
      files: result.files,
      provider: PROVIDER,
      model: MODEL,
      cost: COST_PER_REQUEST,
      newBalance: chargeResult.newBalance,
    })
  } catch (error) {
    console.error("[v0] Orchestrator generate error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
