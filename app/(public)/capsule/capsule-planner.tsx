"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Sun, Utensils, MapPin, Coffee, Wine, Waves,
  ShoppingBag, Sparkles, Mountain, ArrowRight,
  Heart, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShareButtons } from "@/components/share-buttons"
import { generateCapsule } from "@/lib/actions/capsule"
import type { CapsuleResult } from "@/lib/ai/capsule-engine"
import { addGuestHeart, getGuestHearts, clearGuestHearts } from "@/lib/hearts/guest-hearts"
import { createAccountFromEmail } from "@/lib/actions/auth"

type Screen = "intro" | "destination" | "details" | "activities" | "generating" | "capsule"

// ═══════════════════════════════════════
// Destination options
// ═══════════════════════════════════════

const DESTINATIONS = [
  {
    key: "beach-resort",
    name: "Beach Resort",
    desc: "Sun, sand, and effortless glamour",
    emoji: "🏖️",
  },
  {
    key: "european-city",
    name: "European City",
    desc: "Cobblestones, espresso, and looking the part",
    emoji: "🇫🇷",
  },
  {
    key: "tropical-getaway",
    name: "Tropical Getaway",
    desc: "Bold prints meet island ease",
    emoji: "🌴",
  },
  {
    key: "countryside-retreat",
    name: "Countryside Retreat",
    desc: "Garden parties and golden-hour strolls",
    emoji: "🌿",
  },
  {
    key: "city-weekend",
    name: "City Weekend",
    desc: "Your favorite city, your best self",
    emoji: "🏙️",
  },
  {
    key: "mountain-escape",
    name: "Mountain Escape",
    desc: "Layers that work as hard as the view",
    emoji: "⛰️",
  },
]

// ═══════════════════════════════════════
// Activity options
// ═══════════════════════════════════════

const ACTIVITIES = [
  { key: "pool-days", label: "Poolside afternoons", icon: Sun },
  { key: "beach-walks", label: "Beach walks", icon: Waves },
  { key: "dinners-out", label: "Dinner reservations", icon: Utensils },
  { key: "sightseeing", label: "Walking all day", icon: MapPin },
  { key: "brunch", label: "Morning brunches", icon: Coffee },
  { key: "cocktails", label: "Cocktail hours", icon: Wine },
  { key: "shopping", label: "Shopping days", icon: ShoppingBag },
  { key: "special-evening", label: "A special evening", icon: Sparkles },
  { key: "active", label: "Trail exploring", icon: Mountain },
]

// ═══════════════════════════════════════
// Default activities by destination
// ═══════════════════════════════════════

const DEFAULT_ACTIVITIES: Record<string, string[]> = {
  "beach-resort": ["pool-days", "dinners-out", "beach-walks"],
  "european-city": ["sightseeing", "dinners-out", "cocktails"],
  "tropical-getaway": ["pool-days", "beach-walks", "dinners-out"],
  "countryside-retreat": ["brunch", "sightseeing", "dinners-out"],
  "city-weekend": ["sightseeing", "shopping", "dinners-out"],
  "mountain-escape": ["active", "brunch", "dinners-out"],
}

// ═══════════════════════════════════════
// Icon map for results
// ═══════════════════════════════════════

const ICON_MAP: Record<string, typeof Sun> = {
  sun: Sun,
  utensils: Utensils,
  "map-pin": MapPin,
  coffee: Coffee,
  wine: Wine,
  waves: Waves,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  mountain: Mountain,
}

