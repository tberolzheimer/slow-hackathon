"use client"

import { useState } from "react"
import { ExternalLink, Check } from "lucide-react"

interface ShareButtonsProps {
  url?: string
  title: string
  text?: string
}

export function ShareButtons({ url, title, text }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "")
  const shareText = text || title

  async function handleShare() {
    // Use Web Share API on mobile (native share sheet)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl })
        return
      } catch {
        // User cancelled or API failed — fall through to copy
      }
    }
    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-muted hover:bg-muted/80 text-xs text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Share"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary">Copied</span>
        </>
      ) : (
        <>
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}
