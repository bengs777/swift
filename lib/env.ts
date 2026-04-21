const getEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]
    if (value && value.trim()) {
      return value
    }
  }

  return ""
}

const getEnvList = (...keys: string[]) => {
  const value = getEnv(...keys)

  if (!value) {
    return []
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const getEnvNumber = (fallback: number, ...keys: string[]) => {
  const value = getEnv(...keys)
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeProvider = (value: string) => {
  const normalized = value.toLowerCase().trim()
  if (normalized === "agentrouter" || normalized === "openai") {
    return normalized
  }
  return ""
}

const normalizeUrl = (url: string) => url.replace(/\/+$/, "")
const normalizeAppUrl = (value: string) => {
  const normalized = normalizeUrl(value)
  if (!normalized) {
    return ""
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  return `https://${normalized}`
}

const OPENAI_DEFAULT_MODEL = getEnv("OPENAI_DEFAULT_MODEL", "OPENAI_FALLBACK_MODEL") || "gpt-4o-mini"
const OPENAI_FALLBACK_MODEL = getEnv("OPENAI_FALLBACK_MODEL") || OPENAI_DEFAULT_MODEL
const databaseUrl =
  process.env.NODE_ENV === "production"
    ? getEnv("TURSO_DATABASE_URL") || getEnv("DATABASE_URL")
    : getEnv("DATABASE_URL") || getEnv("TURSO_DATABASE_URL")

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl,
  nextAuthSecret: getEnv("NEXTAUTH_SECRET"),
  nextAuthUrl: getEnv("NEXTAUTH_URL"),
  googleClientId: getEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
  aiPrimaryProvider: normalizeProvider(getEnv("AI_PRIMARY_PROVIDER")) || "agentrouter",
  aiFallbackProvider: normalizeProvider(getEnv("AI_FALLBACK_PROVIDER")),
  aiTimeoutMs: getEnvNumber(20_000, "AI_TIMEOUT_MS"),
  aiMaxRetries: Math.max(1, Math.round(getEnvNumber(2, "AI_MAX_RETRIES"))),
  providerStatusCacheTtlMs: Math.max(
    60_000,
    Math.round(getEnvNumber(86_400_000, "PROVIDER_STATUS_CACHE_TTL_MS"))
  ),
  agentRouterApiKey: getEnv("AGENT_ROUTER_TOKEN", "AGENTROUTER_API_KEY", "AIBLUESMINDS_API_KEY"),
  agentRouterApiUrl: normalizeUrl(
    getEnv("AGENT_ROUTER_BASE_URL", "AGENTROUTER_BASE_URL", "AGENTROUTER_API_URL", "AIBLUESMINDS_API_URL") || "https://agentrouter.org/v1"
  ),
  agentRouterDefaultModel: getEnv("AGENT_ROUTER_DEFAULT_MODEL", "AGENTROUTER_DEFAULT_MODEL", "AIBLUESMINDS_MODEL"),
  agentRouterModels: getEnvList("AGENT_ROUTER_MODELS", "AGENTROUTER_MODELS", "AIBLUESMINDS_FALLBACK_MODELS"),
  agentRouterFallbackModels: getEnvList("AI_FALLBACK_MODELS", "AGENT_ROUTER_FALLBACK_MODELS", "AGENTROUTER_FALLBACK_MODELS"),
  openAiApiKey: getEnv("OPENAI_API_KEY"),
  openAiApiUrl: getEnv("OPENAI_API_URL") || "https://api.openai.com/v1",
  openAiDefaultModel: OPENAI_DEFAULT_MODEL,
  openAiModels: getEnvList("OPENAI_MODELS", "OPENAI_MODEL_LIST"),
  openAiFallbackModel: OPENAI_FALLBACK_MODEL,
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: getEnv("SUPABASE_ANON_KEY"),
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseBucket: getEnv("SUPABASE_STORAGE_BUCKET"),
  appUrl: normalizeAppUrl(getEnv("NEXT_PUBLIC_APP_URL", "APP_URL", "NEXTAUTH_URL", "VERCEL_URL") || "http://localhost:3000"),
  pakasirSlug: getEnv("PAKASIR_SLUG", "PAKASIR_MERCHANT_ID"),
  pakasirApiKey: getEnv("PAKASIR_API_KEY"),
  vercelAccessToken: getEnv("VERCEL_ACCESS_TOKEN"),
  tursoAuthToken: getEnv("TURSO_AUTH_TOKEN"),
  tursoDatabaseUrl: getEnv("TURSO_DATABASE_URL"),
  // Crypto Payment
  cryptoPaymentPrivateKey: getEnv("CRYPTO_PAYMENT_PRIVATE_KEY"),
  cryptoPaymentAddress: getEnv("NEXT_PUBLIC_CRYPTO_PAYMENT_ADDRESS"),
  bnbChainId: getEnvNumber(56, "NEXT_PUBLIC_BNB_CHAIN_ID"),
  bnbRpcUrl: getEnv("NEXT_PUBLIC_BNB_RPC_URL") || "https://bsc-dataseed.binance.org",
  baseChainId: getEnvNumber(8453, "NEXT_PUBLIC_BASE_CHAIN_ID"),
  baseRpcUrl: getEnv("NEXT_PUBLIC_BASE_RPC_URL") || "https://mainnet.base.org",
  cryptoPaymentMinAmount: getEnv("CRYPTO_PAYMENT_MIN_AMOUNT") || "0.00012",
  cryptoPaymentTimeoutMinutes: getEnvNumber(30, "CRYPTO_PAYMENT_TIMEOUT_MINUTES"),
  cryptoPaymentConfirmationsRequired: getEnvNumber(2, "CRYPTO_PAYMENT_CONFIRMATIONS_REQUIRED"),
}

if (env.nodeEnv === "production") {
  const missing: string[] = []

  if (!env.databaseUrl) missing.push("DATABASE_URL or TURSO_DATABASE_URL")
  if (!env.nextAuthSecret) missing.push("NEXTAUTH_SECRET")
  if (!env.googleClientId) missing.push("GOOGLE_CLIENT_ID")
  if (!env.googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET")

  if (env.aiPrimaryProvider === "agentrouter" && !env.agentRouterApiKey) {
    missing.push("AGENT_ROUTER_TOKEN")
  }

  if (env.aiPrimaryProvider === "openai" && !env.openAiApiKey) {
    missing.push("OPENAI_API_KEY")
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }
}

export { getEnv, getEnvList }
