"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getGuestHearts, getGuestHeartCount } from "@/lib/hearts/guest-hearts"

const BANNER_DISMISS_KEY = "vibeshop-return-banner-dismissed"

export function ReturnVisitBanner() {
  const { data: session } = useSession()
  const [visible, setVisible] = useState(false)
  const [heartCount, setHeartCount] = useState(0)

  useEffect(() => {
    // Don't show for logged-in users
    if (session?.user) return

    const hearts = getGuestHearts()
    if (hearts.length === 0) return

    // Check if oldest heart is >1 hour old (proxy for "return visit")
    const oldest = hearts.reduce(
      (min, h) => (h.createdAt < min ? h.createdAt : min),
      hearts[0].createdAt
    )
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    if (oldest > oneHourAgo) return // Hearts are too fresh — same session

    // Check if dismissed within 7 days
    const dismissed = localStorage.getItem(BANNER_DISMISS_KEY)
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      if (dismissedDate > sevenDaysAgo) return
    }

    setHeartCount(getGuestHeartCount())
    setVisible(true)
  }, [session])

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(BANNER_DISMISS_KEY, new Date().toISOString())
  }

  if (!visible) return null

  return (
    <div className="bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-foreground flex-1">
          Welcome back! You have{" "}
          <span className="font-medium">{heartCount} saved looks</span>. Sign up
          to keep them forever.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/saves">Save My Hearts</Link>
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
