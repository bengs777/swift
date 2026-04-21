import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProjectList } from "@/components/dashboard/project-list"
import { NewProjectTrigger } from "@/components/dashboard/new-project-trigger"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      usageLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      workspaces: true,
      memberships: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  const totalSpent = user.usageLogs
    .filter((log) => log.status === "completed")
    .reduce((sum, log) => sum + log.cost, 0)

  const totalRefunded = user.usageLogs
    .filter((log) => log.status === "refunded")
    .reduce((sum, log) => sum + log.cost, 0)

  const successfulRequests = user.usageLogs.filter((log) => log.status === "completed").length
  const workspaceOptions = user.memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
  }))
  const defaultWorkspaceId = workspaceOptions[0]?.id

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Swift Builder Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor credits, usage, and project activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            Balance: Rp {user.balance.toLocaleString("id-ID")}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings?tab=billing">
              Top up
            </Link>
          </Button>
          <NewProjectTrigger
            workspaces={workspaceOptions}
            defaultWorkspaceId={defaultWorkspaceId}
          />
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Current Balance"
          description="Available wallet balance"
          value={`Rp ${user.balance.toLocaleString("id-ID")}`}
        />
        <SummaryCard
          title="Successful Requests"
          description="Completed AI calls"
          value={successfulRequests.toLocaleString("id-ID")}
        />
        <SummaryCard
          title="Total Spent"
          description="Completed request cost"
          value={`Rp ${totalSpent.toLocaleString("id-ID")}`}
        />
        <SummaryCard
          title="Refunded"
          description="Automatically refunded requests"
          value={`Rp ${totalRefunded.toLocaleString("id-ID")}`}
        />
      </div>

      <div className="grid gap-6 px-6 pb-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Usage Logs</CardTitle>
            <CardDescription>
              Last 10 model requests with provider, cost, and refund status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.usageLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usage logs yet. Send your first model request to start tracking activity.
              </p>
            ) : (
              <div className="space-y-3">
                {user.usageLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{log.model}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.provider} • {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getUsageVariant(log.status)}>{log.status}</Badge>
                        <Badge variant="outline">
                          Rp {log.cost.toLocaleString("id-ID")}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {log.prompt}
                    </p>
                    {log.errorMessage && (
                      <p className="mt-2 text-xs text-destructive">{log.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Existing generated app projects in your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectList
              searchQuery=""
              workspaceId={defaultWorkspaceId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}

function getUsageVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default"
  if (status === "refunded") return "secondary"
  if (status === "failed") return "destructive"
  return "outline"
}
