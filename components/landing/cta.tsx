import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, Layers3, Sparkles, WandSparkles } from "lucide-react"

export function CTA() {
  return (
    <section className="border-t border-border py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-8 shadow-2xl shadow-black/5 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.985_0_0_/_0.7),transparent_26%),radial-gradient(circle_at_top_right,oklch(0.97_0_0_/_0.35),transparent_24%),radial-gradient(circle_at_bottom_right,oklch(0.985_0_0_/_0.45),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,oklch(0.269_0_0_/_0.6),transparent_24%),radial-gradient(circle_at_top_right,oklch(0.205_0_0_/_0.38),transparent_22%),radial-gradient(circle_at_bottom_right,oklch(0.985_0_0_/_0.05),transparent_26%)]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:gap-12">
            <div className="space-y-6">
              <Badge className="gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Built for teams that ship fast
              </Badge>
              <div className="space-y-4">
                <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Ready to move from idea to a polished product screen?
                </h2>
                <p className="max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                  Swift gives you a concrete result pack, not a blank canvas. Start free, inspect the generated output, and keep iterating until it feels production-ready.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 rounded-full px-5 shadow-sm">
                    Start Building Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="rounded-full px-5 shadow-sm">
                    View Pricing
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat icon={WandSparkles} label="Prompt to UI" value="Minutes" />
                <MiniStat icon={Layers3} label="Result pack" value="Sections + files" />
                <MiniStat icon={CheckCircle2} label="Production feel" value="Built in" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-xl">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Swift output preview
                    </span>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
                    Ready to ship
                  </Badge>
                </div>

                <div className="grid gap-0 lg:grid-cols-[0.95fr,1.05fr]">
                  <div className="border-b border-border bg-secondary/30 p-5 lg:border-b-0 lg:border-r">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          Prompt
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground">
                          Create a sign up modal with validation and a success toast.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">Generated outputs</span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            4 blocks
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <PreviewRow title="Form layout" value="Fields, labels, helper text" />
                          <PreviewRow title="Validation" value="Inline states and errors" />
                          <PreviewRow title="Success" value="Toast and confirmation" />
                          <PreviewRow title="Files" value="modal.tsx, toast.tsx" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background p-5">
                    <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                            Live preview
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">Modal with Form</div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                          v1
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-border bg-muted/25 p-3">
                          <div className="h-3.5 w-24 rounded-full bg-muted" />
                          <div className="mt-3 h-10 rounded-xl border border-border bg-background" />
                          <div className="mt-2 h-10 rounded-xl border border-border bg-background" />
                          <div className="mt-2 h-10 rounded-xl border border-border bg-background" />
                          <div className="mt-4 h-10 rounded-xl bg-primary" />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Files</div>
                            <div className="mt-2 text-sm font-medium text-foreground">modal.tsx</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">State</div>
                            <div className="mt-2 text-sm font-medium text-foreground">Success ready</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  )
}

function PreviewRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background px-3 py-3">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{value}</div>
      </div>
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
    </div>
  )
}
