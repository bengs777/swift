"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, Send, Paperclip, Image as ImageIcon, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Message } from "@/app/dashboard/project/[id]/page"
import type { ProviderStatus } from "@/app/dashboard/project/[id]/page"
import type { ModelOption, PromptAttachment } from "@/lib/types"
import { analyzePromptIntent } from "@/lib/ai/prompt-intent"
import { getTemplate, PROMPT_LANGUAGE_LABELS } from "@/lib/ai/prompt-templates"
import type { PromptLanguage, PromptTemplateKey, TemplateVariant } from "@/lib/ai/prompt-templates"

const MAX_PROMPT_LENGTH = 12000
const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024
const MAX_TEXT_FILE_CHARS = 18000
const MAX_IMAGE_DATA_URL_CHARS = 18000
const sanitizeModelDisplayName = (value: string) =>
  value.replace(/:free\b/gi, "").trim()

interface ChatPanelProps {
  projectId: string
  messages: Message[]
  onSendMessage: (
    content: string,
    selectedModel: string,
    attachments: PromptAttachment[],
    promptLanguage?: PromptLanguage
  ) => void
  isGenerating: boolean
  modelOptions: ModelOption[]
  selectedModel: string
  onModelChange: (model: string) => void
  onViewCode?: () => void
  providerStatus?: ProviderStatus | null
}

type EstimateState = {
  isLoading: boolean
  estimatedTokens?: number
  estimatedCost?: number
  canAfford?: boolean
  remainingBalance?: number
  currentBalance?: number
  error?: string
}

type PromptExample = {
  label: string
  title: string
  prompt: string
  variant: TemplateVariant
}

type PromptPanelCopy = {
  languageLabel: string
  languageDescription: string
  templateOptions: Record<PromptTemplateKey, string>
  variantOptions: Record<TemplateVariant, string>
  useTemplate: string
  readyBadge: string
  examplesTitle: string
  examplesDescription: string
  promptPlaceholder: string
  promptHint: string
  charactersLabel: string
  emptyTitle: string
  emptyDescription: string
  emptySuggestions: string[]
}


const PROMPT_PANEL_COPY: Record<PromptLanguage, PromptPanelCopy> = {
  id: {
    languageLabel: "Mode bahasa prompt & jawaban",
    languageDescription: "Pilih Indonesia atau English untuk template, contoh, saran prompt, dan jawaban AI.",
    templateOptions: {
      landing: "Landing page",
      auth: "Alur auth",
      dashboard: "Dashboard",
      workspace: "Workspace builder",
    },
    variantOptions: {
      short: "Pendek",
      medium: "Sedang",
      extended: "Panjang",
    },
    useTemplate: "Gunakan template",
    readyBadge: "Siap dipakai",
    examplesTitle: "Contoh prompt terbaik",
    examplesDescription: "Klik salah satu contoh untuk mengisi prompt yang lebih jelas dan efisien.",
    promptPlaceholder: "Jelaskan app, workspace, atau perubahan yang ingin dibuat...",
    promptHint: "Tekan Enter untuk mengirim, Shift+Enter untuk baris baru. Unggah gambar/file untuk dijadikan konteks prompt.",
    charactersLabel: "karakter",
    emptyTitle: "Mulai membangun",
    emptyDescription: "Kalau ingin bikin web atau workspace seperti Lovable, jelaskan tujuan, halaman, fitur, dan gaya UI yang kamu mau.",
    emptySuggestions: [
      "Buat workspace builder mirip Lovable",
      "Buat form login dengan validasi",
      "Buat dashboard dengan chart",
    ],
  },
  en: {
    languageLabel: "Prompt & reply language",
    languageDescription: "Choose Indonesian or English for templates, examples, prompt suggestions, and AI replies.",
    templateOptions: {
      landing: "Landing page",
      auth: "Auth flow",
      dashboard: "Dashboard",
      workspace: "Workspace builder",
    },
    variantOptions: {
      short: "Short",
      medium: "Medium",
      extended: "Extended",
    },
    useTemplate: "Use template",
    readyBadge: "Ready to use",
    examplesTitle: "Best prompt examples",
    examplesDescription: "Click an example to fill the prompt with a clearer and more focused brief.",
    promptPlaceholder: "Describe the app, workspace, or change you want to build...",
    promptHint: "Press Enter to send, Shift+Enter for new line. Upload images/files to use as prompt context.",
    charactersLabel: "characters",
    emptyTitle: "Start building",
    emptyDescription: "If you want a Lovable-style web app or workspace, describe the goal, screens, features, and UI direction.",
    emptySuggestions: [
      "Build a Lovable-like workspace builder",
      "Build a login form with validation",
      "Make a dashboard with charts",
    ],
  },
}

