import { env } from "@/lib/env"
import type { PromptLanguage } from "@/lib/ai/prompt-templates"
import { DEFAULT_MODEL_OPTIONS, isFreeModel } from "@/lib/ai/models"

type ProviderRequest = {
  provider: string
  modelName: string
  prompt: string
  mode?: "chat" | "files" | "inspect"
  promptLanguage?: PromptLanguage
}

type ProviderResponse = {
  message: string
  providerUsed: "agentrouter" | "openai"
  modelUsed: string
  usedFallback: boolean
  fallbackFrom?: "agentrouter" | "openai"
  primaryError?: string
}

type ProviderMessage = {
  message: string
}

class ProviderTimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`${provider} request timed out after ${Math.round(timeoutMs / 1000)} seconds`)
    this.name = "ProviderTimeoutError"
  }
}

const FILE_OUTPUT_SYSTEM_PROMPT = [
  "You are a Senior Fullstack Next.js Developer.",
  "Return ONLY a valid JSON object. No markdown, no code fences, no preamble, no chat.",
  'JSON schema: {"message":"short summary","files":[{"path":"app/page.tsx","language":"tsx","content":"full file content"}]}',
  "Treat the provided project tree and file snippets as the source of truth.",
  "If an AI_CONTEXT_JSON block is present, use it as the source of truth for repo state, file relationships, and project memory.",
  "If a WORKPLAN_JSON block is present, treat it as the execution order: plan first, patch existing files before creating new ones, and stay scoped to the current slice.",
  "Treat structured brief sections such as Tujuan / Goal, Fitur wajib / Must-have features, UI / visual, Data / backend, Batasan / Constraints, and Preview as the source of truth when present.",
  "If a PREVIEW_CONTEXT_JSON block is present, use it as the source of truth for browser/runtime diagnosis and do not invent missing runtime behavior.",
  "Do not invent missing requirements; if a detail is absent, keep the assumption minimal and self-contained.",
  "Convert short prompts into complete, premium, deployable web apps using best-practice defaults.",
  "Auto-detect product intent from the prompt and adapt architecture/UI accordingly. Intent map: dashboard=SaaS admin dashboard, ecommerce=online store with cart + checkout, landing page=marketing page, portfolio=personal brand site, booking=reservation system, crm=internal business tool.",
  "Use only the stack already present in the repo unless the user explicitly asks otherwise: Next.js App Router, React, TypeScript, Tailwind CSS, lucide-react, zod, Prisma, next-auth, and existing shadcn/ui components.",
  "Do not invent new libraries, frameworks, or architectural layers.",
  "Always include responsive design, clean navigation, clear CTA, loading states, empty states, and a usable mobile layout.",
  "Prioritize usefulness, polish, conversion-focused UX, and production readiness over mockups.",
  "Prefer one coherent micro-task per response. If the request is broad, implement the next smallest useful slice instead of trying to finish the entire app at once.",
  "Each file must include path, language, and content.",
  "Allowed language values: tsx, ts, css, json, html, prisma, md, env.",
  "When editing an existing project, patch existing files first and return only changed or newly created files when possible.",
  "If browser preview error context is included in the prompt, treat it as a hard debugging signal and fix the root cause.",
  "Keep the response iterative, concise, and production-ready rather than rewriting everything from scratch.",
  "Do not truncate file content.",
].join(" ")

const INSPECT_SYSTEM_PROMPTS: Record<PromptLanguage, string> = {
  id: [
    "Kamu adalah senior fullstack debugger untuk browser preview.",
    "Gunakan preview context, error browser, dan prompt user sebagai evidence, bukan sebagai instruksi untuk mengarang perilaku baru.",
    "Jika ada AI_CONTEXT_JSON, gunakan itu sebagai evidence untuk state repo, relasi file, dan project memory.",
    "Jika ada WORKPLAN_JSON, gunakan itu untuk memahami slice yang sedang diperbaiki dan jangan melebar ke rewrite penuh.",
    "Jawab dalam bahasa Indonesia.",
    "Fokus pada root cause paling mungkin, evidence yang mendukung, patch minimal, dan langkah verifikasi.",
    "Jika ada detail yang hilang, sebutkan asumsi minimum secara eksplisit.",
  ].join(" "),
  en: [
    "You are a senior fullstack debugger for browser preview.",
    "Use the preview context, browser error, and user prompt as evidence, not as instructions to invent new behavior.",
    "If AI_CONTEXT_JSON is present, use it as evidence for repo state, file relationships, and project memory.",
    "If WORKPLAN_JSON is present, use it to understand the slice being repaired and do not expand into a full rewrite.",
    "Reply in English.",
    "Focus on the most likely root cause, supporting evidence, the smallest patch, and verification steps.",
    "If details are missing, state the minimum assumption explicitly.",
  ].join(" "),
}

