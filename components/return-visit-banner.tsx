"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getGuestHearts, getGuestHeartCount, clearGuestHearts } from "@/lib/hearts/guest-hearts"
import { createAccountFromEmail } from "@/lib/actions/auth"

const BANNER_DISMISS_KEY = "vibeshop-return-banner-dismissed"

export function ReturnVisitBanner() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [heartCount, setHeartCount] = useState(0)
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  useEffect(() => {
    if (session?.user) return
    if (pathname === "/saves") return

    const hearts = getGuestHearts()
    if (hearts.length === 0) return

    // Check if oldest heart is >1 hour old (proxy for "return visit")
    const oldest = hearts.reduce(
      (min, h) => (h.createdAt < min ? h.createdAt : min),
      hearts[0].createdAt
    )
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    if (oldest > oneHourAgo) return

    // Check if dismissed within 1 hour (same session)
    const dismissed = localStorage.getItem(BANNER_DISMISS_KEY)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const oneHourAgoDate = new Date(Date.now() - 60 * 60 * 1000)
      if (dismissedDate > oneHourAgoDate) return
    }

    setHeartCount(getGuestHeartCount())
    setVisible(true)
  }, [session, pathname])

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(BANNER_DISMISS_KEY, new Date().toISOString())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus("loading")
    try {
      const hearts = getGuestHearts().map((h) => ({
        itemType: h.itemType,
        itemId: h.itemId,
        createdAt: h.createdAt,
      }))
      const result = await createAccountFromEmail(email.trim(), hearts, "return_banner")
      if (result && "error" in result) {
        setStatus("error")
      } else {
        clearGuestHearts()
        setStatus("success")
        setTimeout(() => setVisible(false), 3000)
      }
    } catch {
      clearGuestHearts()
      setStatus("success")
      setTimeout(() => setVisible(false), 3000)
    }
  }

  if (!visible) return null

  return (
    <div className="bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {status === "success" ? (
          <div className="flex items-center gap-2 flex-1">
            <Check className="h-4 w-4 text-primary" />
            <p className="text-sm text-foreground font-medium">
              Your {heartCount} saves are synced!
            </p>
          </div>
        ) : showEmail ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-sm max-w-xs"
              required
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8" disabled={status === "loading"}>
              {status === "loading" ? "..." : "Save"}
            </Button>
            <button
              type="button"
              onClick={() => setShowEmail(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm text-foreground flex-1">
              Welcome back! You have{" "}
              <span className="font-medium">{heartCount} saved looks</span>. Sign up
              to keep them forever.
            </p>
            <Button size="sm" onClick={() => setShowEmail(true)}>
              Save My Hearts
            </Button>
          </>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
