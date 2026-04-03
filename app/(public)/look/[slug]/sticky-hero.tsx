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
  const [scrolled, setScrolled] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only apply on mobile (< lg breakpoint)
    const mq = window.matchMedia("(max-width: 1023px)")
    if (!mq.matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel leaves viewport, shrink the hero
        setScrolled(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" } // account for header height
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Sentinel — when this scrolls out of view, hero shrinks */}
      <div ref={sentinelRef} className="lg:hidden h-0" />

      {/* Mobile: sticky shrinking hero */}
      <div
        className={`
          lg:hidden sticky top-16 z-30 bg-background transition-all duration-300 ease-out
          ${scrolled ? "py-2" : "py-0"}
        `}
      >
        <div
          className={`
            relative rounded-lg overflow-hidden mx-auto transition-all duration-300 ease-out
            ${scrolled ? "max-h-48 w-32" : "max-h-[600px] w-full"}
          `}
        >
          <Image
            src={src}
            alt={alt}
            width={800}
            height={1000}
            className={`
              w-full h-auto object-cover object-top transition-all duration-300
              ${scrolled ? "max-h-48" : ""}
            `}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        </div>
      </div>

      {/* Desktop: normal static image in the grid */}
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
