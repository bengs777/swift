import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { env } from "@/lib/env"
import { prisma } from "@/lib/db/client"
import { BillingService } from "@/lib/services/billing.service"
import { PakasirService } from "@/lib/services/pakasir.service"

const TOPUP_MINIMUM = 2000
const TOPUP_MAXIMUM = 50_000_000

const TopupSchema = z.object({
  amount: z.coerce.number().int().min(TOPUP_MINIMUM).max(TOPUP_MAXIMUM),
  note: z.string().trim().max(160).optional().default(""),
  source: z.string().trim().max(80).optional().default("billing-panel"),
})

function buildReference() {
  return `TOPUP-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
}

function buildCustomerName(name: string | null | undefined, email: string) {
  const trimmed = name?.trim()
  if (trimmed) {
    return trimmed
  }

  return email.split("@")[0] || "Swift User"
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = TopupSchema.parse(await request.json())

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (body.amount < TOPUP_MINIMUM) {
      return NextResponse.json(
        { error: `Top up minimum is Rp ${TOPUP_MINIMUM.toLocaleString("id-ID")}` },
        { status: 400 }
      )
    }

    if (!env.pakasirSlug || !env.pakasirApiKey) {
      return NextResponse.json(
        {
          error:
            "Pakasir is not configured. Set PAKASIR_SLUG and PAKASIR_API_KEY before creating topups.",
        },
        { status: 503 }
      )
    }

    const reference = buildReference()
    const checkoutReturnUrl = `${env.appUrl}/dashboard/settings?tab=billing`
    const webhookUrl = `${env.appUrl}/api/billing/pakasir/webhook`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const customerName = buildCustomerName(user.name, user.email)

    await BillingService.createTopUpOrder({
      userId: user.id,
      reference,
      amount: body.amount,
      provider: "pakasir",
      customerName,
      customerEmail: user.email,
      payload: JSON.stringify({
        source: body.source,
        note: body.note,
        requestedAmount: body.amount,
      }),
      status: "pending",
      expiresAt,
    })

    try {
      const invoice = await PakasirService.createInvoice({
        reference,
        amount: body.amount,
        customerName,
        customerEmail: user.email,
        description: body.note || `Swift top up Rp ${body.amount.toLocaleString("id-ID")}`,
        webhookUrl,
        returnUrl: checkoutReturnUrl,
        expiresAt,
      })

      const order = await BillingService.updateTopUpOrder(reference, {
        providerReference: invoice.providerReference,
        checkoutUrl: invoice.checkoutUrl,
        paymentCode: invoice.paymentCode,
        response: invoice.rawResponse,
        status: "pending",
      })

      return NextResponse.json({
        success: true,
        topupMinimum: TOPUP_MINIMUM,
        order: {
          id: order.id,
          reference: order.reference,
          amount: order.amount,
          status: order.status,
          provider: order.provider,
          providerReference: order.providerReference,
          checkoutUrl: order.checkoutUrl,
          paymentCode: order.paymentCode,
          createdAt: order.createdAt,
          expiresAt: order.expiresAt,
        },
        checkoutUrl: order.checkoutUrl,
        paymentCode: order.paymentCode,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create Pakasir invoice"
      await BillingService.markTopUpOrderFailed(reference, message)
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create top up order"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}