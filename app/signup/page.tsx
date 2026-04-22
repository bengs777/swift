"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Zap, Chrome } from "lucide-react"
import { startCredentialsSignIn, startGoogleSignIn } from "@/lib/auth-client"

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreed) {
      setError("Please agree to the terms and conditions")
      return
    }

    setIsLoading(true)

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          termsAccepted: agreed,
        }),
      })

      if (!registerResponse.ok) {
        const payload = (await registerResponse.json().catch(() => null)) as {
          error?: string
        } | null
        setError(payload?.error || "Failed to create account")
        return
      }

      const result = await startCredentialsSignIn(
        email.trim().toLowerCase(),
        password,
        "/dashboard"
      )

      if (result.error || !result.ok) {
        setError("Failed to create account")
      } else if (result.url) {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError("")
    try {
      const result = await startGoogleSignIn("/dashboard")

      if (result.url) {
        window.location.href = result.url.toString()
        return
      }

      setError("Failed to sign up with Google")
      setIsLoading(false)
    } catch (err) {
      setError("Failed to sign up with Google")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
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
            <h1 className="text-xl font-semibold text-foreground">Create an account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start building with Swift today
            </p>
          </div>

          {/* OAuth buttons */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={handleGoogleSignup}
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
                <FieldLabel>Name</FieldLabel>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  suppressHydrationWarning
                />
              </Field>
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
                <FieldLabel>Password</FieldLabel>
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  suppressHydrationWarning
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </Field>
            </FieldGroup>

            <div className="mt-4 flex items-start gap-2" suppressHydrationWarning>
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
                suppressHydrationWarning
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground">
                I agree to the{" "}
                <Link href="/terms" className="text-foreground hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-foreground hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </div>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
