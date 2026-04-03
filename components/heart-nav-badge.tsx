"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Heart } from "lucide-react"
import { getGuestHeartCount } from "@/lib/hearts/guest-hearts"

export function HeartNavBadge() {
  const { data: session } = useSession()
  const [count, setCount] = useState(() => {
    if (typeof window !== "undefined") return getGuestHeartCount()
    return 0
  })

  useEffect(() => {
    function updateCount() {
      if (session?.user) {
        // For logged-in users, we could fetch from DB
        // For now, use a lightweight approach
        import("@/lib/actions/hearts").then(({ getHeartCounts }) =>
          getHeartCounts().then((c) => setCount(c.total))
        )
      } else {
        setCount(getGuestHeartCount())
      }
    }

    updateCount()

    // Poll for changes (guest hearts happen via localStorage)
    const interval = setInterval(updateCount, 2000)

    // Listen for heart changes from HeartButton
    window.addEventListener("hearts-changed", updateCount)
    // Also listen for storage events (cross-tab sync)
    window.addEventListener("storage", updateCount)

    return () => {
      clearInterval(interval)
      window.removeEventListener("hearts-changed", updateCount)
      window.removeEventListener("storage", updateCount)
    }
  }, [session])

  return (
    <Link
      href="/saves"
      className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={`My Saves${count > 0 ? ` (${count})` : ""}`}
    >
      <Heart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
