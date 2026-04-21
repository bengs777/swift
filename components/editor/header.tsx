"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft, 
  Download, 
  ExternalLink, 
  MoreHorizontal, 
  Rocket, 
  Share2,
  Github
} from "lucide-react"
import DomainDialog from "./domain-dialog"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface EditorHeaderProps {
  projectId: string
  currentVersion: number
  onExportZip?: () => void
  onDeploy?: () => void
  isExporting?: boolean
  isDeploying?: boolean
  deploymentUrl?: string | null
  customDomain?: string | null
  onDomainSaved?: (domain: string | null) => void
}

export function EditorHeader({
  projectId,
  currentVersion,
  onExportZip,
  onDeploy,
  isExporting = false,
  isDeploying = false,
  deploymentUrl = null,
  customDomain = null,
  onDomainSaved,
}: EditorHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Project</span>
          {currentVersion > 0 && (
            <Badge variant="secondary" className="text-xs">
              v{currentVersion}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onExportZip} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              Download ZIP
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Github className="mr-2 h-4 w-4" />
              Push to GitHub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-2" onClick={onDeploy} disabled={isDeploying}>
            <Rocket className="h-4 w-4" />
            {isDeploying ? "Deploying..." : "Deploy"}
          </Button>

          <DomainDialog projectId={projectId} currentDomain={customDomain} onDomainSaved={onDomainSaved} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </DropdownMenuItem>
            {deploymentUrl && (
              <DropdownMenuItem
                onSelect={() => {
                  window.open(deploymentUrl, "_blank", "noopener,noreferrer")
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open latest deployment
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>Project settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
