"use client"

import posthog from "posthog-js"

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === "undefined") return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key) return

  // TODO: Add a cookie consent banner before EU launch. Until then,
  // use memory persistence so PostHog doesn't set cookies without consent.
  // Once a consent banner is in place, switch to "localStorage+cookie" after
  // the user accepts, and call posthog.opt_in_capturing().
  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    persistence: "memory",
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
