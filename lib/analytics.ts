"use client"

let posthogModule: typeof import("posthog-js") | null = null
let initialized = false

export async function initPostHog() {
  if (initialized || typeof window === "undefined") return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  if (!posthogModule) {
    posthogModule = await import("posthog-js")
  }
  const posthog = posthogModule.default

  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
    capture_pageview: false,
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