const CHAT_SYSTEM_PROMPTS: Record<PromptLanguage, string> = {
  id: [
    "Kamu adalah AI percakapan yang membantu di dalam web app builder.",
    "Balas secara natural dan gunakan bahasa Indonesia.",
    "Jangan keluarkan JSON, daftar file, atau kode kecuali user memang meminta implementasi.",
    "Jaga jawaban tetap singkat, berguna, dan natural.",
  ].join(" "),
  en: [
    "You are a conversational AI inside a web app builder.",
    "Reply naturally and use English.",
    "Do not output JSON, file lists, or code unless the user explicitly asks for implementation.",
    "Keep replies concise, useful, and human-like.",
  ].join(" "),
}

export class ProviderRouter {
  static async generate({ provider, modelName, prompt, mode = "files", promptLanguage = "id" }: ProviderRequest): Promise<ProviderResponse> {
    if (provider === "agentrouter") {
      try {
        const primary = await this.callAgentRouter(modelName, prompt, mode, promptLanguage)
        return {
          message: primary.message,
          providerUsed: "agentrouter",
          modelUsed: modelName,
          usedFallback: false,
        }
      } catch (error) {
        const primaryError = error instanceof Error ? error : new Error(String(error))
        const fallback = await this.tryOpenAiFallback(prompt, primaryError, mode, promptLanguage)
        if (fallback) {
          return fallback
        }
        throw primaryError
      }
    }

    if (provider === "openai") {
      try {
        const openAi = await this.callOpenAI(modelName, prompt, mode, promptLanguage)
        return {
          message: openAi.message,
          providerUsed: "openai",
          modelUsed: modelName,
          usedFallback: false,
        }
      } catch (error) {
        const primaryError = error instanceof Error ? error : new Error(String(error))
        const fallback = await this.tryOpenAiModelFallback(modelName, prompt, primaryError, mode, promptLanguage)
        if (fallback) {
          return fallback
        }
        throw primaryError
      }
    }

    throw new Error(`Unsupported AI provider: ${provider}`)
  }

