"use client"

import { Button } from "@/components/ui/button"

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 text-center">
      <h2 className="font-display text-2xl text-foreground mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        We hit a snag loading this page. Try refreshing, or head back to browse vibes.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to VibeShop
        </Button>
      </div>
    </div>
  )
}