const PROMPT_EXAMPLES: Record<PromptLanguage, Record<PromptTemplateKey, PromptExample[]>> = {
  id: {
    landing: [
      {
        label: "SaaS",
        title: "Landing page SaaS modern",
        prompt:
          "Buat landing page SaaS AI untuk tim kecil. Wajib ada hero singkat, 3 benefit cards, pricing, testimonial, FAQ, dan CTA demo. Desain clean, modern, mobile-first.",
        variant: "extended",
      },
      {
        label: "Produk",
        title: "Landing page produk",
        prompt:
          "Buat landing page produk skincare dengan hero, before-after, ingredients, review pelanggan, dan CTA beli sekarang. Pakai tone premium dan warna lembut.",
        variant: "medium",
      },
      {
        label: "Event",
        title: "Landing page webinar",
        prompt:
          "Buat landing page webinar dengan countdown, agenda acara, speaker section, form registrasi, dan CTA daftar. Fokus ke conversion dan responsif.",
        variant: "short",
      },
    ],
    auth: [
      {
        label: "Login",
        title: "Auth flow lengkap",
        prompt:
          "Buat halaman login, register, forgot password, validasi form, dan session handling untuk aplikasi web. Tampilan modern dan mobile-friendly.",
        variant: "extended",
      },
      {
        label: "OAuth",
        title: "Auth dengan Google",
        prompt:
          "Buat sistem auth dengan login email/password dan tombol Google OAuth. Sertakan halaman sign in, sign up, serta route stub yang aman.",
        variant: "medium",
      },
      {
        label: "Reset",
        title: "Reset password",
        prompt:
          "Buat flow reset password yang ringkas: request reset, kirim email, set password baru, dan validasi input. Gunakan Next.js App Router.",
        variant: "short",
      },
    ],
    dashboard: [
      {
        label: "Admin",
        title: "Dashboard admin",
        prompt:
          "Buat dashboard admin dengan sidebar, KPI cards, chart revenue, tabel transaksi, dan filter tanggal. Layout harus rapi dan responsif.",
        variant: "extended",
      },
      {
        label: "Analytics",
        title: "Dashboard analytics",
        prompt:
          "Buat dashboard analytics untuk SaaS dengan ringkasan KPI, chart tren, recent activity, dan halaman detail project. Gunakan komponen reusable.",
        variant: "medium",
      },
      {
        label: "Project",
        title: "Dashboard project",
        prompt:
          "Buat dashboard project dengan overview, list project, status card, dan halaman detail project. Sertakan state empty dan loading.",
        variant: "short",
      },
    ],
    workspace: [
      {
        label: "Lovable",
        title: "Workspace builder seperti Lovable",
        prompt:
          "Buat workspace builder seperti Lovable atau Replit dengan file explorer, editor kode, live preview, terminal/output panel, share link, dan version history. Layout harus terasa seperti IDE yang modern, cepat, dan patch-first.",
        variant: "extended",
      },
      {
        label: "App builder",
        title: "AI app builder workspace",
        prompt:
          "Buat workspace AI app builder untuk web app Next.js. Wajib ada sidebar explorer, editor file, preview, panel error/log, dan command bar. Fokus ke alur edit, preview, perbaiki, lalu simpan.",
        variant: "medium",
      },
      {
        label: "IDE",
        title: "IDE ringan untuk project web",
        prompt:
          "Buat IDE ringan untuk project web dengan file tree, code editor, preview, dan area output. Tambahkan state kosong yang jelas, aksi cepat, dan layout split pane yang nyaman.",
        variant: "short",
      },
    ],
  },
  en: {
    landing: [
      {
        label: "SaaS",
        title: "Modern SaaS landing page",
        prompt:
          "Build an AI SaaS landing page for a small team. Include a short hero, 3 benefit cards, pricing, testimonials, FAQ, and a demo CTA. Keep the design clean, modern, and mobile-first.",
        variant: "extended",
      },
      {
        label: "Product",
        title: "Product landing page",
        prompt:
          "Build a skincare product landing page with a hero, before-and-after section, ingredients, customer reviews, and a buy-now CTA. Use a premium tone and soft colors.",
        variant: "medium",
      },
      {
        label: "Event",
        title: "Webinar landing page",
        prompt:
          "Build a webinar landing page with a countdown, agenda, speaker section, registration form, and sign-up CTA. Focus on conversion and responsiveness.",
        variant: "short",
      },
    ],
    auth: [
      {
        label: "Login",
        title: "Complete auth flow",
        prompt:
          "Build login, register, forgot password, form validation, and session handling pages for a web app. Keep the UI modern and mobile-friendly.",
        variant: "extended",
      },
      {
        label: "OAuth",
        title: "Auth with Google",
        prompt:
          "Build an auth system with email/password login and a Google OAuth button. Include sign in, sign up, and safe route stubs.",
        variant: "medium",
      },
      {
        label: "Reset",
        title: "Password reset",
        prompt:
          "Build a compact password reset flow: request reset, email delivery, new password form, and input validation. Use Next.js App Router.",
        variant: "short",
      },
    ],
    dashboard: [
      {
        label: "Admin",
        title: "Admin dashboard",
        prompt:
          "Build an admin dashboard with a sidebar, KPI cards, revenue charts, transaction table, and date filters. Keep the layout clean and responsive.",
        variant: "extended",
      },
      {
        label: "Analytics",
        title: "Analytics dashboard",
        prompt:
          "Build a SaaS analytics dashboard with KPI summaries, trend charts, recent activity, and a project detail page. Use reusable components.",
        variant: "medium",
      },
      {
        label: "Project",
        title: "Project dashboard",
        prompt:
          "Build a project dashboard with an overview, project list, status cards, and a project detail page. Include empty and loading states.",
        variant: "short",
      },
    ],
    workspace: [
      {
        label: "Lovable",
        title: "Lovable-style workspace builder",
        prompt:
          "Build a Lovable or Replit-style workspace builder with a file explorer, code editor, live preview, terminal/output panel, share link, and version history. The layout should feel like a modern IDE that is fast and patch-first.",
        variant: "extended",
      },
      {
        label: "App builder",
        title: "AI app builder workspace",
        prompt:
          "Build an AI app builder workspace for a Next.js web app. Include a sidebar explorer, file editor, preview, error/log panel, and a command bar. Focus on edit, preview, fix, and save.",
        variant: "medium",
      },
      {
        label: "IDE",
        title: "Lightweight web IDE",
        prompt:
          "Build a lightweight web IDE with a file tree, code editor, preview, and output area. Add clear empty states, quick actions, and a comfortable split-pane layout.",
        variant: "short",
      },
    ],
  },
}

