type PromptDraft = {
  projectName: string
  productType: string
  coreGoal: string
  pages: string[]
  features: string[]
  apiRoutes: string[]
  dataModels: string[]
  uiStyle: string[]
  assumptions: string[]
}

export type PromptEnhancementResult = {
  prompt: string
  summary: string
  sourcesUsed: string[]
  usedEnhancement: boolean
}

const MAX_ITEMS_PER_SECTION = 5

export async function enhancePromptWithAgentRouter({
  prompt,
  modelName,
}: {
  prompt: string
  modelName: string
}): Promise<PromptEnhancementResult> {
  void modelName
  const draft = buildLocalPromptDraft(prompt)
  return {
    prompt: serializeDraft(prompt, draft),
    summary: draft.coreGoal || draft.productType || inferFallbackSummary(prompt),
    sourcesUsed: ["local-heuristic"],
    usedEnhancement: true,
  }
}

function buildLocalPromptDraft(prompt: string): PromptDraft {
  const compactPrompt = inlineText(prompt)
  const normalized = compactPrompt.toLowerCase()

  const looksLikeWorkspace =
    normalized.includes("workspace") ||
    normalized.includes("replit") ||
    normalized.includes("lovable") ||
    normalized.includes("file explorer") ||
    normalized.includes("live preview") ||
    normalized.includes("terminal") ||
    normalized.includes("code editor") ||
    normalized.includes("output panel")

  const looksLikeDashboard = normalized.includes("dashboard")
  const looksLikeAuth = normalized.includes("login") || normalized.includes("sign in") || normalized.includes("auth")
  const looksLikeLanding = normalized.includes("landing") || normalized.includes("hero") || normalized.includes("marketing")
  const looksLikeStore = normalized.includes("shop") || normalized.includes("ecommerce") || normalized.includes("store")
  const looksLikeBlog = normalized.includes("blog") || normalized.includes("article") || normalized.includes("content")

  const projectName = inferProjectName(compactPrompt)
  const productType =
    looksLikeWorkspace
      ? "developer workspace"
      : looksLikeDashboard
      ? "dashboard web app"
      : looksLikeAuth
        ? "authentication-focused web app"
        : looksLikeLanding
          ? "marketing landing page"
          : looksLikeStore
            ? "e-commerce storefront"
            : looksLikeBlog
              ? "content website"
              : "full-stack web app"

  const pages = dedupeItems([
    looksLikeWorkspace ? "Explorer" : "Homepage",
    looksLikeWorkspace ? "Editor" : "",
    looksLikeWorkspace ? "Preview" : "",
    looksLikeWorkspace ? "Terminal" : "",
    looksLikeWorkspace ? "History" : "",
    looksLikeAuth ? "Login page" : "",
    looksLikeDashboard ? "Dashboard page" : "",
    looksLikeStore ? "Product listing page" : "",
    looksLikeBlog ? "Content detail page" : "",
  ])

  const features = dedupeItems([
    looksLikeWorkspace ? "File explorer, editor, preview, and output panels" : looksLikeAuth ? "Form validation and auth-ready UI" : "Responsive layout and polished UI",
    looksLikeWorkspace ? "Patch-first iteration and clear file state" : "",
    looksLikeWorkspace ? "Keyboard-first command bar and quick actions" : "",
    looksLikeWorkspace ? "Share link and version history hooks" : "",
    looksLikeDashboard ? "Data cards, tables, and activity sections" : "",
    looksLikeStore ? "Product cards and call-to-action sections" : "",
    looksLikeBlog ? "Content list and readable article layout" : "",
    "Reusable components and clean state handling",
  ])

  const apiRoutes = dedupeItems([
    looksLikeWorkspace ? "/api/projects/[id]/run" : "/api/health",
    looksLikeWorkspace ? "/api/projects/[id]/share" : "",
    looksLikeWorkspace ? "/api/projects/[id]/history" : "",
    looksLikeWorkspace ? "/api/projects/[id]/files" : "",
    looksLikeAuth ? "/api/auth/login" : "",
    looksLikeDashboard ? "/api/dashboard/summary" : "",
    looksLikeStore ? "/api/products" : "",
    looksLikeBlog ? "/api/posts" : "",
  ])

  const dataModels = dedupeItems([
    looksLikeWorkspace ? "ProjectFile" : looksLikeAuth ? "User" : "",
    looksLikeWorkspace ? "RunSession" : "",
    looksLikeWorkspace ? "ShareLink" : "",
    looksLikeWorkspace ? "GenerationHistory" : "",
    looksLikeDashboard ? "DashboardMetric" : "",
    looksLikeStore ? "Product" : "",
    looksLikeBlog ? "Post" : "",
  ])

  const uiStyle = dedupeItems([
    looksLikeWorkspace ? "IDE-like split panes and dense hierarchy" : "Modern and production-ready",
    looksLikeWorkspace ? "Fast feedback loop with visible status and logs" : "Responsive spacing and clear hierarchy",
    looksLikeWorkspace ? "Opinionated, tasteful default layout" : "Dark dashboard aesthetic",
  ])

  const assumptions = dedupeItems([
    compactPrompt.length < 12 ? "User request is brief, so sensible starter defaults are applied." : "",
    "Use Next.js app router with lightweight server endpoints.",
    looksLikeWorkspace ? "Prefer patch-first iteration over full regeneration when a project already exists." : "Keep scope practical for a starter project.",
    looksLikeWorkspace ? "Keep preview as a feedback loop and expose runtime errors clearly." : "",
  ])

  return {
    projectName,
    productType,
    coreGoal: compactPrompt || (looksLikeWorkspace ? "Build a Lovable-style developer workspace starter." : "Build a polished web app starter."),
    pages,
    features,
    apiRoutes,
    dataModels,
    uiStyle,
    assumptions,
  }
}

