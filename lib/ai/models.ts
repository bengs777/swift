import type { ModelOption } from "@/lib/types"

const PROMPT_FEE_IDR = 1000

export type ModelDisplayMeta = Pick<ModelOption, "label" | "description" | "note" | "rank">

const OPENROUTER_MODEL_ALIAS: Record<string, string> = {
  "openrouter/auto": "openrouter/free",
}

const toTitleCase = (value: string) =>
  value
    .split(/[-_.\s]+/g)
    .filter(Boolean)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ")

const normalizeModelKey = (value: string) => {
  const trimmed = value.trim().toLowerCase()
  return OPENROUTER_MODEL_ALIAS[trimmed] || trimmed
}

export const OPENROUTER_FREE_MODEL_OPTIONS: ModelOption[] = [
  {
    key: "qwen/qwen3-coder:free",
    label: "Qwen 3 Coder",
    provider: "openai",
    modelName: "qwen/qwen3-coder:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 1,
    description: "Full stack coding",
    note: "Pilihan terbaik untuk Next.js / React / Tailwind",
  },
  {
    key: "qwen/qwen3.6-plus:free",
    label: "Qwen 3.6 Plus",
    provider: "openai",
    modelName: "qwen/qwen3.6-plus:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 2,
    description: "Project kompleks",
    note: "Repo-level coding, frontend dev, reasoning kuat",
  },
  {
    key: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1",
    provider: "openai",
    modelName: "deepseek/deepseek-r1:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 3,
    description: "Debug / logic",
    note: "Sangat kuat reasoning & bug fixing",
  },
  {
    key: "openrouter/free",
    label: "OpenRouter Auto",
    provider: "openai",
    modelName: "openrouter/free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 4,
    description: "Auto fallback",
    note: "Router otomatis pilih model tersedia",
  },
  {
    key: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B Instruct",
    provider: "openai",
    modelName: "meta-llama/llama-3.3-70b-instruct:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 5,
    description: "Chat umum premium",
    note: "General AI kuat, stabil",
  },
  {
    key: "mistralai/devstral-2512:free",
    label: "Devstral 2512",
    provider: "openai",
    modelName: "mistralai/devstral-2512:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 6,
    description: "Coding agent",
    note: "Cocok multi-file coding workflow",
  },
  {
    key: "google/gemma-3-27b-it:free",
    label: "Gemma 3 27B IT",
    provider: "openai",
    modelName: "google/gemma-3-27b-it:free",
    price: PROMPT_FEE_IDR,
    isActive: true,
    rank: 7,
    description: "Cepat + ringan",
    note: "Bagus untuk chat ringan dan multilingual",
  },
]

const MODEL_LOOKUP = new Map<string, ModelOption>(
  OPENROUTER_FREE_MODEL_OPTIONS.map((model) => [normalizeModelKey(model.key), model])
)

const LEGACY_AGENTROUTER_MODEL_OPTIONS_BASE: ModelOption[] = [
  {
    key: "glm-4.6",
    label: "GLM-4.6",
    provider: "agentrouter",
    modelName: "glm-4.6",
    price: PROMPT_FEE_IDR,
    isActive: true,
  },
  {
    key: "deepseek-v3.2",
    label: "DeepSeek V3.2",
    provider: "agentrouter",
    modelName: "deepseek-v3.2",
    price: PROMPT_FEE_IDR,
    isActive: true,
  },
  {
    key: "deepseek-v3.1",
    label: "DeepSeek V3.1",
    provider: "agentrouter",
    modelName: "deepseek-v3.1",
    price: PROMPT_FEE_IDR,
    isActive: true,
  },
  {
    key: "deepseek-r1-0528",
    label: "DeepSeek R1 0528",
    provider: "agentrouter",
    modelName: "deepseek-r1-0528",
    price: PROMPT_FEE_IDR,
    isActive: true,
  },
  {
    key: "glm-4.5",
    label: "GLM-4.5",
    provider: "agentrouter",
    modelName: "glm-4.5",
    price: PROMPT_FEE_IDR,
    isActive: true,
  },
]

export const DEFAULT_MODEL_OPTIONS: ModelOption[] = OPENROUTER_FREE_MODEL_OPTIONS

export const LEGACY_AGENTROUTER_MODEL_OPTIONS: ModelOption[] = LEGACY_AGENTROUTER_MODEL_OPTIONS_BASE

export const DEFAULT_MODEL_KEY = DEFAULT_MODEL_OPTIONS[0].key

export const OPENROUTER_MODEL_KEYS = OPENROUTER_FREE_MODEL_OPTIONS.map((model) => model.key)

export const isFreeModel = (model: string) => {
  const normalized = normalizeModelKey(model)
  return normalized.endsWith(":free") || normalized === "openrouter/free"
}

export const getModelPrice = (_model: string) => PROMPT_FEE_IDR

export function getModelDisplayMeta(model: string): ModelDisplayMeta {
  const normalized = normalizeModelKey(model)
  const directMatch = MODEL_LOOKUP.get(normalized)

  if (directMatch) {
    return {
      label: directMatch.label,
      description: directMatch.description,
      note: directMatch.note,
      rank: directMatch.rank,
    }
  }

  const cleaned = normalized.replace(/:free\b/gi, "")
  const segments = cleaned.split("/").filter(Boolean)
  const slug = segments.at(-1) || cleaned
  const vendor = segments.length > 1 ? segments[0] : ""
  const slugLabel = toTitleCase(slug)

  if (!vendor) {
    return { label: slugLabel }
  }

  const vendorLabel = toTitleCase(vendor)
  if (slugLabel.toLowerCase().startsWith(vendorLabel.toLowerCase())) {
    return { label: slugLabel }
  }

  return { label: `${vendorLabel} ${slugLabel}`.trim() }
}

export const formatModelLabel = (model: string) => getModelDisplayMeta(model).label
