import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Untuk eksplorasi dan prototipe awal.",
    cta: "Mulai Gratis",
    href: "/signup",
    features: [
      "5.000 credits per bulan",
      "Maksimal 3 project aktif",
      "Template dasar",
      "Komunitas support",
    ],
  },
  {
    name: "Starter",
    price: "$29",
    description: "Untuk solo builder yang butuh shipping cepat.",
    cta: "Pilih Starter",
    href: "/signup",
    features: [
      "1.000.000 credits per bulan",
      "Project tanpa batas",
      "Prioritas antrean generate",
      "Export project penuh",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$99",
    description: "Untuk tim kecil yang ingin scale workflow.",
    cta: "Pilih Pro",
    href: "/signup",
    features: [
      "5.000.000 credits per bulan",
      "Kolaborasi workspace",
      "Priority support",
      "Advanced usage insights",
    ],
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Pricing yang jelas dari awal</h1>
          <p className="mt-4 text-muted-foreground">
            Mulai gratis dengan 5.000 credits per bulan. Upgrade saat sudah dapat traction. Tidak ada biaya setup.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-primary shadow-lg" : undefined}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className="mt-6 block">
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