function serializeDraft(originalPrompt: string, draft: PromptDraft) {
  const sections = [
    `Original user request: "${inlineText(originalPrompt)}"`,
    draft.projectName ? `Project name: ${draft.projectName}` : "",
    draft.productType ? `Product type: ${draft.productType}` : "",
    draft.coreGoal ? `Primary goal: ${draft.coreGoal}` : "",
    formatSection("Pages or screens", draft.pages),
    formatSection("Core features", draft.features),
    formatSection("Suggested API routes", draft.apiRoutes),
    formatSection("Suggested data models", draft.dataModels),
    formatSection("UI direction", draft.uiStyle),
    formatSection("Assumptions", draft.assumptions),
    "Implementation requirement: generate a practical, opinionated, production-ready Next.js starter with patch-first iteration. If an existing project is present, update files in place before adding new ones. Keep the preview fast, preserve working structure, and expose runtime feedback clearly.",
  ].filter(Boolean)

  return sections.join("\n\n")
}

function formatSection(title: string, items: string[]) {
  if (items.length === 0) {
    return ""
  }

  return `${title}:\n- ${items.slice(0, MAX_ITEMS_PER_SECTION).join("\n- ")}`
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  return value.replace(/\s+/g, " ").trim()
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
}

function dedupeItems(items: string[]) {
  return items.filter(Boolean).filter((item, index, list) => list.indexOf(item) === index)
}

function inferProjectName(prompt: string) {
  const cleaned = prompt
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .trim()

  if (!cleaned) {
    return "Starter Project"
  }

  return cleaned
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function inlineText(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/"/g, "'")
}

function inferFallbackSummary(prompt: string) {
  const compactPrompt = inlineText(prompt)
  if (!compactPrompt) {
    return "Build a polished web app starter."
  }

  if (compactPrompt.length <= 60) {
    return `Build a polished web app starter inspired by "${compactPrompt}".`
  }

  return compactPrompt
}

function buildFallbackEnhancement(prompt: string): PromptEnhancementResult {
  return {
    prompt,
    summary: inferFallbackSummary(prompt),
    sourcesUsed: [],
    usedEnhancement: false,
  }
}
