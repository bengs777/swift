"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor } from "lucide-react"

type ThemeSetting = "system" | "light" | "dark"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme">
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  const current: ThemeSetting = (theme || "system") as ThemeSetting
  const order: ThemeSetting[] = ["system", "light", "dark"]
  const idx = order.indexOf(current)
  const next = order[(idx + 1) % order.length]

  const icon =
    current === "light" ? (
      <Sun className="h-4 w-4" />
    ) : current === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    )

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Click to switch to ${next}`}
      onClick={() => setTheme(next)}
    >
      {icon}
    </Button>
  )
}
