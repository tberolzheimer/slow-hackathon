"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { initPostHog, identifyUser, trackEvent } from "@/lib/analytics"
import { clearGuestHearts } from "@/lib/hearts/guest-hearts"

export function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // Initialize PostHog immediately (dynamic import keeps it out of main bundle)
  useEffect(() => {
    initPostHog()
  }, [])

  // Track page views on route change
  useEffect(() => {
    if (typeof window === "undefined") return
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
    trackEvent("$pageview", { $current_url: url })
  }, [pathname, searchParams])

  // Identify logged-in users
  // Identify logged-in users + clean up guest hearts
  useEffect(() => {
    if (session?.user?.id) {
      identifyUser(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      })
      // Clear guest localStorage hearts — they've been merged to DB on signup
      clearGuestHearts()
    }
  }, [session])

  return null
}
