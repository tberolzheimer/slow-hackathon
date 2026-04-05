"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Heart } from "lucide-react"
import { getGuestHeartCount } from "@/lib/hearts/guest-hearts"

export function HeartNavBadge() {
  const { data: session } = useSession()
  const [count, setCount] = useState(0)

  useEffect(() => {
    function updateCount() {
      if (session?.user) {
        // For logged-in users, fetch once on mount (not polling)
        import("@/lib/actions/hearts").then(({ getHeartCounts }) =>
          getHeartCounts().then((c) => setCount(c.total))
        )
      } else {
        setCount(getGuestHeartCount())
      }
    }

    // Initial load
    updateCount()

    // Event-driven updates only — no polling
    window.addEventListener("hearts-changed", updateCount)
    window.addEventListener("storage", updateCount)

    return () => {
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
