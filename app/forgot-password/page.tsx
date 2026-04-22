import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Password reset via email belum diaktifkan di versi ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Kalau kamu lupa password, pakai login Google atau hubungi admin untuk reset akun.
          </p>
          <div className="flex gap-3">
            <Button asChild className="flex-1">
              <Link href="/login">Back to login</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}