import { prisma } from "@/lib/db/client"
import { BillingService } from "@/lib/services/billing.service"
import type { GenerateSession } from "@/lib/types"

export interface GenerateCostBreakdown {
  provider: string
  model: string
  costPerRequest: number
  totalCost: number
  currency: string
}

export class GenerateBillingService {
  /**
   * Get cost breakdown untuk selected model
   */
  static getCostBreakdown(provider: string, model: string): GenerateCostBreakdown {
    // V0 provider: 5000 IDR per request
    if (provider === "v0") {
      return {
        provider: "v0",
        model: model,
        costPerRequest: 5000,
        totalCost: 5000,
        currency: "IDR",
      }
    }

    // Orchestrator provider: 5000 IDR per request
    if (provider === "orchestrator") {
      return {
        provider: "orchestrator",
        model: model,
        costPerRequest: 5000,
        totalCost: 5000,
        currency: "IDR",
      }
    }

    // Default untuk providers lain (bisa dikonfigurasi)
    return {
      provider,
      model,
      costPerRequest: 0,
      totalCost: 0,
      currency: "IDR",
    }
  }

  /**
   * Check apakah user punya balance cukup
   */
  static async checkBalance(userId: string, requiredAmount: number): Promise<{
    hasBalance: boolean
    currentBalance: number
    shortfall?: number
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    })

    if (!user) {
      return {
        hasBalance: false,
        currentBalance: 0,
        shortfall: requiredAmount,
      }
    }

    const hasBalance = user.balance >= requiredAmount
    return {
      hasBalance,
      currentBalance: user.balance,
      shortfall: hasBalance ? undefined : requiredAmount - user.balance,
    }
  }

  /**
   * Deduct cost dari user balance (charge for generation)
   */
  static async deductBalance(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean
    newBalance: number
    error?: string
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      })

      if (!user) {
        return {
          success: false,
          newBalance: 0,
          error: "User not found",
        }
      }

      if (user.balance < amount) {
        return {
          success: false,
          newBalance: user.balance,
          error: `Insufficient balance. Required: Rp ${amount.toLocaleString("id-ID")}, Available: Rp ${user.balance.toLocaleString("id-ID")}`,
        }
      }

      // Update balance
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
        select: { balance: true },
      })

      // Log transaction
      try {
        await BillingService.logTransaction({
          userId,
          type: "debit",
          amount,
          description,
          metadata: {
            ...metadata,
            source: "generate",
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        console.error("[v0] Failed to log transaction:", error)
        // Don't fail if logging fails, as balance has already been deducted
      }

      return {
        success: true,
        newBalance: updated.balance,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to deduct balance"
      return {
        success: false,
        newBalance: 0,
        error: message,
      }
    }
  }

  /**
   * Refund balance jika generation gagal
   */
  static async refundBalance(
    userId: string,
    amount: number,
    reason: string,
    originalMetadata?: Record<string, any>
  ): Promise<{
    success: boolean
    newBalance: number
    error?: string
  }> {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
        select: { balance: true },
      })

      // Log refund
      try {
        await BillingService.logTransaction({
          userId,
          type: "credit",
          amount,
          description: `Refund: ${reason}`,
          metadata: {
            ...originalMetadata,
            source: "generate-refund",
            timestamp: new Date().toISOString(),
          },
        })
      } catch (error) {
        console.error("[v0] Failed to log refund transaction:", error)
      }

      return {
        success: true,
        newBalance: updated.balance,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refund balance"
      return {
        success: false,
        newBalance: 0,
        error: message,
      }
    }
  }

  /**
   * Get generation history dengan cost breakdown
   */
  static async getGenerationHistory(userId: string, limit = 50) {
    // This would integrate with project history table
    // For now, returning placeholder
    return {
      total: 0,
      history: [],
    }
  }

  /**
   * Get user's balance info
   */
  static async getUserBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        email: true,
      },
    })

    return user ? {
      userId: user.id,
      balance: user.balance,
      email: user.email,
    } : null
  }
}
