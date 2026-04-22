"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, RefreshCcw, Wallet, Zap, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useCryptoPayment } from "@/hooks/use-crypto-payment"

type BillingOverview = {
  balance: number
  welcomeBonusGrantedAt: string | null
  welcomeBonusAmount: number
  topupMinimum: number
  topUpOrders: Array<{
    id: string
    reference: string
    amount: number
    status: string
    provider: string
    providerReference: string | null
    checkoutUrl: string | null
    paymentCode: string | null
    customerName: string | null
    customerEmail: string | null
    createdAt: string
    paidAt: string | null
    expiresAt: string | null
  }>
  billingTransactions: Array<{
    id: string
    kind: string
    direction: string
    amount: number
    balanceBefore: number
    balanceAfter: number
    reference: string | null
    provider: string | null
    providerReference: string | null
    description: string | null
    createdAt: string
  }>
}

const QUICK_AMOUNTS = [2000, 5000, 10000, 25000]
const USD_TO_IDR = 15800

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return "default"
    case "pending":
    case "processing":
      return "secondary"
    case "failed":
    case "expired":
    case "canceled":
    case "cancelled":
      return "destructive"
    default:
      return "outline"
  }
}

export function BillingPanel() {
  const { status: sessionStatus } = useSession()
  const { toast } = useToast()
  const { openCheckout: openCryptoCheckout, isLoading: isCryptoLoading } = useCryptoPayment()
  
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState("2000")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastCheckoutUrl, setLastCheckoutUrl] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"pakasir" | "crypto">("pakasir")
  const [selectedChain, setSelectedChain] = useState<56 | 8453>(56)

  const loadOverview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/billing/overview", {
        cache: "no-store",
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string } & Partial<BillingOverview>

      if (!response.ok) {
        throw new Error(data.error || "Failed to load billing overview")
      }

      setOverview({
        balance: data.balance || 0,
        welcomeBonusGrantedAt: data.welcomeBonusGrantedAt || null,
        welcomeBonusAmount: data.welcomeBonusAmount || 5000,
        topupMinimum: data.topupMinimum || 2000,
        topUpOrders: Array.isArray(data.topUpOrders) ? data.topUpOrders : [],
        billingTransactions: Array.isArray(data.billingTransactions) ? data.billingTransactions : [],
      })
    } catch (loadError) {
      const messageText = loadError instanceof Error ? loadError.message : "Gagal memuat billing"
      setError(messageText)
      toast({
        title: "Gagal memuat billing",
        description: messageText,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadOverview()
    }

    if (sessionStatus === "unauthenticated") {
      setIsLoading(false)
      setError("Silakan login untuk melihat billing dan top up.")
    }
  }, [sessionStatus])

  const handleCreateTopup = async () => {
    const parsedAmount = Number(amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount < 2000) {
      setError("Top up minimum adalah Rp 2.000.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/billing/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parsedAmount,
          source: "billing-panel",
        }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        checkoutUrl?: string | null
        paymentCode?: string | null
        order?: {
          reference?: string
          amount?: number
          status?: string
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat top up")
      }

      const checkoutUrl = data.checkoutUrl || null
      setLastCheckoutUrl(checkoutUrl)
      setMessage(
        checkoutUrl
          ? `Order ${data.order?.reference || "top up"} siap dibayar via Pakasir.`
          : "Order top up dibuat, tetapi URL pembayaran belum tersedia."
      )

      toast({
        title: "Top up dibuat",
        description: checkoutUrl
          ? "Halaman pembayaran Pakasir akan dibuka."
          : "Order dibuat, cek detail di panel billing.",
      })

      await loadOverview()

      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer")
      }
    } catch (submitError) {
      const messageText = submitError instanceof Error ? submitError.message : "Gagal membuat top up"
      setError(messageText)
      toast({
        title: "Top up gagal",
        description: messageText,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCryptoTopup = async () => {
    const parsedAmount = Number(amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount < 1000) {
      setError("Minimum 0.12 USDT (~Rp 1.900)")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const amountInUsd = Math.round((parsedAmount / USD_TO_IDR) * 100)

      if (amountInUsd < 12) {
        setError("Minimum payment 0.12 USDT")
        setIsSubmitting(false)
        return
      }

      await openCryptoCheckout(amountInUsd, selectedChain)

      const chainName = selectedChain === 56 ? "BNB Chain" : "Base"
      setMessage(`Payment link terbuka untuk ${chainName}`)

      setTimeout(() => {
        void loadOverview()
      }, 2000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Gagal membuat crypto payment"
      setError(errorMsg)
      toast({
        title: "Crypto payment gagal",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentBalance = overview?.balance ?? 0
  const topupMinimum = overview?.topupMinimum ?? 2000
  const freeCreditsGranted = Boolean(overview?.welcomeBonusGrantedAt)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Balance
            </CardTitle>
            <CardDescription>
              Saldo prompt yang dipakai untuk generate, plus top up via Pakasir atau Crypto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Current balance</p>
                <p className="text-3xl font-semibold text-foreground">{formatCurrency(currentBalance)}</p>
              </div>
              <Badge variant={freeCreditsGranted ? "secondary" : "outline"} className="shrink-0">
                {freeCreditsGranted
                  ? `Free credits bulan ini ${formatCurrency(overview?.welcomeBonusAmount || 5000)}`
                  : "Free credits bulan ini belum masuk"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoPill label="Minimum top up" value={formatCurrency(topupMinimum)} />
              <InfoPill label="Payment gateway" value="Pakasir + Crypto" />
              <InfoPill label="Free plan credits" value={formatCurrency(overview?.welcomeBonusAmount || 5000)} />
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Akun Free mendapat 5.000 credits per bulan. Bonus awal 5.000 credits diberikan saat pendaftaran. Setelah itu, top up bisa mulai dari Rp 2.000 (Pakasir) atau $1 USD (Crypto).
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Buy Top Up
            </CardTitle>
            <CardDescription>
              Pilih payment method, nominal, lalu checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method Tabs */}
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setPaymentMethod("pakasir")}
                className={cn(
                  "px-4 py-2 border-b-2 font-medium text-sm transition",
                  paymentMethod === "pakasir"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                💳 Pakasir (QRIS)
              </button>
              <button
                onClick={() => setPaymentMethod("crypto")}
                className={cn(
                  "px-4 py-2 border-b-2 font-medium text-sm transition flex items-center gap-1",
                  paymentMethod === "crypto"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Coins className="h-4 w-4" />
                Crypto (EVM)
              </button>
            </div>

            {/* Amount Selection */}
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant={String(quickAmount) === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(String(quickAmount))}
                >
                  {formatCurrency(quickAmount)}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Custom amount</label>
              <Input
                type="number"
                min={paymentMethod === "crypto" ? 1000 : 2000}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={paymentMethod === "crypto" ? "15800" : "2000"}
              />
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "crypto"
                  ? `Minimum 0.12 USDT (~Rp 1.900)`
                  : `Minimum Rp ${topupMinimum.toLocaleString("id-ID")}`}
              </p>
            </div>

            {/* Crypto Chain Selection */}
            {paymentMethod === "crypto" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pilih Network</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={selectedChain === 56 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChain(56)}
                  >
                    🟡 BNB Chain
                  </Button>
                  <Button
                    type="button"
                    variant={selectedChain === 8453 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChain(8453)}
                  >
                    ⚪ Base (ETH)
                  </Button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              onClick={paymentMethod === "pakasir" ? handleCreateTopup : handleCreateCryptoTopup}
              disabled={isSubmitting || isCryptoLoading || isLoading}
            >
              {isSubmitting || isCryptoLoading
                ? "Opening checkout..."
                : paymentMethod === "pakasir"
                  ? "Continue to Pakasir"
                  : "Pay with Crypto"}
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{message}</span>
              </div>
            )}

            {lastCheckoutUrl && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(lastCheckoutUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4" />
                Open payment link
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent top up orders</CardTitle>
            <CardDescription>
              Order yang dibuat ke Pakasir dan Crypto, plus status pembayaran terbarunya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <EmptyState text="Loading top up orders..." />
            ) : (overview?.topUpOrders.length || 0) === 0 ? (
              <EmptyState text="Belum ada order top up." />
            ) : (
              <div className="space-y-3">
                {overview?.topUpOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{order.reference}</p>
                          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                          <Badge variant="outline" className="text-xs">
                            {order.provider === "pakasir" ? "💳 QRIS" : "🪙 Crypto"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(order.amount)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Created {formatDate(order.createdAt)}</p>
                        {order.paidAt && <p>Paid {formatDate(order.paidAt)}</p>}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {order.paymentCode && (
                        <span className="rounded-full border border-border px-2 py-1">Code: {order.paymentCode}</span>
                      )}
                      {order.checkoutUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 px-2"
                          onClick={() => window.open(order.checkoutUrl || "", "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open checkout
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Balance ledger
            </CardTitle>
            <CardDescription>
              Riwayat perubahan saldo untuk bonus awal, credits bulanan, top up, usage, dan refund.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <EmptyState text="Loading balance ledger..." />
            ) : (overview?.billingTransactions.length || 0) === 0 ? (
              <EmptyState text="Belum ada transaksi saldo." />
            ) : (
              <div className="space-y-3">
                {overview?.billingTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-xl border border-border bg-card/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{transaction.kind.replace(/_/g, " ")}</p>
                          <Badge variant={transaction.direction === "credit" ? "secondary" : "destructive"}>
                            {transaction.direction === "credit" ? "+" : "-"}{formatCurrency(transaction.amount)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {transaction.description || transaction.reference || "Balance update"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border px-2 py-1">Before {formatCurrency(transaction.balanceBefore)}</span>
                      <span className="rounded-full border border-border px-2 py-1">After {formatCurrency(transaction.balanceAfter)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  )
}