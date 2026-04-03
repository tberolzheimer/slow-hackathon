"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export function StickyHero({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  const [showThumbnail, setShowThumbnail] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only apply floating thumbnail on mobile
    const mq = window.matchMedia("(max-width: 1023px)")
    if (!mq.matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When hero image leaves viewport, show floating thumbnail
        setShowThumbnail(!entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (heroRef.current) {
      observer.observe(heroRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Mobile: hero scrolls naturally, no sticky */}
      <div ref={heroRef} className="lg:hidden">
        <div className="relative w-full rounded-lg overflow-hidden">
          <Image
            src={src}
            alt={alt}
            width={800}
            height={1000}
            className="w-full h-auto"
            priority
            sizes="100vw"
          />
        </div>
      </div>

      {/* Mobile: floating thumbnail appears after scrolling past hero */}
      {showThumbnail && (
        <div className="lg:hidden fixed top-20 left-4 z-40 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="w-16 h-20 rounded-lg overflow-hidden shadow-lg border border-border/50 bg-background">
            <Image
              src={src}
              alt={alt}
              width={64}
              height={80}
              className="w-full h-full object-cover object-top"
              sizes="64px"
            />
          </div>
        </div>
      )}

      {/* Desktop: sticky in the grid column */}
      <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
        <div className="relative w-full rounded-lg overflow-hidden">
          <Image
            src={src}
            alt={alt}
            width={800}
            height={1000}
            className="w-full h-auto"
            priority
            sizes="55vw"
          />
        </div>
      </div>
    </>
  )
}