function getCurrentSeason(): string {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) return "spring"
  if (month >= 5 && month <= 7) return "summer"
  if (month >= 8 && month <= 10) return "fall"
  return "winter"
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function CapsulePlanner() {
  const [screen, setScreen] = useState<Screen>("intro")
  const [destination, setDestination] = useState("")
  const [season, setSeason] = useState(getCurrentSeason())
  const [duration, setDuration] = useState("week")
  const [activities, setActivities] = useState<string[]>([])
  const [result, setResult] = useState<CapsuleResult | null>(null)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [savedAll, setSavedAll] = useState(false)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [capsuleEmail, setCapsuleEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success">("idle")
  const [expandedPacking, setExpandedPacking] = useState(false)

  // When destination changes, set default activities
  useEffect(() => {
    if (destination && activities.length === 0) {
      setActivities(DEFAULT_ACTIVITIES[destination] || [])
    }
  }, [destination]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleActivity(key: string) {
    setActivities((prev) =>
      prev.includes(key)
        ? prev.filter((a) => a !== key)
        : prev.length < 5
          ? [...prev, key]
          : prev
    )
  }

  async function handleGenerate() {
    setScreen("generating")

    const messages = [
      "Scanning 835 looks...",
      "Matching your vibe...",
      "Pulling the best pieces...",
      "Styling your capsule...",
    ]

    let i = 0
    setLoadingMessage(messages[0])
    const interval = setInterval(() => {
      i++
      if (i < messages.length) {
        setLoadingMessage(messages[i])
      }
    }, 600)

    try {
      const capsule = await generateCapsule({
        destinationType: destination,
        season,
        duration,
        activities,
      })
      clearInterval(interval)
      setResult(capsule)
      setScreen("capsule")
    } catch {
      clearInterval(interval)
      setLoadingMessage("Something went wrong. Please try again.")
    }
  }

  function handleSaveAll() {
    if (!result) return
    for (const section of result.sections) {
      for (const look of section.looks) {
        addGuestHeart("look", look.slug)
      }
    }
    window.dispatchEvent(new Event("hearts-changed"))
    setSavedAll(true)
    setShowEmailGate(true)
  }

  async function handleCapsuleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!capsuleEmail.trim()) return
    setEmailStatus("loading")
    try {
      const hearts = getGuestHearts().map((h) => ({
        itemType: h.itemType,
        itemId: h.itemId,
        createdAt: h.createdAt,
      }))
      await createAccountFromEmail(capsuleEmail.trim(), hearts)
      clearGuestHearts()
      setEmailStatus("success")
    } catch {
      clearGuestHearts()
      setEmailStatus("success")
    }
  }

  // ═══════════════════════════════════════
  // SCREEN 1: INTRO
  // ═══════════════════════════════════════
  if (screen === "intro") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center relative">
        <a
          href="/"
          className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All Vibes
        </a>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-6">
          Travel Capsule
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4 max-w-lg">
          Pack like Julia for your next trip
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Tell us where you&apos;re going. We&apos;ll pull the perfect
          capsule wardrobe from 835 styled looks.
        </p>
        <Button
          size="lg"
          className="text-lg px-8 py-6"
          onClick={() => setScreen("destination")}
        >
          Plan My Capsule
        </Button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 2: DESTINATION
  // ═══════════════════════════════════════
  if (screen === "destination") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col px-4 sm:px-6 py-8">
        <ProgressBar step={1} total={3} />
        <div className="max-w-lg mx-auto w-full flex-1">
          <h2 className="font-display text-2xl sm:text-3xl text-foreground text-center mb-2">
            Where are you headed?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Pick the trip that matches yours
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DESTINATIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setDestination(d.key)
                  setScreen("details")
                }}
                className={`text-left p-5 rounded-xl border transition-all hover:shadow-sm ${
                  destination === d.key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className="text-2xl mb-2 block">{d.emoji}</span>
                <p className="font-display text-lg text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 3: DETAILS (season + duration)
  // ═══════════════════════════════════════
  if (screen === "details") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col px-4 sm:px-6 py-8">
        <ProgressBar step={2} total={3} />
        <div className="max-w-lg mx-auto w-full flex-1">
          <h2 className="font-display text-2xl sm:text-3xl text-foreground text-center mb-8">
            Trip details
          </h2>

          {/* Season */}
          <div className="mb-8">
            <label className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3 block">
              What season?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["spring", "summer", "fall", "winter"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`py-3 rounded-lg border text-sm font-medium capitalize transition-all ${
                    season === s
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="mb-10">
            <label className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3 block">
              How long?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "weekend", label: "Weekend", sub: "4-6 looks" },
                { key: "week", label: "Full Week", sub: "10-14 looks" },
                { key: "extended", label: "Extended", sub: "14-18 looks" },
              ].map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDuration(d.key)}
                  className={`py-4 rounded-lg border text-center transition-all ${
                    duration === d.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className={`text-sm font-medium ${duration === d.key ? "text-primary" : "text-foreground"}`}>
                    {d.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => setScreen("activities")}
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <button
            onClick={() => setScreen("destination")}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground text-center w-full"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 4: ACTIVITIES
  // ═══════════════════════════════════════
  if (screen === "activities") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col px-4 sm:px-6 py-8">
        <ProgressBar step={3} total={3} />
        <div className="max-w-lg mx-auto w-full flex-1">
          <h2 className="font-display text-2xl sm:text-3xl text-foreground text-center mb-2">
            What will you be doing?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Pick 2-5 activities · we&apos;ll style each one
          </p>

          <div className="grid grid-cols-1 gap-2 mb-8">
            {ACTIVITIES.map((a) => {
              const selected = activities.includes(a.key)
              const Icon = a.icon
              return (
                <button
                  key={a.key}
                  onClick={() => toggleActivity(a.key)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                    {a.label}
                  </span>
                  {selected && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={activities.length < 2}
          >
            Build My Capsule
          </Button>

          {activities.length < 2 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Select at least 2 activities
            </p>
          )}

          <button
            onClick={() => setScreen("details")}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground text-center w-full"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 5: GENERATING
  // ═══════════════════════════════════════
  if (screen === "generating") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center">
        {/* Animated dots */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
        <p className="text-lg text-foreground font-display">{loadingMessage}</p>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 6: CAPSULE RESULTS
  // ═══════════════════════════════════════
  if (screen === "capsule" && result) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-3">
            Your Capsule
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-3">
            {result.tripName}
          </h1>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{result.totalLooks} looks</span>
            <span className="text-border">·</span>
            <span>{result.totalPieces} pieces</span>
            <span className="text-border">·</span>
            <span>{result.vibeBreakdown.length} vibes</span>
          </div>

          {/* Vibe pills */}
          {result.vibeBreakdown.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {result.vibeBreakdown.slice(0, 4).map((v) => (
                <Link
                  key={v.slug}
                  href={`/vibe/${v.slug}`}
                  className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {v.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Save all CTA + Email gate */}
        <div className="text-center mb-10">
          {!savedAll ? (
            <Button onClick={handleSaveAll} size="lg">
              <Heart className="h-4 w-4 mr-2" />
              Save This Capsule
            </Button>
          ) : showEmailGate && emailStatus !== "success" ? (
            <div className="max-w-sm mx-auto p-6 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground font-medium mb-1">
                {result.totalLooks} looks saved!
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Enter your email to keep this capsule across devices.
              </p>
              <form onSubmit={handleCapsuleEmailSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={capsuleEmail}
                  onChange={(e) => setCapsuleEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" disabled={emailStatus === "loading"}>
                  {emailStatus === "loading" ? "..." : "Save"}
                </Button>
              </form>
              <button
                onClick={() => setShowEmailGate(false)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="outline" size="lg" disabled>
                <Heart className="h-4 w-4 mr-2 fill-primary text-primary" />
                {emailStatus === "success" ? "Capsule Synced!" : `${result.totalLooks} Looks Saved`}
              </Button>
              {emailStatus !== "success" && (
                <p className="text-xs text-muted-foreground">
                  Saved locally.{" "}
                  <Link href="/saves" className="underline hover:text-foreground">
                    View in My Saves
                  </Link>{" "}
                  or sign up anytime to sync across devices.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sections by activity */}
        <div className="space-y-12">
          {result.sections.map((section) => {
            const Icon = ICON_MAP[section.icon] || MapPin
            return (
              <section key={section.activity}>
                <div className="flex items-center gap-2 mb-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl text-foreground">
                    {section.label}
                  </h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {section.looks.length} {section.looks.length === 1 ? "look" : "looks"}
                  </span>
                </div>

                {/* Horizontal scroll on mobile, grid on desktop */}
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                  {section.looks.map((look) => (
                    <div
                      key={look.postId}
                      className="flex-shrink-0 w-[280px] sm:w-auto"
                    >
                      {/* Outfit image */}
                      <Link
                        href={`/look/${look.slug}`}
                        className="block relative aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-3 group"
                      >
                        <Image
                          src={look.outfitImageUrl}
                          alt={look.displayTitle || "Outfit"}
                          fill
                          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 280px, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>

                      {/* Title + vibe */}
                      <Link href={`/look/${look.slug}`}>
                        <p className="font-display text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                          {look.displayTitle || "Styled Look"}
                        </p>
                      </Link>
                      {look.vibeName && (
                        <Link
                          href={`/vibe/${look.vibeSlug}`}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {look.vibeName}
                        </Link>
                      )}

                      {/* Products under the look */}
                      {look.products.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto">
                          {look.products.slice(0, 3).map((p) => (
                            <a
                              key={p.id}
                              href={p.affiliateUrl}
                              target="_blank"
                              rel="noopener sponsored"
                              className="flex-shrink-0 w-16 group/product"
                            >
                              {p.productImageUrl && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted mb-1">
                                  <Image
                                    src={p.productImageUrl}
                                    alt={p.itemName || "Product"}
                                    fill
                                    className="object-cover group-hover/product:brightness-90 transition-all"
                                    sizes="64px"
                                  />
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {p.brand || p.itemName}
                              </p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* Packing List */}
        {result.packingList.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <button
              onClick={() => setExpandedPacking(!expandedPacking)}
              className="flex items-center gap-2 mb-6 w-full text-left"
            >
              <h2 className="font-display text-xl text-foreground">
                Your Packing List
              </h2>
              <span className="text-xs text-muted-foreground">
                {result.packingList.length} pieces
              </span>
              <span className="ml-auto">
                {expandedPacking ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </button>

            {expandedPacking && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {result.packingList.map((p) => (
                  <a
                    key={p.id}
                    href={p.affiliateUrl}
                    target="_blank"
                    rel="noopener sponsored"
                    className="group p-3 rounded-xl border border-border hover:border-primary/40 transition-all"
                  >
                    {p.productImageUrl && (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        <Image
                          src={p.productImageUrl}
                          alt={p.itemName || "Product"}
                          fill
                          className="object-cover group-hover:brightness-95 transition-all"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                    <p className="text-sm text-foreground line-clamp-1">{p.itemName}</p>
                    {p.usedInLooks > 1 && (
                      <p className="text-[10px] text-primary mt-1">
                        Styled in {p.usedInLooks} looks
                      </p>
                    )}
                    <span className="inline-flex items-center text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                      Shop <ExternalLink className="h-3 w-3 ml-1" />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Bottom CTAs */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <ShareButtons title={result.tripName} />
          <Button
            variant="outline"
            onClick={() => {
              setScreen("destination")
              setResult(null)
              setActivities([])
              setSavedAll(false)
              setShowEmailGate(false)
              setEmailStatus("idle")
              setCapsuleEmail("")
            }}
          >
            Plan Another Trip
          </Button>
          <Link
            href="/saves"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View My Saves →
          </Link>
        </div>
      </div>
    )
  }

  return null
}

// ═══════════════════════════════════════
// Progress Bar
// ═══════════════════════════════════════

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="max-w-lg mx-auto w-full mb-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
