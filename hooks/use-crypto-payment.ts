import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface CryptoPaymentRequest {
  amountInUsd: number
  chainId: number
}

interface CryptoPaymentResponse {
  orderId: string
  reference: string
  checkoutUrl: string
  paymentAddress: string
  amountInToken: string
  chainId: number
  chainName: string
  expiresAt: string
}

export function useCryptoPayment() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const createPaymentRequest = async (
    amountInUsd: number,
    chainId: number
  ): Promise<CryptoPaymentResponse | null> => {
    if (!amountInUsd || amountInUsd < 12) {
      toast({
        title: "Invalid Amount",
        description: "Minimum payment is 0.12 USDT (~Rp 1.900)",
        variant: "destructive",
      })
      return null
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/billing/crypto/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInUsd,
          chainId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create payment request")
      }

      const data = (await response.json()) as CryptoPaymentResponse
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const openCheckout = async (
    amountInUsd: number,
    chainId: number
  ): Promise<void> => {
    const response = await createPaymentRequest(amountInUsd, chainId)
    if (response) {
      // Open checkout page in new window or redirect
      window.open(response.checkoutUrl, "_blank")
    }
  }

  return {
    isLoading,
    createPaymentRequest,
    openCheckout,
  }
}
