import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/client"

type BalanceTransactionInput = {
  userId: string
  kind: string
  direction: "credit" | "debit"
  amount: number
  balanceBefore: number
  balanceAfter: number
  reference?: string | null
  provider?: string | null
  providerReference?: string | null
  description?: string | null
  metadata?: string | null
}

type TopUpOrderInput = {
  userId: string
  reference: string
  amount: number
  provider?: string
  providerReference?: string | null
  checkoutUrl?: string | null
  paymentCode?: string | null
  customerName?: string | null
  customerEmail?: string | null
  payload?: string | null
  response?: string | null
  status?: string
  expiresAt?: Date | null
}

type TopUpFinalizationInput = {
  reference: string
  providerReference?: string | null
  paymentCode?: string | null
  response?: string | null
  checkoutUrl?: string | null
  amount?: number | null
  paidAt?: Date | null
}

export class BillingService {
  private static async recordBalanceTransaction(
    tx: Prisma.TransactionClient,
    input: BalanceTransactionInput
  ) {
    return tx.billingTransaction.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        direction: input.direction,
        amount: input.amount,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        reference: input.reference ?? undefined,
        provider: input.provider ?? undefined,
        providerReference: input.providerReference ?? undefined,
        description: input.description ?? undefined,
        metadata: input.metadata ?? undefined,
      },
    })
  }

  static async createTopUpOrder(input: TopUpOrderInput) {
    return prisma.topUpOrder.create({
      data: {
        userId: input.userId,
        reference: input.reference,
        amount: input.amount,
        provider: input.provider || "pakasir",
        providerReference: input.providerReference ?? undefined,
        checkoutUrl: input.checkoutUrl ?? undefined,
        paymentCode: input.paymentCode ?? undefined,
        customerName: input.customerName ?? undefined,
        customerEmail: input.customerEmail ?? undefined,
        payload: input.payload ?? undefined,
        response: input.response ?? undefined,
        status: input.status || "pending",
        expiresAt: input.expiresAt ?? undefined,
      },
    })
  }

  static async updateTopUpOrder(reference: string, data: Partial<TopUpOrderInput> & { status?: string }) {
    return prisma.topUpOrder.update({
      where: { reference },
      data: {
        amount: data.amount ?? undefined,
        provider: data.provider ?? undefined,
        providerReference: data.providerReference ?? undefined,
        checkoutUrl: data.checkoutUrl ?? undefined,
        paymentCode: data.paymentCode ?? undefined,
        customerName: data.customerName ?? undefined,
        customerEmail: data.customerEmail ?? undefined,
        payload: data.payload ?? undefined,
        response: data.response ?? undefined,
        status: data.status ?? undefined,
        expiresAt: data.expiresAt ?? undefined,
      },
    })
  }

  static async markTopUpOrderFailed(reference: string, response: string) {
    return prisma.topUpOrder.update({
      where: { reference },
      data: {
        status: "failed",
        response,
      },
    })
  }

  static async finalizeTopUpOrder(input: TopUpFinalizationInput) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.topUpOrder.findUnique({
        where: { reference: input.reference },
        include: {
          user: {
            select: {
              id: true,
              balance: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error("TOPUP_ORDER_NOT_FOUND")
      }

      if (order.status === "paid") {
        return {
          order,
          alreadyProcessed: true,
          creditedBalance: order.user.balance,
        }
      }

      if (typeof input.amount === "number" && input.amount !== order.amount) {
        throw new Error("TOPUP_AMOUNT_MISMATCH")
      }

      const balanceBefore = order.user.balance
      const balanceAfter = balanceBefore + order.amount

      await tx.user.update({
        where: { id: order.userId },
        data: {
          balance: {
            increment: order.amount,
          },
        },
      })

      const updatedOrder = await tx.topUpOrder.update({
        where: { reference: order.reference },
        data: {
          status: "paid",
          paidAt: input.paidAt || new Date(),
          providerReference: input.providerReference ?? order.providerReference ?? undefined,
          paymentCode: input.paymentCode ?? order.paymentCode ?? undefined,
          checkoutUrl: input.checkoutUrl ?? order.checkoutUrl ?? undefined,
          response: input.response ?? order.response ?? undefined,
        },
      })

      await this.recordBalanceTransaction(tx, {
        userId: order.userId,
        kind: "topup",
        direction: "credit",
        amount: order.amount,
        balanceBefore,
        balanceAfter,
        reference: `topup:${order.reference}`,
        provider: order.provider,
        providerReference: input.providerReference ?? order.providerReference ?? order.reference,
        description: `Top up balance via ${order.provider}`,
        metadata: JSON.stringify({
          orderId: order.id,
          reference: order.reference,
          providerReference: input.providerReference ?? order.providerReference,
          paymentCode: input.paymentCode ?? order.paymentCode,
        }),
      })

      return {
        order: updatedOrder,
        alreadyProcessed: false,
        creditedBalance: balanceAfter,
      }
    })
  }

  static async reserveBalance(userId: string, modelConfigId: string, model: string, provider: string, prompt: string, cost: number) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true },
      })

      if (!user) {
        throw new Error("User not found")
      }

      if (user.balance < cost) {
        throw new Error("Insufficient balance")
      }

      const usageLog = await tx.usageLog.create({
        data: {
          userId,
          modelConfigId,
          model,
          provider,
          cost,
          prompt,
          status: "reserved",
        },
      })

      const balanceAfter = user.balance - cost

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: cost,
          },
        },
      })

      await this.recordBalanceTransaction(tx, {
        userId,
        kind: "usage",
        direction: "debit",
        amount: cost,
        balanceBefore: user.balance,
        balanceAfter,
        reference: `usage:${usageLog.id}`,
        provider,
        providerReference: usageLog.id,
        description: `Reserved prompt credits for ${model}`,
        metadata: JSON.stringify({
          modelConfigId,
          model,
          promptLength: prompt.length,
        }),
      })

      return usageLog
    })
  }

  static async markCompleted(
    usageLogId: string,
    details?: {
      provider?: string
      model?: string
      errorMessage?: string | null
    }
  ) {
    const data: {
      status: "completed"
      provider?: string
      model?: string
      errorMessage?: string | null
    } = {
      status: "completed",
    }

    if (details?.provider) {
      data.provider = details.provider
    }

    if (details?.model) {
      data.model = details.model
    }

    if (typeof details?.errorMessage !== "undefined") {
      data.errorMessage = details.errorMessage
    }

    return prisma.usageLog.update({
      where: { id: usageLogId },
      data,
    })
  }

  static async refundReservation(usageLogId: string, userId: string, cost: number, errorMessage: string) {
    return prisma.$transaction(async (tx) => {
      const usageLog = await tx.usageLog.findUnique({
        where: { id: usageLogId },
        select: {
          id: true,
          status: true,
        },
      })

      if (!usageLog) {
        throw new Error("Usage log not found")
      }

      if (usageLog.status === "refunded") {
        return tx.usageLog.findUnique({ where: { id: usageLogId } })
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true },
      })

      if (!user) {
        throw new Error("User not found")
      }

      const balanceAfter = user.balance + cost

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: cost,
          },
        },
      })

      await this.recordBalanceTransaction(tx, {
        userId,
        kind: "refund",
        direction: "credit",
        amount: cost,
        balanceBefore: user.balance,
        balanceAfter,
        reference: `refund:${usageLogId}`,
        provider: "internal",
        providerReference: usageLogId,
        description: errorMessage,
        metadata: JSON.stringify({
          errorMessage,
        }),
      })

      return tx.usageLog.update({
        where: { id: usageLogId },
        data: {
          status: "refunded",
          errorMessage,
          refundedAt: new Date(),
        },
      })
    })
  }
}
