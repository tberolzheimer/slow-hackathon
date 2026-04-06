"use client"

import posthog from "posthog-js"

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === "undefined") return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key) return

  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      maskInputFn: (text, element) => {
        // Mask email inputs for privacy
        if (element?.getAttribute("type") === "email") return "***@***.com"
        return text
      },
    },
  })
  initialized = true
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return
  if (!initialized) initPostHog()
  posthog.capture(event, properties)
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return
  if (!initialized) initPostHog()
  posthog.identify(userId, properties)
}
