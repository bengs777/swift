import type { GeneratedFile } from "@/lib/types"
import { env } from "@/lib/env"

const ORCHESTRATOR_API_BASE = "https://api.orchestrator.ai/v1"
const ORCHESTRATOR_REQUEST_COST = 5000 // IDR per request
const ORCHESTRATOR_TIMEOUT_MS = 30000
const ORCHESTRATOR_MODEL = "deepseek/deepseek-v4-flash"

interface OrchestratorGenerateRequest {
  prompt: string
  mode?: "CREATE" | "EXTEND"
  existingFiles?: GeneratedFile[]
  projectContext?: string
}

interface OrchestratorGenerateResponse {
  success: boolean
  files: GeneratedFile[]
  error?: string
  usage?: {
    tokens: number
    cost: number
  }
}

export class OrchestratorProvider {
  private apiKey: string

  constructor() {
    this.apiKey = env.orchestratorApiKey || ""
  }

  static getCost(): number {
    return ORCHESTRATOR_REQUEST_COST
  }

  static getModel(): string {
    return ORCHESTRATOR_MODEL
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  async generate(request: OrchestratorGenerateRequest): Promise<OrchestratorGenerateResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        files: [],
        error: "Orchestrator API key not configured",
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), ORCHESTRATOR_TIMEOUT_MS)

      const response = await fetch(`${ORCHESTRATOR_API_BASE}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          model: ORCHESTRATOR_MODEL,
          mode: request.mode || "CREATE",
          existingFiles: request.existingFiles || [],
          projectContext: request.projectContext,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          files: [],
          error: errorData.error || `Orchestrator API error: ${response.statusText}`,
        }
      }

      const data = await response.json()

      // Validate response structure
      if (!Array.isArray(data.files)) {
        return {
          success: false,
          files: [],
          error: "Invalid response format from Orchestrator API",
        }
      }

      return {
        success: true,
        files: data.files,
        usage: {
          tokens: data.usage?.tokens || 0,
          cost: ORCHESTRATOR_REQUEST_COST,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return {
        success: false,
        files: [],
        error: `Orchestrator API error: ${message}`,
      }
    }
  }
}

export const orchestratorProvider = new OrchestratorProvider()
