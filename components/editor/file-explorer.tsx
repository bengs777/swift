"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { GeneratedFile } from "@/lib/types"
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePenLine,
  FilePlus2,
  Folder,
  Trash2,
} from "lucide-react"

type FileNode = {
  path: string
  name: string
  type: "folder" | "file"
  children: FileNode[]
}

interface FileExplorerProps {
  files: GeneratedFile[]
  activeFileIndex: number
  onSelectFile: (index: number) => void
  onReplaceFiles?: (files: GeneratedFile[]) => void
}

const DEFAULT_EXPANDED_FOLDERS = ["app", "components", "hooks", "lib", "prisma", "public", "styles"]

export function FileExplorer({
  files,
  activeFileIndex,
  onSelectFile,
  onReplaceFiles,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(DEFAULT_EXPANDED_FOLDERS)

  const fileTree = useMemo(() => buildFileTree(files), [files])
  const activeFile = files[activeFileIndex] || null
  const canMutateFiles = Boolean(onReplaceFiles)

  const handleToggleFolder = (folderPath: string) => {
    setExpandedFolders((current) =>
      current.includes(folderPath)
        ? current.filter((path) => path !== folderPath)
        : [...current, folderPath]
    )
  }

  const handleCreateFile = () => {
    if (!onReplaceFiles) return

    const rawPath = window.prompt("New file path (example: app/about/page.tsx)", "app/new-file.tsx")
    if (!rawPath) return

    const filePath = normalizePath(rawPath)
    if (!filePath) return

    if (files.some((file) => file.path.toLowerCase() === filePath.toLowerCase())) {
      window.alert("A file with this path already exists.")
      return
    }

    const nextFiles = [
      ...files,
      {
        path: filePath,
        content: getDefaultContentForPath(filePath),
        language: inferLanguageFromPath(filePath),
      },
    ]

    onReplaceFiles(nextFiles)
    onSelectFile(nextFiles.length - 1)
  }

  const handleRenameActiveFile = () => {
    if (!onReplaceFiles || !activeFile) return

    const rawPath = window.prompt("Rename file path", activeFile.path)
    if (!rawPath) return

    const filePath = normalizePath(rawPath)
    if (!filePath || filePath === activeFile.path) return

    if (files.some((file) => file.path.toLowerCase() === filePath.toLowerCase() && file.path !== activeFile.path)) {
      window.alert("A file with this path already exists.")
      return
    }

    const nextFiles = files.map((file) =>
      file.path === activeFile.path
        ? {
            ...file,
            path: filePath,
            language: inferLanguageFromPath(filePath),
          }
        : file
    )

    onReplaceFiles(nextFiles)
    onSelectFile(nextFiles.findIndex((file) => file.path === filePath))
  }

  const handleDeleteActiveFile = () => {
    if (!onReplaceFiles || !activeFile) return

    const shouldDelete = window.confirm(`Delete file "${activeFile.path}"?`)
    if (!shouldDelete) return

    const nextFiles = files.filter((file) => file.path !== activeFile.path)
    onReplaceFiles(nextFiles)
    onSelectFile(Math.max(0, nextFiles.findIndex((file) => file.path === activeFile.path)))
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Explorer</p>
          <p className="text-xs text-muted-foreground">Project files</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {files.length}
        </Badge>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2"
          onClick={handleCreateFile}
          disabled={!canMutateFiles}
        >
          <FilePlus2 className="h-4 w-4" />
          New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2"
          onClick={handleRenameActiveFile}
          disabled={!canMutateFiles || !activeFile}
        >
          <FilePenLine className="h-4 w-4" />
          Rename
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-2"
          onClick={handleDeleteActiveFile}
          disabled={!canMutateFiles || !activeFile}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {files.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              No files yet. Start by generating a project or create a file manually.
            </div>
          ) : (
            fileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                files={files}
                activeFileIndex={activeFileIndex}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function FileTreeNode({
  node,
  files,
  activeFileIndex,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  depth = 0,
}: {
  node: FileNode
  files: GeneratedFile[]
  activeFileIndex: number
  expandedFolders: string[]
  onToggleFolder: (folderPath: string) => void
  onSelectFile: (index: number) => void
  depth?: number
}) {
  const isFolder = node.type === "folder"
  const isExpanded = expandedFolders.includes(node.path)
  const fileIndex = files.findIndex((file) => file.path === node.path)
  const isActive = fileIndex === activeFileIndex

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              files={files}
              activeFileIndex={activeFileIndex}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(fileIndex)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      style={{ paddingLeft: `${24 + depth * 14}px` }}
    >
      <FileCode className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

function buildFileTree(files: GeneratedFile[]): FileNode[] {
  const root: FileNode = {
    path: "__root__",
    name: "__root__",
    type: "folder",
    children: [],
  }

  for (const file of files) {
    const segments = normalizePath(file.path).split("/").filter(Boolean)
    let current = root
    let currentPath = ""

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const isFile = index === segments.length - 1
      const type: "folder" | "file" = isFile ? "file" : "folder"

      let node = current.children.find((child) => child.name === segment && child.type === type)

      if (!node) {
        node = {
          path: isFile ? file.path : currentPath,
          name: segment,
          type,
          children: [],
        }
        current.children.push(node)
      }

      current = node
    })
  }

  sortTreeNodes(root.children)
  return root.children
}

function sortTreeNodes(nodes: FileNode[]) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1
    }

    return left.name.localeCompare(right.name)
  })

  for (const node of nodes) {
    if (node.children.length > 0) {
      sortTreeNodes(node.children)
    }
  }
}

function inferLanguageFromPath(path: string): GeneratedFile["language"] {
  if (path.endsWith(".tsx")) return "tsx"
  if (path.endsWith(".ts")) return "ts"
  if (path.endsWith(".css")) return "css"
  if (path.endsWith(".json")) return "json"
  if (path.endsWith(".html")) return "html"
  if (path.endsWith(".prisma")) return "prisma"
  if (path.endsWith(".md")) return "md"
  if (path.endsWith(".env")) return "env"
  return "ts"
}

function getDefaultContentForPath(path: string) {
  if (path.endsWith(".tsx")) {
    const componentName = toPascalCase(path.split("/").pop()?.replace(/\.tsx$/, "") || "NewComponent")
    return `export default function ${componentName}() {\n  return (\n    <div className="p-6">\n      <h1 className="text-2xl font-semibold">${componentName}</h1>\n    </div>\n  )\n}\n`
  }

  if (path.endsWith(".ts")) {
    return `export const placeholder = true\n`
  }

  if (path.endsWith(".css")) {
    return `/* New stylesheet */\n`
  }

  if (path.endsWith(".json")) {
    return `{}`
  }

  if (path.endsWith(".md")) {
    return `# New file\n`
  }

  if (path.endsWith(".env")) {
    return `NEW_ENV_VALUE=""\n`
  }

  if (path.endsWith(".prisma")) {
    return `model Example {\n  id String @id @default(cuid())\n}\n`
  }

  if (path.endsWith(".html")) {
    return `<!doctype html>\n<html lang="en">\n  <body></body>\n</html>\n`
  }

  return `\n`
}

function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim()
}

function toPascalCase(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("") || "NewComponent"
}