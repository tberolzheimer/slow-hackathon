"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, X, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAccountFromEmail } from "@/lib/actions/auth"
import { clearGuestHearts } from "@/lib/hearts/guest-hearts"
import { syncProfileToKlaviyo } from "@/lib/klaviyo/sync"

interface MatchCard {
  id: string
  slug: string
  displayTitle: string
  outfitImageUrl: string
  vibeName: string
  vibeSlug: string
}

type Screen = "hook" | "swipe" | "reveal" | "profile" | "share"

interface VibeScore {
  name: string
  slug: string
  count: number
  percentage: number
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

  // Calculate vibe scores from liked cards
  function calculateScores(): { vibes: VibeScore[]; similarity: number } {
    const vibeCounts: Record<string, { name: string; slug: string; count: number }> = {}
    for (const card of likedCards) {
      if (!vibeCounts[card.vibeSlug]) {
        vibeCounts[card.vibeSlug] = { name: card.vibeName, slug: card.vibeSlug, count: 0 }
      }
      vibeCounts[card.vibeSlug].count++
    }

    const total = likedCards.length || 1
    const vibes = Object.values(vibeCounts)
      .map((v) => ({
        ...v,
        percentage: Math.round((v.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    const similarity = Math.round((likedCards.length / totalCards) * 100)
    return { vibes, similarity }
  }

  function handleSwipe(liked: boolean) {
    const card = cards[currentCard]
    const newDecisions = [...allDecisions, liked]
    setAllDecisions(newDecisions)

    if (liked) {
      const newLiked = [...likedCards, card]
      setLikedCards(newLiked)

      // Micro-reward after 5 swipes
      if (newDecisions.length === 5) {
        const vibeCounts: Record<string, number> = {}
        for (const c of newLiked) {
          vibeCounts[c.vibeName] = (vibeCounts[c.vibeName] || 0) + 1
        }
        const topVibe = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1])[0]
        if (topVibe) {
          setMicroReward(`You're gravitating toward ${topVibe[0]}...`)
          setTimeout(() => setMicroReward(null), 3000)
        }
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
      // Create account with liked looks as hearts
      const hearts = likedCards.map((c) => ({
        itemType: "look" as const,
        itemId: c.slug,
        createdAt: new Date().toISOString(),
      }))
      await createAccountFromEmail(email.trim(), hearts)
    } catch {
      // signIn redirect throws — expected
    }

    // Sync Style Match data to Klaviyo
    try {
      const { syncProfileToKlaviyo } = await import("@/lib/klaviyo/sync")
      await syncProfileToKlaviyo(email.trim(), {
        heartedVibes: vibes.map((v) => v.name),
        heartCount: likedCards.length,
        topVibe: topVibe?.name || "",
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

    const { vibes, similarity } = calculateScores()
    const topVibe = vibes[0]

    // Canvas setup (1080x1920 for IG Stories)
    canvas.width = 1080
    canvas.height = 1920

    // Background
    ctx.fillStyle = "#FAF8F5"
    ctx.fillRect(0, 0, 1080, 1920)

    // Top accent line
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

    // Style DNA
    ctx.fillStyle = "#6b6560"
    ctx.font = "32px sans-serif"
    ctx.fillText("STYLE DNA", 540, 340)

    // Name
    ctx.fillStyle = "#1a1714"
    ctx.font = "italic 64px Georgia, serif"
    ctx.fillText(userName || "Your", 540, 460)

    // Match score
    ctx.font = "bold 180px sans-serif"
    ctx.fillStyle = "#c4787a"
    ctx.fillText(`${similarity}%`, 540, 700)

    ctx.fillStyle = "#6b6560"
    ctx.font = "36px sans-serif"
    ctx.fillText("Match with Julia", 540, 770)

    // Top vibe
    if (topVibe) {
      ctx.fillStyle = "#1a1714"
      ctx.font = "italic 56px Georgia, serif"
      ctx.fillText(topVibe.name, 540, 940)

      ctx.fillStyle = "#6b6560"
      ctx.font = "28px sans-serif"
      ctx.fillText(`${topVibe.percentage}% of your picks`, 540, 1000)
    }

    // Vibe bars
    let barY = 1100
    for (const vibe of vibes.slice(0, 4)) {
      ctx.fillStyle = "#6b6560"
      ctx.font = "24px sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(vibe.name, 200, barY)
      ctx.textAlign = "right"
      ctx.fillText(`${vibe.percentage}%`, 880, barY)

      // Bar background
      ctx.fillStyle = "#e8e4df"
      ctx.fillRect(200, barY + 10, 680, 12)
      // Bar fill
      ctx.fillStyle = "#c4787a"
      ctx.fillRect(200, barY + 10, (680 * vibe.percentage) / 100, 12)

      barY += 70
    }

    // CTA
    ctx.textAlign = "center"
    ctx.fillStyle = "#6b6560"
    ctx.font = "28px sans-serif"
    ctx.fillText("Find yours →", 540, 1700)
    ctx.font = "24px sans-serif"
    ctx.fillText("vibeshop.juliaberolzheimer.com/match", 540, 1750)

    // Download
    const link = document.createElement("a")
    link.download = "style-match.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const { vibes, similarity } = calculateScores()
  const topVibe = vibes[0]

  // ═══════════════════════════════════════
  // SCREEN 1: HOOK
  // ═══════════════════════════════════════
  if (screen === "hook") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-4 max-w-lg">
          How much of Julia&apos;s style is in your closet?
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          Swipe through 20 of her looks. We&apos;ll build your Style DNA.
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => setScreen("swipe")}>
          Start Swiping
        </Button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 2: SWIPE
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

        {/* Micro reward toast */}
        {microReward && (
          <div className="absolute top-20 left-4 right-4 z-50 text-center animate-in fade-in slide-in-from-top duration-300">
            <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
              {microReward}
            </div>
          </div>
        )}

        {/* Card */}
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="font-display text-2xl text-white mb-1">
                {card.displayTitle}
              </h2>
              <p className="text-sm text-white/70">{card.vibeName}</p>
            </div>
          </div>

          {/* Swipe buttons */}
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
  // SCREEN 3: REVEAL (teaser)
  // ═══════════════════════════════════════
  if (screen === "reveal") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Your Style DNA
        </p>

        {topVibe && (
          <div className="mb-8 w-full max-w-sm">
            <h2 className="font-display text-3xl text-foreground mb-2">
              {topVibe.name}
            </h2>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${topVibe.percentage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{topVibe.percentage}%</p>
          </div>
        )}

        <p className="text-lg text-foreground mb-2">
          You matched <span className="font-medium">{likedCards.length}</span> of {totalCards} looks
        </p>
        <p className="text-2xl font-display text-primary mb-8">
          {similarity}% Julia Match
        </p>

        <div className="w-full max-w-sm p-6 rounded-xl border border-border bg-card">
          <p className="text-sm text-foreground font-medium mb-1">
            Unlock Your Full Profile
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            See all your vibes + save your matched looks
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
              {emailStatus === "loading" ? "..." : "Unlock"}
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
            Your Style DNA
          </p>
          <h1 className="font-display text-4xl text-foreground mb-2">
            {topVibe?.name || "Your Vibe"}
          </h1>
          <p className="text-lg text-primary font-display">{similarity}% Julia Match</p>
        </div>

        {/* Vibe breakdown */}
        <div className="mb-10 space-y-4">
          {vibes.map((vibe) => (
            <div key={vibe.slug}>
              <div className="flex items-center justify-between text-sm mb-1">
                <Link
                  href={`/vibe/${vibe.slug}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {vibe.name}
                </Link>
                <span className="text-muted-foreground">{vibe.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${vibe.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Matched looks */}
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
          {topVibe && (
            <Button asChild size="lg">
              <Link href={`/vibe/${topVibe.slug}`}>
                Shop {topVibe.name} →
              </Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => setScreen("share")}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Your Results
          </Button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // SCREEN 5: SHARE CARD
  // ═══════════════════════════════════════
  return (
    <div className="max-w-md mx-auto px-4 py-8 text-center">
      <h2 className="font-display text-2xl text-foreground mb-4">
        Share Your Style DNA
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
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">VibéShop</p>
        <p className="font-display italic text-lg text-foreground mb-4">{userName || "Your"} Style DNA</p>
        <p className="text-4xl font-bold text-primary mb-1">{similarity}%</p>
        <p className="text-sm text-muted-foreground mb-4">Match with Julia</p>
        {topVibe && (
          <p className="font-display italic text-foreground">{topVibe.name}</p>
        )}
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
            navigator.clipboard?.writeText(
              `I'm ${similarity}% matched with Julia Berolzheimer's style! My top vibe: ${topVibe?.name}. Find yours → vibeshop.juliaberolzheimer.com/match`
            )
          }}
        >
          Copy Link
        </Button>
      </div>

      <Button variant="ghost" className="mt-4" onClick={() => setScreen("profile")}>
        ← Back to Profile
      </Button>

      {/* Hidden canvas for card generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