  private static async callAgentRouter(
    modelName: string,
    prompt: string,
    mode: "chat" | "files" | "inspect",
    promptLanguage: PromptLanguage = "id"
  ): Promise<ProviderMessage> {
    if (!env.agentRouterApiKey) {
      throw new Error("AGENTROUTER_API_KEY is not configured")
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < env.aiMaxRetries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(
          `${env.agentRouterApiUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.agentRouterApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: this.buildMessages(prompt, mode, promptLanguage),
            }),
          },
          "AgentRouter",
          env.aiTimeoutMs
        )

        if (response.ok) {
          const data = await response.json()
          const message =
            data.choices?.[0]?.message?.content ||
            data.choices?.[0]?.message?.reasoning ||
            data.choices?.[0]?.text ||
            data.output_text

          return {
            message:
              typeof message === "string" && message.trim()
                ? message
                : "No response returned by AgentRouter.",
          }
        }

        const errorMessage = await this.extractError(response, "AgentRouter")
        lastError = new Error(errorMessage)

        const shouldRetry = response.status === 429 || response.status >= 500
        if (!shouldRetry || attempt === env.aiMaxRetries - 1) {
          break
        }

        await this.sleep(800 * (attempt + 1))
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < env.aiMaxRetries - 1) {
          await this.sleep(800 * (attempt + 1))
          continue
        }
      }
    }

    throw lastError || new Error("AgentRouter request failed.")
  }

  private static async callOpenAI(
    modelName: string,
    prompt: string,
    mode: "chat" | "files" | "inspect",
    promptLanguage: PromptLanguage = "id"
  ): Promise<ProviderMessage> {
    if (!env.openAiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured")
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < env.aiMaxRetries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(
          `${env.openAiApiUrl}/chat/completions`,
          {
            method: "POST",
            headers: this.buildOpenAiHeaders(),
            body: JSON.stringify({
              model: modelName,
              messages: this.buildMessages(prompt, mode, promptLanguage),
            }),
          },
          "OpenAI",
          env.aiTimeoutMs
        )

        if (response.ok) {
          const data = await response.json()
          return {
            message: data.choices?.[0]?.message?.content || "No response returned by OpenAI.",
          }
        }

        const error = new Error(await this.extractError(response, "OpenAI"))
        lastError = error

        const shouldRetry = response.status === 429 || response.status >= 500
        if (!shouldRetry || attempt === env.aiMaxRetries - 1) {
          break
        }

        await this.sleep(800 * (attempt + 1))
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < env.aiMaxRetries - 1) {
          await this.sleep(800 * (attempt + 1))
          continue
        }
      }
    }

    throw lastError || new Error("OpenAI request failed.")
  }

  private static async tryOpenAiFallback(
    prompt: string,
    primaryError: Error,
    mode: "chat" | "files" | "inspect",
    promptLanguage: PromptLanguage = "id"
  ): Promise<ProviderResponse | null> {
    if (!this.shouldFallbackToOpenAi(primaryError)) {
      return null
    }

    if (env.aiFallbackProvider !== "openai" || !env.openAiApiKey) {
      return null
    }

    const fallbackModel = env.openAiFallbackModel.trim()
    if (!fallbackModel || !isFreeModel(fallbackModel)) {
      return null
    }

    try {
      const fallback = await this.callOpenAI(fallbackModel, prompt, mode, promptLanguage)
      return {
        message: fallback.message,
        providerUsed: "openai",
        modelUsed: fallbackModel,
        usedFallback: true,
        fallbackFrom: "agentrouter",
        primaryError: primaryError.message,
      }
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      throw new Error(`${primaryError.message}; OpenAI fallback failed: ${fallbackMessage}`)
    }
  }

  private static shouldFallbackToOpenAi(error: Error): boolean {
    if (error.message.includes("AGENTROUTER_API_KEY is not configured")) {
      return true
    }

    if (error instanceof ProviderTimeoutError) {
      return true
    }

    const status = this.extractStatusCode(error.message)
    if (typeof status === "number") {
      return status === 401 || status === 403 || status === 404 || status === 408 || status === 409 || status === 429 || status >= 500
    }

    return true
  }

  private static async tryOpenAiModelFallback(
    primaryModel: string,
    prompt: string,
    primaryError: Error,
    mode: "chat" | "files" | "inspect",
    promptLanguage: PromptLanguage = "id"
  ): Promise<ProviderResponse | null> {
    if (!this.shouldTryOpenAiModelFallback(primaryError)) {
      return null
    }

    const candidates = this.getOpenAiFallbackCandidates(primaryModel)
    if (candidates.length === 0) {
      return null
    }

    for (const model of candidates) {
      try {
        const fallback = await this.callOpenAI(model, prompt, mode, promptLanguage)
        return {
          message: fallback.message,
          providerUsed: "openai",
          modelUsed: model,
          usedFallback: true,
          fallbackFrom: "openai",
          primaryError: primaryError.message,
        }
      } catch {
        // Continue to next candidate model.
      }
    }

    return null
  }

  private static shouldTryOpenAiModelFallback(error: Error) {
    if (error instanceof ProviderTimeoutError) {
      return true
    }

    const status = this.extractStatusCode(error.message)
    if (typeof status === "number") {
      return status === 400 || status === 403 || status === 404 || status === 408 || status === 409 || status === 429 || status >= 500
    }

    const normalized = error.message.toLowerCase()
    return (
      normalized.includes("rate-limit") ||
      normalized.includes("rate-limited") ||
      normalized.includes("no endpoints found") ||
      normalized.includes("model not found") ||
      normalized.includes("unknown model")
    )
  }

  private static getOpenAiFallbackCandidates(primaryModel: string) {
    const candidates: string[] = []

    const pushUnique = (value: string) => {
      const normalized = value.trim()
      if (!normalized) {
        return
      }

      if (normalized === primaryModel.trim()) {
        return
      }

      if (!candidates.includes(normalized)) {
        candidates.push(normalized)
      }
    }

    if (env.openAiApiUrl.includes("openrouter.ai")) {
      for (const model of DEFAULT_MODEL_OPTIONS) {
        pushUnique(model.key)
      }
    } else if (isFreeModel(env.openAiFallbackModel)) {
      pushUnique(env.openAiFallbackModel)
    }

    for (const model of env.openAiApiUrl.includes("openrouter.ai") ? [] : env.openAiModels.filter(isFreeModel)) {
      pushUnique(model)
    }

    return candidates
  }

  private static extractStatusCode(message: string): number | undefined {
    const match = message.match(/api error \((\d{3})\)/i)
    if (!match) {
      return undefined
    }

    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : undefined
  }

  private static async extractError(response: Response, provider: string) {
    const text = await response.text()

    try {
      const parsed = JSON.parse(text)
      const baseMessage = parsed.error?.message || parsed.message || text
      const metadataRaw =
        typeof parsed.error?.metadata?.raw === "string"
          ? parsed.error.metadata.raw
          : ""
      const detail = metadataRaw ? ` ${metadataRaw}` : ""
      return `${provider} API error (${response.status}): ${baseMessage}${detail}`.trim()
    } catch {
      return `${provider} API error (${response.status}): ${text}`
    }
  }

  private static buildOpenAiHeaders() {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${env.openAiApiKey}`,
      "Content-Type": "application/json",
    }

    if (env.openAiApiUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = env.nextAuthUrl || "http://localhost:3000"
      headers["X-Title"] = "Swift AI Web Builder"
    }

    return headers
  }

  private static buildMessages(prompt: string, mode: "chat" | "files" | "inspect", promptLanguage: PromptLanguage = "id") {
    const systemPrompt =
      mode === "chat"
        ? CHAT_SYSTEM_PROMPTS[promptLanguage]
        : mode === "inspect"
          ? INSPECT_SYSTEM_PROMPTS[promptLanguage]
          : FILE_OUTPUT_SYSTEM_PROMPT

    return [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ]
  }

  private static async fetchWithTimeout(
    input: string,
    init: RequestInit,
    provider: string,
    timeoutMs: number
  ) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderTimeoutError(provider, timeoutMs)
      }

      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private static sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
