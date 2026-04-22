type NextAuthResponse = {
  url?: string
  error?: string
  code?: string
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
  })

  if (!response.ok) {
    throw new Error("Failed to load auth token")
  }

  const payload = (await response.json()) as { csrfToken?: string }

  if (!payload.csrfToken) {
    throw new Error("Failed to load auth token")
  }

  return payload.csrfToken
}

async function postAuthRequest(path: string, values: Record<string, string>) {
  const csrfToken = await getCsrfToken()

  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      ...values,
      csrfToken,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as NextAuthResponse
  const redirectUrl = payload.url ? new URL(payload.url, window.location.origin) : null

  return {
    ok: response.ok,
    url: redirectUrl,
    error: redirectUrl?.searchParams.get("error") ?? payload.error ?? null,
    code: redirectUrl?.searchParams.get("code") ?? payload.code ?? null,
  }
}

export async function startGoogleSignIn(callbackUrl: string) {
  return postAuthRequest("/signin/google", { callbackUrl })
}

export async function startCredentialsSignIn(
  email: string,
  password: string,
  callbackUrl: string
) {
  return postAuthRequest("/callback/credentials", {
    email,
    password,
    callbackUrl,
  })
}