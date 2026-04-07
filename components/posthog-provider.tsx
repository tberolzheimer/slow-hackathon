"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { initPostHog, identifyUser, trackEvent } from "@/lib/analytics"

export function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const posthogReady = useRef(false)

  // Defer PostHog initialization until first user interaction or 5s timeout
  useEffect(() => {
    const events = ["click", "scroll", "keydown", "touchstart"] as const
    let loaded = false

    function loadPostHog() {
      if (loaded) return
      loaded = true
      events.forEach((e) => window.removeEventListener(e, loadPostHog))
      initPostHog().then(() => {
        posthogReady.current = true
      })
    }

    events.forEach((e) =>
      window.addEventListener(e, loadPostHog, { once: true, passive: true })
    )
    const timer = setTimeout(loadPostHog, 5000) // fallback: load after 5s

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, loadPostHog))
    }
  }, [])

  // Track page views on route change (queued until PostHog is ready)
  useEffect(() => {
    if (typeof window === "undefined") return
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
    trackEvent("$pageview", { $current_url: url })
  }, [pathname, searchParams])

  // Identify logged-in users
  useEffect(() => {
    if (session?.user?.id) {
      identifyUser(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      })
    }
  }, [session])

  return null
}
