"use client"

let posthogModule: typeof import("posthog-js") | null = null
let initialized = false

export async function initPostHog() {
  if (initialized || typeof window === "undefined") return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key) return

  if (!posthogModule) {
    posthogModule = await import("posthog-js")
  }
  const posthog = posthogModule.default

  // TODO: Add a cookie consent banner before EU launch. Until then,
  // use memory persistence so PostHog doesn't set cookies without consent.
  // Once a consent banner is in place, switch to "localStorage+cookie" after
  // the user accepts, and call posthog.opt_in_capturing().
  posthog.init(key, {
    api_host: host || "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com", // Required when using reverse proxy
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
    capture_pageview: false, // We fire pageviews manually in PostHogProvider
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: false,
      maskInputFn: (text, element) => {
        if (element?.getAttribute("type") === "email") return "***@***.com"
        return text
      },
    },
  })
  initialized = true
}

export async function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return
  if (!initialized) await initPostHog()
  if (!posthogModule) return
  posthogModule.default.capture(event, properties)
}

export async function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return
  if (!initialized) await initPostHog()
  if (!posthogModule) return
  posthogModule.default.identify(userId, properties)
}
