"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard] Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Dashboard temporarily unavailable</CardTitle>
          <CardDescription>
            We hit an unexpected server error while loading your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
