import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/client"
import { UserService } from "@/lib/services/user.service"
import { env } from "@/lib/env"

// In-memory cache untuk mengurangi database queries
const userIdCache = new Map<string, string | null>()

async function resolveDatabaseUserId(email?: string | null) {
  if (!email) return null

  // Check cache first
  if (userIdCache.has(email)) {
    return userIdCache.get(email) ?? null
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    const userId = dbUser?.id ?? null
    userIdCache.set(email, userId)
    return userId
  } catch (error) {
    console.error("[v0] Database error resolving user ID:", error)
    return null
  }
}

// Clear cache periodically (setiap 5 menit)
setInterval(() => {
  userIdCache.clear()
}, 5 * 60 * 1000)

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.nextAuthSecret,
  providers: [
    Google({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null
        }

        const email = credentials.email

        const user = await UserService.createUserWithWorkspaceIfMissing(
          email,
          email.split("@")[0],
          null
        )

        return {
          id: user.id,
          email: user.email,
          name: user.name || email.split("@")[0],
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email
      }

      const databaseUserId = await resolveDatabaseUserId(
        user?.email ?? token.email
      )

      if (databaseUserId) {
        token.id = databaseUserId
      } else if (user?.id) {
        token.id = user.id
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const userEmail = session.user.email ?? token.email

        if (userEmail) {
          await UserService.grantMonthlyFreeCreditsIfNeeded(userEmail)
        }

        const databaseUserId = await resolveDatabaseUserId(
          userEmail
        )

        session.user.id = (databaseUserId ?? token.id) as string
        session.user.email = token.email as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      try {
        // Only handle Google OAuth
        if (account?.provider === "google" && user.email) {
          await UserService.createUserWithWorkspaceIfMissing(
            user.email,
            user.name || user.email.split("@")[0],
            user.image || null
          )

          // Clear cache untuk email ini agar data terbaru ter-fetch
          userIdCache.delete(user.email)
        }
      } catch (error) {
        console.error("[v0] Auth signIn sync warning:", error)
      }

      return true
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log("[v0] User signed in:", user.email, "via", account?.provider)
    },
  },
})