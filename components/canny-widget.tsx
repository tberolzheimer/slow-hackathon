"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { MessageCircle } from "lucide-react"

const CANNY_APP_ID = "69d466244c12aab7b4849bc6"

declare global {
  interface Window {
    Canny?: (...args: any[]) => void
  }
}

export function CannyWidget() {
  const { data: session } = useSession()

  // Load Canny SDK
  useEffect(() => {
    if (typeof window === "undefined") return
    if (document.getElementById("canny-jssdk")) return

    const script = document.createElement("script")
    script.id = "canny-jssdk"
    script.type = "text/javascript"
    script.async = true
    script.src = "https://sdk.canny.io/sdk.js"
    document.head.appendChild(script)
  }, [])

  // Identify user when logged in
  useEffect(() => {
    if (!session?.user || !window.Canny) return

    window.Canny("identify", {
      appID: CANNY_APP_ID,
      user: {
        email: session.user.email,
        name: session.user.name || session.user.email,
        id: session.user.id,
      },
    })
  }, [session])

  function handleClick() {
    if (window.Canny) {
      window.Canny("identify", {
        appID: CANNY_APP_ID,
        ...(session?.user
          ? {
              user: {
                email: session.user.email,
                name: session.user.name || session.user.email,
                id: session.user.id,
              },
            }
          : {}),
      })
    }
    // Open Canny in a new tab as fallback / primary
    window.open("https://vibeshop.canny.io", "_blank")
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background shadow-lg hover:opacity-90 transition-opacity text-sm font-medium"
      aria-label="Give feedback"
    >
      <MessageCircle className="h-4 w-4" />
      Feedback
    </button>
  )
}
