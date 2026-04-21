import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { env } from '@/lib/env'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prismaAdapter =
  env.databaseUrl
    ? new PrismaLibSQL(
        createClient({
          url: env.databaseUrl,
          authToken: env.tursoAuthToken || undefined,
        })
      )
    : undefined

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(prismaAdapter ? { adapter: prismaAdapter } : {}),
    log: ['warn', 'error'],
  })

if (env.nodeEnv !== 'production') globalForPrisma.prisma = prisma

export default prisma
