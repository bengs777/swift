"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Zap, Chrome } from "lucide-react"
import { startCredentialsSignIn, startGoogleSignIn } from "@/lib/auth-client"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await startCredentialsSignIn(
        email.trim().toLowerCase(),
        password,
        "/dashboard"
      )

      if (result.error || !result.ok) {
        setError("Invalid email or password")
      } else if (result.url) {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError("")
    try {
      const result = await startGoogleSignIn("/dashboard")

      if (result.url) {
        window.location.href = result.url.toString()
        return
      }

      setError("Failed to sign in with Google")
      setIsLoading(false)
    } catch (err) {
      setError("Failed to sign in with Google")
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
      suppressHydrationWarning
    >
      <div className="w-full max-w-sm" suppressHydrationWarning>
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">Swift</span>
        </Link>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue to Swift
            </p>
          </div>

          {/* OAuth buttons */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            suppressHydrationWarning
          >
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} suppressHydrationWarning>
            <FieldGroup suppressHydrationWarning>
              <Field suppressHydrationWarning>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  suppressHydrationWarning
                />
              </Field>
              <Field suppressHydrationWarning>
                <div className="flex items-center justify-between">
                  <FieldLabel>Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  suppressHydrationWarning
                />
              </Field>
            </FieldGroup>

            {error && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="mt-6 w-full"
              disabled={isLoading}
              suppressHydrationWarning
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link href="/signup" className="text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
