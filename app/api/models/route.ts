import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ModelConfigService } from "@/lib/services/model-config.service"
import { env } from "@/lib/env"
import { formatModelLabel, getModelDisplayMeta } from "@/lib/ai/models"
import { v0Provider } from "@/lib/ai/providers/v0-provider"
import { orchestratorProvider } from "@/lib/ai/providers/orchestrator-provider"

export async function GET() {
  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const models = await ModelConfigService.getActiveModels()

  const availableModels = models.filter((model) => {
    if (model.provider === "agentrouter") {
      return Boolean(env.agentRouterApiKey) || (env.aiFallbackProvider === "openai" && Boolean(env.openAiApiKey))
    }

    if (model.provider === "openai") {
      return Boolean(env.openAiApiKey)
    }
    
    if (model.provider === "v0") {
      return v0Provider.isConfigured()
    }
    
    if (model.provider === "orchestrator") {
      return orchestratorProvider.isConfigured()
    }

    return false
  }).sort((left, right) => {
    const leftRank = getModelDisplayMeta(left.modelName || left.key).rank ?? Number.POSITIVE_INFINITY
    const rightRank = getModelDisplayMeta(right.modelName || right.key).rank ?? Number.POSITIVE_INFINITY
    return leftRank - rightRank
  })

  // Add V0 model if configured
  const v0Models = v0Provider.isConfigured() ? [{
    key: "v0-web-generator",
    provider: "v0",
    modelName: "v0-web-generator",
    active: true,
    label: "V0 Web Generator (5000/req)",
    cost: 5000,
    costUnit: "IDR",
  }] : []

  // Add Orchestrator model if configured
  const orchestratorModels = orchestratorProvider.isConfigured() ? [{
    key: "orchestrator-deepseek",
    provider: "orchestrator",
    modelName: "deepseek/deepseek-v4-flash",
    active: true,
    label: "Orchestrator - Deepseek V4 Flash (5000/req)",
    cost: 5000,
    costUnit: "IDR",
  }] : []

  return NextResponse.json({
    models: [
      ...availableModels.map((model) => ({
        ...model,
        ...getModelDisplayMeta(model.modelName || model.key),
        label:
          model.key === "openai-fallback"
            ? `${env.openAiApiUrl.includes("openrouter.ai") ? "OpenRouter" : "OpenAI"} Fallback (${formatModelLabel(model.modelName)})`
            : formatModelLabel(model.modelName || model.key),
      })),
      ...v0Models,
      ...orchestratorModels,
    ],
  })
}
