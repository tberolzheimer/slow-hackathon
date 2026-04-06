"use client"

import { Heart } from "lucide-react"
import { useHeart } from "@/lib/hooks/use-heart"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/analytics"

type ItemType = "look" | "product" | "vibe"

const SIZES = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const

interface HeartButtonProps {
  itemType: ItemType
  itemId: string
  size?: "sm" | "md" | "lg"
  showCount?: boolean
  count?: number
  className?: string
}

export function HeartButton({
  itemType,
  itemId,
  size = "md",
  showCount = false,
  count,
  className,
}: HeartButtonProps) {
  const { hearted, toggle, loading } = useHeart(itemType, itemId)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle().then(() => {
          if (!hearted) trackEvent("heart_saved", { itemType, itemId })
          window.dispatchEvent(new Event("hearts-changed"))
        })
      }}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1 transition-all",
        "hover:scale-110 active:scale-95",
        loading && "opacity-50",
        className
      )}
      aria-label={hearted ? "Remove from saves" : "Save"}
    >
      <Heart
        className={cn(
          SIZES[size],
          "transition-all duration-200",
          hearted
            ? "fill-primary text-primary animate-heart-pulse"
            : "fill-transparent text-muted-foreground/50 hover:text-muted-foreground drop-shadow-sm"
        )}
      />
      {showCount && count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  )
}