function getPromptExamples(templateKey: PromptTemplateKey, language: PromptLanguage) {
  return PROMPT_EXAMPLES[language][templateKey]
}

export function ChatPanel({
  projectId,
  messages,
  onSendMessage,
  isGenerating,
  modelOptions,
  selectedModel,
  onModelChange,
  onViewCode,
  providerStatus,
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [templateKey, setTemplateKey] = useState<PromptTemplateKey>("workspace")
  const [templateVariant, setTemplateVariant] = useState<TemplateVariant>("short")
  const [promptLanguage, setPromptLanguage] = useState<PromptLanguage>("id")
  const [estimate, setEstimate] = useState<EstimateState>({ isLoading: false })
  const [attachments, setAttachments] = useState<PromptAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isReadingFiles, setIsReadingFiles] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedModelInfo = modelOptions.find((model) => model.key === selectedModel)
  const promptCopy = PROMPT_PANEL_COPY[promptLanguage]
  const promptIntent = analyzePromptIntent(input, promptLanguage)
  const promptExamples = getPromptExamples(templateKey, promptLanguage)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  const readAttachment = async (file: File): Promise<PromptAttachment> => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const mimeType = file.type || "application/octet-stream"
    const name = file.name || "attachment"

    if (mimeType.startsWith("image/")) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error(`Gagal membaca gambar "${name}".`))
        reader.readAsDataURL(file)
      })

      return {
        id,
        name,
        mimeType,
        size: file.size,
        kind: "image",
        content: dataUrl.slice(0, MAX_IMAGE_DATA_URL_CHARS),
      }
    }

    const textContent = await file.text()

    return {
      id,
      name,
      mimeType,
      size: file.size,
      kind: "text",
      content: textContent.slice(0, MAX_TEXT_FILE_CHARS),
    }
  }

  const handleChooseFiles = () => {
    if (isGenerating || isReadingFiles) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""

    if (files.length === 0) return

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length)
    if (availableSlots === 0) {
      setAttachmentError(`Maksimal ${MAX_ATTACHMENTS} lampiran per prompt.`)
      return
    }

    const filesToRead = files.slice(0, availableSlots)
    const oversized = filesToRead.find((file) => file.size > MAX_FILE_SIZE_BYTES)
    if (oversized) {
      setAttachmentError(`File "${oversized.name}" melebihi batas ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`)
      return
    }

    try {
      setIsReadingFiles(true)
      setAttachmentError(null)
      const parsed = await Promise.all(filesToRead.map((file) => readAttachment(file)))
      setAttachments((current) => [...current, ...parsed])
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Gagal memproses lampiran.")
    } finally {
      setIsReadingFiles(false)
    }
  }

  const handleSubmit = () => {
    if (!input.trim() || !selectedModel || isGenerating || isReadingFiles || input.length > MAX_PROMPT_LENGTH) return
    onSendMessage(input.trim(), selectedModel, attachments, promptLanguage)
    setInput("")
    setAttachments([])
    setAttachmentError(null)
  }

  const handleApplyTemplate = () => {
    setInput(getTemplate(templateKey, templateVariant, promptLanguage))
  }

  const handleApplyPromptExample = (example: PromptExample) => {
    setTemplateVariant(example.variant)
    setInput(example.prompt)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  useEffect(() => {
    const prompt = input.trim()

    if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
      setEstimate({ isLoading: false })
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setEstimate((prev) => ({
        ...prev,
        isLoading: true,
        error: undefined,
      }))

      try {
        const response = await fetch("/api/generate/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            attachments,
            selectedModel,
            projectId,
          }),
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to estimate request")
        }

        setEstimate({
          isLoading: false,
          estimatedTokens: payload?.estimatedTokens,
          estimatedCost: payload?.estimatedCost,
          canAfford: payload?.canAfford,
          remainingBalance: payload?.remainingBalance,
          currentBalance: payload?.currentBalance,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setEstimate({
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to estimate request",
        })
      }
    }, 320)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [attachments, input, selectedModel, projectId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-background">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="min-h-0 flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState
            promptLanguage={promptLanguage}
            onSuggestionSelect={setInput}
            onTemplateSelect={(key) => {
              setTemplateKey(key)
              setTemplateVariant("short")
              setInput(getTemplate(key, "short", promptLanguage))
            }}
          />
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onViewCode={onViewCode} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
          <ProviderHealthCard status={providerStatus} />
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{promptCopy.languageLabel}</p>
                <p className="text-xs text-muted-foreground">{promptCopy.languageDescription}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={promptLanguage === "id" ? "default" : "ghost"}
                  className="h-8 px-3"
                  onClick={() => setPromptLanguage("id")}
                >
                  {PROMPT_LANGUAGE_LABELS.id}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={promptLanguage === "en" ? "default" : "ghost"}
                  className="h-8 px-3"
                  onClick={() => setPromptLanguage("en")}
                >
                  {PROMPT_LANGUAGE_LABELS.en}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Select
              value={templateKey}
              onValueChange={(value) => setTemplateKey(value as PromptTemplateKey)}
              disabled={isGenerating}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">{promptCopy.templateOptions.workspace}</SelectItem>
                <SelectItem value="landing">{promptCopy.templateOptions.landing}</SelectItem>
                <SelectItem value="auth">{promptCopy.templateOptions.auth}</SelectItem>
                <SelectItem value="dashboard">{promptCopy.templateOptions.dashboard}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={templateVariant}
              onValueChange={(value) => setTemplateVariant(value as TemplateVariant)}
              disabled={isGenerating}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">{promptCopy.variantOptions.short}</SelectItem>
                <SelectItem value="medium">{promptCopy.variantOptions.medium}</SelectItem>
                <SelectItem value="extended">{promptCopy.variantOptions.extended}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="h-9" onClick={handleApplyTemplate} disabled={isGenerating}>
              {promptCopy.useTemplate}
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{promptCopy.examplesTitle}</p>
                <p className="text-xs text-muted-foreground">{promptCopy.examplesDescription}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                {promptCopy.readyBadge}
              </span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {promptExamples.map((example) => (
                <button
                  key={example.title}
                  type="button"
                  onClick={() => handleApplyPromptExample(example)}
                  disabled={isGenerating}
                  className={cn(
                    "rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-foreground/20 hover:bg-card",
                    isGenerating && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {example.label}
                  </span>
                  <p className="mt-2 text-sm font-medium text-foreground">{example.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {example.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={promptCopy.promptPlaceholder}
            className="min-h-[80px] resize-none"
            disabled={isGenerating}
          />
          {input.trim() && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                promptIntent.mode === "chat"
                  ? "border-sky-500/30 bg-sky-500/10"
                  : promptIntent.needsClarification
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{promptIntent.label}</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {promptIntent.mode === "chat"
                    ? "Chat"
                    : promptIntent.needsClarification
                      ? "Clarify"
                      : "Build"}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{promptIntent.summary}</p>
              <p className="mt-2 text-muted-foreground">{promptIntent.nextStep}</p>
              <p className="mt-2 font-medium text-foreground">{promptIntent.example}</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.html,.css,.prisma,.env"
            onChange={handleFileChange}
            disabled={isGenerating || isReadingFiles}
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                >
                  {attachment.kind === "image" ? "Image" : "File"}: {attachment.name}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeAttachment(attachment.id)}
                    disabled={isGenerating || isReadingFiles}
                    aria-label={`Remove ${attachment.name}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          {attachmentError && (
            <p className="text-xs text-destructive">{attachmentError}</p>
          )}
          {input.trim() && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                estimate.error
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  : estimate.canAfford === false
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                    : "border-border bg-card/70 text-muted-foreground"
              )}
            >
              {estimate.isLoading ? (
                <p>Estimating request cost...</p>
              ) : estimate.error ? (
                <p>
                  Estimation unavailable ({estimate.error}). Flat model price: Rp {(
                    selectedModelInfo?.price || 0
                  ).toLocaleString("id-ID")}.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span>Est. tokens: {(estimate.estimatedTokens || 0).toLocaleString("id-ID")}</span>
                  <span>Est. cost: Rp {(estimate.estimatedCost || selectedModelInfo?.price || 0).toLocaleString("id-ID")}</span>
                  {typeof estimate.currentBalance === "number" && (
                    <span>Balance: Rp {estimate.currentBalance.toLocaleString("id-ID")}</span>
                  )}
                  {typeof estimate.remainingBalance === "number" && (
                    <span>After request: Rp {estimate.remainingBalance.toLocaleString("id-ID")}</span>
                  )}
                  {estimate.canAfford === false && (
                    <span className="font-medium">Insufficient balance for this request.</span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={isGenerating || isReadingFiles || attachments.length >= MAX_ATTACHMENTS}
              onClick={handleChooseFiles}
              title="Upload file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={isGenerating || isReadingFiles || attachments.length >= MAX_ATTACHMENTS}
              onClick={handleChooseFiles}
              title="Upload image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Select value={selectedModel} onValueChange={onModelChange} disabled={isGenerating}>
              <SelectTrigger className="h-9 min-w-[220px]">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model.key} value={model.key}>
                    {sanitizeModelDisplayName(model.label)} (Rp {model.price.toLocaleString("id-ID")}/request)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProviderStatusBadge status={providerStatus} />
            <Button
              size="icon"
              className="ml-auto h-9 w-9 shrink-0"
              onClick={handleSubmit}
              disabled={!input.trim() || !selectedModel || isGenerating || isReadingFiles}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {promptCopy.promptHint}
        </p>
        <p className={cn(
          "mt-1 text-xs",
          input.length > MAX_PROMPT_LENGTH ? "text-destructive" : "text-muted-foreground"
        )}>
          {input.length.toLocaleString("id-ID")} / {MAX_PROMPT_LENGTH.toLocaleString("id-ID")} {promptCopy.charactersLabel}
        </p>
      </div>
    </div>
  )
}

function ProviderStatusBadge({ status }: { status?: ProviderStatus | null }) {
  if (!status) {
    return (
      <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
        idle
      </span>
    )
  }

  const statusConfig =
    status.issue === "healthy"
      ? {
          label: "connected",
          className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        }
      : status.issue === "latency" || status.status === "slow"
        ? {
          label: "slow",
          className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
        }
      : status.issue === "auth"
        ? {
            label: "auth",
            className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
          }
        : status.issue === "quota"
          ? {
              label: "quota",
              className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
            }
          : status.issue === "config"
            ? {
                label: "config",
                className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
              }
        : {
            label: "error",
            className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
          }

  return (
    <span
      title={status.reason || "Provider status"}
      className={cn(
        "rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-wide",
        statusConfig.className
      )}
    >
      {statusConfig.label}
    </span>
  )
}

function ProviderHealthCard({
  status,
}: {
  status?: ProviderStatus | null
}) {
  if (!status) {
    return (
      <div className="rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        Status provider akan muncul setelah request generate dijalankan.
      </div>
    )
  }

  const config =
    status.issue === "healthy"
      ? {
          title: "Provider siap dipakai",
          className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
        }
      : status.issue === "latency"
        ? {
            title: "Provider hidup tapi lambat",
            className: "border-amber-500/30 bg-amber-500/10 text-amber-100",
          }
        : status.issue === "auth"
          ? {
              title: "Masalah auth atau akses model",
              className: "border-rose-500/30 bg-rose-500/10 text-rose-100",
            }
          : status.issue === "quota"
            ? {
                title: "Kuota provider habis",
                className: "border-rose-500/30 bg-rose-500/10 text-rose-100",
              }
            : status.issue === "config"
              ? {
                  title: "Konfigurasi provider belum lengkap",
                  className: "border-rose-500/30 bg-rose-500/10 text-rose-100",
                }
              : {
                  title: "Kesehatan provider belum ideal",
                  className: "border-border bg-card/80 text-foreground",
                }

  return (
    <div className={cn("rounded-xl border px-3 py-3", config.className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{config.title}</p>
          <p className="mt-1 text-xs opacity-90">{status.reason || "Provider status tersedia."}</p>
        </div>
        <ProviderStatusBadge status={status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] opacity-80">
        {typeof status.responseTimeMs === "number" && (
          <span>Response {status.responseTimeMs} ms</span>
        )}
        {status.checkedAt && (
          <span>Checked {formatCheckedAt(status.checkedAt)}</span>
        )}
      </div>
      {status.action && (
        <p className="mt-2 text-xs opacity-90">{status.action}</p>
      )}
    </div>
  )
}

function formatCheckedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "just now"
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function EmptyState({
  promptLanguage,
  onSuggestionSelect,
  onTemplateSelect,
}: {
  promptLanguage: PromptLanguage
  onSuggestionSelect: (value: string) => void
  onTemplateSelect: (key: PromptTemplateKey) => void
}) {
  const copy = PROMPT_PANEL_COPY[promptLanguage]

  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
        <Zap className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{copy.emptyTitle}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{copy.emptyDescription}</p>
      <div className="mt-6 space-y-2">
        <SuggestionChip onClick={() => onSuggestionSelect(copy.emptySuggestions[0])}>{copy.emptySuggestions[0]}</SuggestionChip>
        <SuggestionChip onClick={() => onSuggestionSelect(copy.emptySuggestions[1])}>{copy.emptySuggestions[1]}</SuggestionChip>
        <SuggestionChip onClick={() => onSuggestionSelect(copy.emptySuggestions[2])}>{copy.emptySuggestions[2]}</SuggestionChip>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onTemplateSelect("workspace")}>
          {copy.templateOptions.workspace}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onTemplateSelect("landing")}>
          {copy.templateOptions.landing}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onTemplateSelect("auth")}>
          {copy.templateOptions.auth}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onTemplateSelect("dashboard")}>
          {copy.templateOptions.dashboard}
        </Button>
      </div>
    </div>
  )
}

function SuggestionChip({ children, onClick }: { children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg border border-border bg-card px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function MessageBubble({
  message,
  onViewCode,
}: {
  message: Message
  onViewCode?: () => void
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-card text-card-foreground"
        )}
      >
        {message.isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <GeneratingStatus startedAt={message.timestamp} />
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {isUser && Array.isArray(message.metadata?.attachments) && message.metadata.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {message.metadata.attachments.map((name) => (
                  <span key={name} className="rounded-full border border-border px-2 py-1">
                    {name}
                  </span>
                ))}
              </div>
            )}
            {!isUser && message.metadata?.model && (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-1">
                  Model: {sanitizeModelDisplayName(message.metadata.model)}
                </span>
                {message.metadata.failSafeType === "strict-fullstack" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-300">
                    <ShieldAlert className="h-3 w-3" />
                    strict-failsafe
                  </span>
                )}
                {typeof message.metadata.cost === "number" && (
                  <span className="rounded-full border border-border px-2 py-1">
                    Cost: Rp {message.metadata.cost.toLocaleString("id-ID")}
                  </span>
                )}
                {typeof message.metadata.remainingBalance === "number" && (
                  <span className="rounded-full border border-border px-2 py-1">
                    Balance: Rp {message.metadata.remainingBalance.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            )}
            {message.generatedCode && (
              <div className="mt-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Generated Component</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={onViewCode}
                  >
                    View Code
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          <span className="text-xs font-medium text-secondary-foreground">U</span>
        </div>
      )}
    </div>
  )
}

function GeneratingStatus({ startedAt }: { startedAt: Date }) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedAt.getTime())

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt.getTime())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [startedAt])

  let label = "Menghubungi model..."

  if (elapsedMs >= 4000) {
    label = "Model sedang menyusun jawaban..."
  }

  if (elapsedMs >= 10000) {
    label = "Provider sedang lambat, mohon tunggu..."
  }

  if (elapsedMs >= 18000) {
    label = "Masih menunggu provider. Request akan dihentikan otomatis jika terlalu lama."
  }

  return <span className="text-sm text-muted-foreground">{label}</span>
}
