import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ModelConfigService } from "@/lib/services/model-config.service"
import { env } from "@/lib/env"
import { formatModelLabel, getModelDisplayMeta } from "@/lib/ai/models"

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

    return false
  }).sort((left, right) => {
    const leftRank = getModelDisplayMeta(left.modelName || left.key).rank ?? Number.POSITIVE_INFINITY
    const rightRank = getModelDisplayMeta(right.modelName || right.key).rank ?? Number.POSITIVE_INFINITY
    return leftRank - rightRank
  })

  return NextResponse.json({
    models: availableModels.map((model) => ({
      ...model,
      ...getModelDisplayMeta(model.modelName || model.key),
      label:
        model.key === "openai-fallback"
          ? `${env.openAiApiUrl.includes("openrouter.ai") ? "OpenRouter" : "OpenAI"} Fallback (${formatModelLabel(model.modelName)})`
          : formatModelLabel(model.modelName || model.key),
    })),
  })
}
