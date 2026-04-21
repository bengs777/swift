import { prisma } from '@/lib/db/client'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

export class UserService {
  static async ensureUserExists(
    email: string,
    name?: string | null,
    image?: string | null
  ) {
    return prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        image: image || undefined,
      },
      create: {
        email,
        name,
        image,
        balance: 5000,
        welcomeBonusGrantedAt: new Date(),
      },
    })
  }

  static async findOrCreateUser(email: string, data: Prisma.UserCreateInput) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: data.name ?? null,
        image: data.image ?? null,
        balance: 5000,
        welcomeBonusGrantedAt: new Date(),
      },
      update: {
        name: data.name || undefined,
        image: data.image || undefined,
      },
      include: {
        workspaces: {
          include: {
            members: true,
          },
        },
      },
    })

    return user
  }

  static async getUserWithWorkspaces(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
            subscription: true,
          },
        },
        memberships: {
          include: {
            workspace: {
              include: {
                members: true,
                subscription: true,
              },
            },
          },
        },
      },
    })
  }

  static async createUserWithWorkspace(
    email: string,
    name: string | null,
    image: string | null,
    passwordHash?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const welcomeBonus = 5000

      const user = await tx.user.create({
        data: {
          email,
          name,
          image,
          passwordHash,
          balance: welcomeBonus,
          welcomeBonusGrantedAt: new Date(),
        },
      })

      await tx.billingTransaction.create({
        data: {
          userId: user.id,
          kind: "welcome_bonus",
          direction: "credit",
          amount: welcomeBonus,
          balanceBefore: 0,
          balanceAfter: welcomeBonus,
          reference: `welcome-bonus:${user.id}`,
          provider: "internal",
          description: "One-time welcome balance for new account",
          metadata: JSON.stringify({
            source: "signup",
            amount: welcomeBonus,
          }),
        },
      })

      // Create default workspace
      const workspace = await tx.workspace.create({
        data: {
          name: `${name || 'My'} Workspace`,
          slug: `workspace-${user.id.slice(0, 8)}`,
          createdBy: user.id,
        },
      })

      // Add user as admin to workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'admin',
        },
      })

      // Create default subscription
      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          plan: 'free',
        },
      })

      return user
    })
  }

  static async createUserWithWorkspaceIfMissing(
    email: string,
    name: string | null,
    image: string | null
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return existingUser
    }

    return this.createUserWithWorkspace(email, name, image)
  }

  static async createCredentialsUserWithWorkspace(
    email: string,
    name: string,
    password: string
  ) {
    const normalizedEmail = email.trim().toLowerCase()
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      throw new Error('USER_EXISTS')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    return this.createUserWithWorkspace(
      normalizedEmail,
      name,
      null,
      passwordHash
    )
  }

  static async validateCredentials(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user?.passwordHash) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    return user
  }

  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
        workspaces: true,
      },
    })
  }
}
