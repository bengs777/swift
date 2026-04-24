import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { env } from '@/lib/env'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

if (!env.tursoDatabaseUrl) {
  throw new Error('TURSO_DATABASE_URL is required')
}

const prismaAdapter = new PrismaLibSQL(
  createClient({
    url: env.tursoDatabaseUrl,
    authToken: env.tursoAuthToken || undefined,
  })
)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: prismaAdapter,
    log: ['warn', 'error'],
  })

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma

export default prisma
