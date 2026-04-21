// Project types
export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  userId: string
  status: "draft" | "deployed"
  deploymentUrl?: string
  versions: ProjectVersion[]
}

export interface ProjectVersion {
  id: string
  version: number
  createdAt: Date
  files: GeneratedFile[]
  prompt: string
}

// File types
export interface GeneratedFile {
  path: string
  content: string
  language: "tsx" | "ts" | "css" | "json" | "html" | "prisma" | "md" | "env"
}

export interface PromptAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  kind: "image" | "text" | "binary"
  content: string
}

// Chat types
export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  generatedCode?: string
  files?: GeneratedFile[]
  isGenerating?: boolean
  error?: string
}

export interface ModelOption {
  key: string
  label: string
  provider: "agentrouter" | "bluesminds" | "openai"
  modelName: string
  price: number
  isActive: boolean
}

export interface Conversation {
  id: string
  projectId: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// AI types
export interface AIGenerationRequest {
  prompt: string
  projectId: string
  history: Message[]
  attachments?: PromptAttachment[]
  context?: {
    existingFiles?: GeneratedFile[]
    template?: string
  }
}

export interface AIGenerationResponse {
  message: string
  files: GeneratedFile[]
  thinking?: string
  error?: string
}

export interface AIPlannerOutput {
  components: string[]
  structure: string
  styling: string
  interactions: string[]
}

// User types
export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  createdAt: Date
  plan: "free" | "pro" | "team"
}

// Template types
export interface Template {
  id: string
  name: string
  description: string
  category: string
  thumbnail?: string
  files: GeneratedFile[]
  prompt: string
}

// Deployment types
export interface Deployment {
  id: string
  projectId: string
  versionId: string
  url: string
  status: "building" | "ready" | "error"
  createdAt: Date
  logs?: string[]
}

// Settings types
export interface ProjectSettings {
  framework: "next" | "react" | "vue"
  styling: "tailwind" | "css"
  typescript: boolean
  uiLibrary: "shadcn" | "none"
}

// API response types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
