"use client"

import { useState } from "react"
import { Share2, Link2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    handleCopy()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        className="gap-1.5"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="gap-1.5 text-muted-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">Copied</span>
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" />
            Copy Link
          </>
        )}
      </Button>
    </div>
  )
}
