import { env } from "@/lib/env"
import type { ModelOption } from "@/lib/types"
import {
  DEFAULT_MODEL_OPTIONS,
  LEGACY_AGENTROUTER_MODEL_OPTIONS,
  OPENROUTER_MODEL_KEYS,
  formatModelLabel,
  getModelDisplayMeta,
  getModelPrice,
  isFreeModel,
} from "@/lib/ai/models"

const OPENAI_FALLBACK_KEY = "openai-fallback"

const dedupeList = (items: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) {
      continue
    }
    const key = trimmed.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

const ensureDefaultFirst = (models: string[], defaultModel?: string) => {
  if (!defaultModel) {
    return models
  }
  const normalized = defaultModel.trim()
  if (!normalized) {
    return models
  }
  const existingIndex = models.findIndex((model) => model === normalized)
  if (existingIndex === -1) {
    return [normalized, ...models]
  }
  if (existingIndex === 0) {
    return models
  }
  return [normalized, ...models.filter((model) => model !== normalized)]
}

const buildModelOption = (model: string, provider: ModelOption["provider"]): ModelOption => {
  const displayMeta = getModelDisplayMeta(model)

  return {
    key: model,
    label: displayMeta.label,
    provider,
    modelName: model,
    price: getModelPrice(model),
    isActive: true,
    rank: displayMeta.rank,
    description: displayMeta.description,
    note: displayMeta.note,
  }
}

export function getRuntimeModelOptions(): ModelOption[] {
  const agentRouterCombined = dedupeList([...env.agentRouterModels, ...env.agentRouterFallbackModels])

  const agentRouterOptions: ModelOption[] =
    agentRouterCombined.length === 0
      ? LEGACY_AGENTROUTER_MODEL_OPTIONS
      : ensureDefaultFirst(agentRouterCombined, env.agentRouterDefaultModel).map((model) =>
          buildModelOption(model, "agentrouter")
        )

  const openAiDefaultModel =
    OPENROUTER_MODEL_KEYS.includes(env.openAiDefaultModel.trim())
      ? env.openAiDefaultModel.trim()
      : DEFAULT_MODEL_OPTIONS[0].key

  const openAiCombined = env.openAiApiUrl.includes("openrouter.ai")
    ? ensureDefaultFirst([...OPENROUTER_MODEL_KEYS], openAiDefaultModel)
    : dedupeList([
        env.openAiDefaultModel,
        ...env.openAiModels,
        env.openAiFallbackModel,
      ]).filter((model) => isFreeModel(model))

  const openAiOptions: ModelOption[] = ensureDefaultFirst(
    openAiCombined,
    openAiDefaultModel
  ).map((model) => buildModelOption(model, "openai"))

  const options: ModelOption[] =
    env.aiPrimaryProvider === "openai"
      ? (openAiOptions.length > 0 ? openAiOptions : DEFAULT_MODEL_OPTIONS)
      : (agentRouterOptions.length > 0 ? agentRouterOptions : LEGACY_AGENTROUTER_MODEL_OPTIONS)

  const fallbackModel = isFreeModel(env.openAiFallbackModel) ? env.openAiFallbackModel.trim() : ""
  if (
    env.aiPrimaryProvider !== "openai" &&
    env.aiFallbackProvider === "openai" &&
    fallbackModel
  ) {
    options.push({
      ...getModelDisplayMeta(fallbackModel),
      key: OPENAI_FALLBACK_KEY,
      label: `${env.openAiApiUrl.includes("openrouter.ai") ? "OpenRouter" : "OpenAI"} Fallback (${formatModelLabel(fallbackModel)})`,
      provider: "openai",
      modelName: fallbackModel,
      price: getModelPrice(fallbackModel),
      isActive: true,
    })
  }

  return options
}
