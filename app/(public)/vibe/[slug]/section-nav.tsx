"use client"

import { useEffect, useState } from "react"

export function SectionNav({ productCount }: { productCount: number }) {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) {
      const offset = 140 // header + nav height
      const y = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  if (!isSticky) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-border/50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-10">
        <button
          onClick={() => scrollTo("the-looks")}
          className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
        >
          The Looks
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => scrollTo("shop-the-vibe")}
          className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
        >
          Shop the Vibe — {productCount} pieces
        </button>
      </div>
    </div>
  )
}
