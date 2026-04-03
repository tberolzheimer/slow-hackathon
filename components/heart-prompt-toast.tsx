"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { X, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getGuestHeartCount,
  shouldShowSignUpPrompt,
  dismissSignUpPrompt,
} from "@/lib/hearts/guest-hearts"

export function HeartPromptToast() {
  const { data: session } = useSession()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [heartCount, setHeartCount] = useState(0)

  useEffect(() => {
    // Don't show for logged-in users
    if (session?.user) return

    // Check periodically (hearts happen async)
    const check = () => {
      if (shouldShowSignUpPrompt()) {
        setHeartCount(getGuestHeartCount())
        setVisible(true)
      }
    }

    check()
    const interval = setInterval(check, 2000)
    return () => clearInterval(interval)
  }, [session])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      handleDismiss()
    }, 10000)
    return () => clearTimeout(timer)
  }, [visible])

  function handleDismiss() {
    setVisible(false)
    dismissSignUpPrompt()
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto lg:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
        <Heart className="h-5 w-5 text-primary fill-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {heartCount} looks saved! Create a free account to keep them forever.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => router.push("/sign-up")}
          >
            Save My Hearts
          </Button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
