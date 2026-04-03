"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, X, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAccountFromEmail } from "@/lib/actions/auth"
import { addGuestHeart, clearGuestHearts } from "@/lib/hearts/guest-hearts"

interface MatchCard {
  id: string
  slug: string
  displayTitle: string
  outfitImageUrl: string
  vibeName: string
  vibeSlug: string
}

type Screen = "hook" | "swipe" | "reveal" | "profile" | "share"

interface VibeResult {
  name: string
  slug: string
  count: number
}

export function StyleMatch({ cards }: { cards: MatchCard[] }) {
  const [screen, setScreen] = useState<Screen>("hook")
  const [currentCard, setCurrentCard] = useState(0)
  const [likedCards, setLikedCards] = useState<MatchCard[]>([])
  const [allDecisions, setAllDecisions] = useState<boolean[]>([])
  const [microReward, setMicroReward] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "done">("idle")
  const [userName, setUserName] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const totalCards = cards.length

  // Calculate top 3 vibes from liked cards
  function getTopVibes(): VibeResult[] {
    const vibeCounts: Record<string, { name: string; slug: string; count: number }> = {}
    for (const card of likedCards) {
      if (!vibeCounts[card.vibeSlug]) {
        vibeCounts[card.vibeSlug] = { name: card.vibeName, slug: card.vibeSlug, count: 0 }
      }
      vibeCounts[card.vibeSlug].count++
    }
    return Object.values(vibeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  function handleSwipe(liked: boolean) {
    const card = cards[currentCard]
    const newDecisions = [...allDecisions, liked]
    setAllDecisions(newDecisions)

    if (liked) {
      const newLiked = [...likedCards, card]
      setLikedCards(newLiked)

      // Auto-save to hearts
      addGuestHeart("look", card.slug)
      window.dispatchEvent(new Event("hearts-changed"))

      // Micro-reward after 5 swipes
      if (newDecisions.filter(Boolean).length === 3) {
        setMicroReward("Great eye!")
        setTimeout(() => setMicroReward(null), 2000)
      } else if (newDecisions.filter(Boolean).length === 8) {
        setMicroReward("You have amazing taste")
        setTimeout(() => setMicroReward(null), 2000)
      }
    }

    if (currentCard + 1 >= totalCards) {
      setScreen("reveal")
    } else {
      setCurrentCard(currentCard + 1)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setEmailStatus("loading")

    try {
      const hearts = likedCards.map((c) => ({
        itemType: "look" as const,
        itemId: c.slug,
        createdAt: new Date().toISOString(),
      }))
      await createAccountFromEmail(email.trim(), hearts)
    } catch {
      // signIn redirect throws — expected
    }

    // Sync to Klaviyo
    try {
      const topVibes = getTopVibes()
      const { syncProfileToKlaviyo } = await import("@/lib/klaviyo/sync")
      await syncProfileToKlaviyo(email.trim(), {
        heartedVibes: topVibes.map((v) => v.name),
        heartCount: likedCards.length,
        topVibe: topVibes[0]?.name || "",
      })
    } catch {
      // Non-blocking
    }

    setEmailStatus("done")
    setScreen("profile")
  }

  function generateShareCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const topVibes = getTopVibes()

    canvas.width = 1080
    canvas.height = 1920

    // Background
    ctx.fillStyle = "#FAF8F5"
    ctx.fillRect(0, 0, 1080, 1920)

    // Top accent
    ctx.fillStyle = "#c4787a"
    ctx.fillRect(0, 0, 1080, 6)

    // VibéShop
    ctx.fillStyle = "#1a1714"
    ctx.font = "48px Georgia, serif"
    ctx.textAlign = "center"
    ctx.fillText("VibéShop", 540, 200)

    // Divider
    ctx.fillStyle = "#e8e4df"
    ctx.fillRect(440, 250, 200, 1)

    // Name
    ctx.fillStyle = "#1a1714"
    ctx.font = "italic 56px Georgia, serif"
    ctx.fillText(userName ? `${userName}'s Style` : "My Style", 540, 380)

    // "has 3 sides"
    ctx.fillStyle = "#6b6560"
    ctx.font = "32px sans-serif"
    ctx.fillText("has 3 sides", 540, 440)

    // 3 archetypes
    let y = 580
    for (let i = 0; i < topVibes.length; i++) {
      const vibe = topVibes[i]

      // Number
      ctx.fillStyle = "#c4787a"
      ctx.font = "bold 120px Georgia, serif"
      ctx.fillText(`${i + 1}`, 540, y)

      // Name
      ctx.fillStyle = "#1a1714"
      ctx.font = "italic 48px Georgia, serif"
      ctx.fillText(vibe.name, 540, y + 60)

      y += 260
    }

    // CTA
    ctx.fillStyle = "#6b6560"
    ctx.font = "28px sans-serif"
    ctx.fillText("Discover yours →", 540, 1700)
    ctx.font = "24px sans-serif"
    ctx.fillText("vibeshop.juliaberolzheimer.com/match", 540, 1750)

    const link = document.createElement("a")
    link.download = "my-style.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const topVibes = getTopVibes()

  // ═══════════════════════════════════════
  // SCREEN 1: HOOK
  // ═══════════════════════════════════════
  if (screen === "hook") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4 max-w-lg">
          Which of Julia&apos;s aesthetics are yours?
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Swipe through 20 looks. We&apos;ll discover which sides of her style resonate with you most.
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => setScreen("swipe")}>
          Start Swiping
        </Button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 2: SWIPE (no vibe names, just gut reaction)
  // ═══════════════════════════════════════
  if (screen === "swipe" && currentCard < totalCards) {
    const card = cards[currentCard]
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col">
        {/* Progress */}
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {currentCard + 1} of {totalCards}
          </p>
          <div className="flex-1 mx-4 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentCard + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>

        {/* Micro reward */}
        {microReward && (
          <div className="absolute top-20 left-4 right-4 z-50 text-center animate-in fade-in slide-in-from-top duration-300">
            <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
              {microReward}
            </div>
          </div>
        )}

        {/* Card — no vibe name, just the photo + title */}
        <div className="flex-1 px-4 pb-4 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-lg">
            <Image
              src={card.outfitImageUrl}
              alt={card.displayTitle}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 90vw, 384px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="font-display text-xl text-white">
                {card.displayTitle}
              </h2>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-8 py-6">
            <button
              onClick={() => handleSwipe(false)}
              className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-8 w-8 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleSwipe(true)}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Heart className="h-8 w-8 text-primary-foreground fill-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 3: REVEAL — Top 3 Archetypes (no grades)
  // ═══════════════════════════════════════
  if (screen === "reveal") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Your Style
        </p>
        <h2 className="font-display text-3xl text-foreground mb-8">
          has {topVibes.length} {topVibes.length === 1 ? "side" : "sides"}
        </h2>

        {/* Top 3 archetype cards */}
        <div className="space-y-4 w-full max-w-sm mb-8">
          {topVibes.map((vibe, i) => (
            <div
              key={vibe.slug}
              className="p-4 rounded-xl border border-border bg-card text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-display text-primary">{i + 1}</span>
                <div>
                  <p className="font-display text-lg text-foreground">{vibe.name}</p>
                  <p className="text-xs text-muted-foreground">{vibe.count} looks matched</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          You saved {likedCards.length} looks to your favorites
        </p>

        {/* Email gate */}
        <div className="w-full max-w-sm p-6 rounded-xl border border-border bg-card">
          <p className="text-sm text-foreground font-medium mb-1">
            Don&apos;t lose your style profile
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Save your {likedCards.length} matched looks + see them all
          </p>
          <form onSubmit={handleEmailSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={emailStatus === "loading"}>
              {emailStatus === "loading" ? "..." : "Save My Style"}
            </Button>
          </form>
        </div>

        <button
          onClick={() => setScreen("profile")}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 4: FULL PROFILE
  // ═══════════════════════════════════════
  if (screen === "profile") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Your Style Archetypes
          </p>
          <h1 className="font-display text-3xl text-foreground mb-6">
            Your style has {topVibes.length} sides
          </h1>

          {/* Archetype cards */}
          <div className="space-y-4 text-left mb-8">
            {topVibes.map((vibe, i) => (
              <Link
                key={vibe.slug}
                href={`/vibe/${vibe.slug}`}
                className="group block p-5 rounded-xl border border-border hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-display text-primary">{i + 1}</span>
                  <div>
                    <p className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                      {vibe.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vibe.count} looks matched · Explore this vibe →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Liked looks grid */}
        <div className="mb-10">
          <h2 className="font-display text-xl text-foreground mb-4">
            Your Matched Looks ({likedCards.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {likedCards.map((card) => (
              <Link
                key={card.id}
                href={`/look/${card.slug}`}
                className="relative aspect-[3/4] rounded-lg overflow-hidden"
              >
                <Image
                  src={card.outfitImageUrl}
                  alt={card.displayTitle}
                  fill
                  className="object-cover hover:brightness-90 transition-all"
                  sizes="33vw"
                />
              </Link>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          {topVibes[0] && (
            <Button asChild size="lg">
              <Link href={`/vibe/${topVibes[0].slug}`}>
                Shop {topVibes[0].name} →
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => setScreen("share")}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Your Style
          </Button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 5: SHARE CARD (top 3 archetypes, no %)
  // ═══════════════════════════════════════
  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
      <h2 className="font-display text-2xl text-foreground mb-4">
        Share Your Style
      </h2>

      <div className="mb-4">
        <Input
          placeholder="Your name (for the card)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="text-center"
        />
      </div>

      {/* Preview */}
      <div className="bg-[#FAF8F5] rounded-xl p-8 mb-6 border border-border">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4">VibéShop</p>
        <p className="font-display italic text-lg text-foreground mb-1">
          {userName ? `${userName}'s Style` : "My Style"}
        </p>
        <p className="text-sm text-muted-foreground mb-6">has {topVibes.length} sides</p>
        <div className="space-y-3">
          {topVibes.map((vibe, i) => (
            <div key={vibe.slug} className="flex items-center gap-3 justify-center">
              <span className="text-xl font-display text-primary">{i + 1}</span>
              <span className="font-display italic text-foreground">{vibe.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={generateShareCard}>
          <Download className="h-4 w-4 mr-2" />
          Download Card
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            const vibeNames = topVibes.map((v) => v.name).join(", ")
            navigator.clipboard?.writeText(
              `My style has ${topVibes.length} sides: ${vibeNames}. Discover yours → vibeshop.juliaberolzheimer.com/match`
            )
          }}
        >
          Copy Link
        </Button>
      </div>

      <Button variant="ghost" className="mt-4" onClick={() => setScreen("profile")}>
        ← Back to Profile
      </Button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
