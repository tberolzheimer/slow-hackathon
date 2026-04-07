"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { X, Heart, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getGuestHeartCount,
  getGuestHearts,
  shouldShowSignUpPrompt,
  dismissSignUpPrompt,
  clearGuestHearts,
} from "@/lib/hearts/guest-hearts"
import { createAccountFromEmail } from "@/lib/actions/auth"
import { trackEvent } from "@/lib/analytics"

export function HeartPromptToast() {
  const { data: session, status: sessionStatus } = useSession()
  const [visible, setVisible] = useState(false)
  const [heartCount, setHeartCount] = useState(0)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (session?.user) return

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

  // No auto-dismiss — persist until user submits or manually dismisses

  function handleDismiss() {
    setVisible(false)
    dismissSignUpPrompt()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus("loading")
    try {
      const hearts = getGuestHearts().map((h) => ({
        itemType: h.itemType,
        itemId: h.itemId,
        createdAt: h.createdAt,
      }))

      const result = await createAccountFromEmail(email.trim(), hearts, "heart_prompt")
      if (result && "error" in result) {
        setErrorMsg(result.error || "Something went wrong")
        setStatus("error")
      } else {
        clearGuestHearts()
        setStatus("success")
        trackEvent("email_signup", { source: "heart_prompt", heartCount })
        setTimeout(() => setVisible(false), 3000)
      }
    } catch {
      clearGuestHearts()
      setStatus("success")
      trackEvent("email_signup", { source: "heart_prompt", heartCount })
      setTimeout(() => setVisible(false), 3000)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 lg:left-auto lg:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <Heart className="h-5 w-5 text-primary fill-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {status === "success" ? (
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <p className="text-sm text-foreground font-medium">
                  Your {heartCount} saves are synced!
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground mb-2">
                  {heartCount} looks saved! Enter your email to keep them forever.
                </p>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-8 text-sm flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? "..." : "Save"}
                  </Button>
                </form>
                {status === "error" && (
                  <p className="text-xs text-destructive mt-1">{errorMsg}</p>
                )}
              </>
            )}
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
    </div>
  )
}
