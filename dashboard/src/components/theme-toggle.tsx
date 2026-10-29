import { MoonIcon, SunIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

type Theme = "light" | "dark"
const KEY = "tim-explorer-theme"

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    // storage blocked: fall through to the OS setting
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // not persisted; the toggle still works for this visit
    }
  }, [theme])

  const next = theme === "dark" ? "light" : "dark"
  return (
    <Button variant="ghost" size="icon" aria-label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
