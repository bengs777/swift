import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { env } from '@/lib/env'

const globalForPrisma = global as unknown as { prisma: PrismaClient | null }

let prisma: PrismaClient | null = null

if (env.tursoDatabaseUrl) {
  const prismaAdapter = new PrismaLibSQL(
    createClient({
      url: env.tursoDatabaseUrl,
      authToken: env.tursoAuthToken || undefined,
    })
  )

  prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      adapter: prismaAdapter,
      log: ['warn', 'error'],
    })

  if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma
} else if (env.nodeEnv === 'production') {
  throw new Error('TURSO_DATABASE_URL is required in production')
}

export { prisma }
export default prisma
