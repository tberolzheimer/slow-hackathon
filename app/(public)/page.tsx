import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { Suspense } from "react"
import { connection } from "next/server"
import { SearchBar } from "./search-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { HeartButton } from "@/components/heart-button"


export const metadata: Metadata = {
  title: "VibeShop — Find Your Vibe, Shop the Look",
  description:
    "VibeShop organizes hundreds of Julia Berolzheimer's styled outfits by aesthetic feeling. Find your vibe and shop it in minutes.",
}

export default function HomePage() {
  return (
    <div>
      {/* Hero — SB1: Character + SB2: Problem */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-4 text-center">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-foreground mb-6">
          Find your vibe. Shop the look.
        </h1>
        <p className="font-display italic text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          You know the feeling — you love a look but can&apos;t name what draws
          you to it. VibeShop organizes hundreds of Julia Berolzheimer&apos;s
          styled outfits by aesthetic feeling, so you can find your vibe and
          shop it in minutes.
        </p>
        <SearchBar />
      </section>

      {/* Vibe Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <Suspense fallback={<VibeGridSkeleton />}>
          <VibeGrid />
        </Suspense>
      </section>

      {/* Style Match CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/match"
          className="group block p-8 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-3">
            New
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-2">
            How much of Julia&apos;s style is yours?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe through 20 looks. Get your Style DNA in 60 seconds.
          </p>
          <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
            Take the Style Match →
          </span>
        </Link>
      </section>

      {/* Travel Capsule CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-10">
        <Link
          href="/capsule"
          className="group block p-8 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-3">
            Travel Capsule
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-2">
            Pack like Julia for your next trip
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tell us where you&apos;re going. We&apos;ll pull the perfect capsule wardrobe from her archive.
          </p>
          <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
            Plan My Capsule →
          </span>
        </Link>
      </section>

      {/* Most Worn CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-10">
        <Link
          href="/most-worn"
          className="group block p-8 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-3">
            Most Worn
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-2">
            Julia&apos;s wardrobe staples
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The bags, shoes, and jewelry she reaches for again and again across hundreds of looks.
          </p>
          <span className="inline-flex items-center text-sm font-medium text-primary group-hover:underline">
            See Most Worn Pieces →
          </span>
        </Link>
      </section>

      {/* How It Works — SB4: Plan */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-border/50">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-10">
          How VibeShop Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-2">
              Browse vibes
            </p>
            <p className="text-sm text-muted-foreground">
              Pick the aesthetic that matches your mood
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-2">
              Explore the looks
            </p>
            <p className="text-sm text-muted-foreground">
              See real outfits with every piece identified
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-2">
              Shop what you love
            </p>
            <p className="text-sm text-muted-foreground">
              Tap any product to buy it directly
            </p>
          </div>
        </div>
      </section>

      {/* Browse by Season */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Browse by Season
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Spring", "Summer", "Fall", "Winter"].map((season) => (
            <Link
              key={season}
              href={`/season/${season.toLowerCase()}`}
              className="text-center py-4 px-6 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <p className="font-display text-lg text-foreground">{season}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by Brand */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Browse by Brand
        </h2>
        <Suspense fallback={null}>
          <BrandPills />
        </Suspense>
      </section>

      {/* Style Guides */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Style Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { slug: "spring-wedding-guest-dresses", title: "Spring Wedding Guest Dresses" },
            { slug: "casual-spring-outfits", title: "Casual Spring Outfits" },
            { slug: "spring-work-outfits", title: "Spring Work Outfits" },
            { slug: "spring-capsule-wardrobe", title: "Spring Capsule Wardrobe" },
            { slug: "spring-brunch-outfit", title: "Spring Brunch Outfits" },
            { slug: "spring-date-night-outfit", title: "Spring Date Night Outfits" },
          ].map((guide) => (
            <Link
              key={guide.slug}
              href={`/style/${guide.slug}`}
              className="group block p-4 rounded-xl border border-border hover:border-primary/40 transition-all"
            >
              <p className="font-display text-base text-foreground group-hover:text-primary transition-colors">
                {guide.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Editor's Note — SB7: Success + SB3: Authority */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          835 outfits. Every piece identified. Every product linked.
          VibeShop organizes Julia Berolzheimer&apos;s entire Daily Looks
          archive by aesthetic feeling — not by date, not by season, but by
          the vibe that makes you stop scrolling. Whether you&apos;re drawn
          to polished maximalism, coastal ease, or the kind of layering that
          only works in October, every look comes with the exact pieces she
          reached for. Updated as new looks are published.
        </p>
      </section>
    </div>
  )
}

function VibeGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
      ))}
    </div>
  )
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() // 0-11
  if (month >= 2 && month <= 4) return "spring"
  if (month >= 5 && month <= 7) return "summer"
  if (month >= 8 && month <= 10) return "fall"
  return "winter"
}

async function VibeGrid() {
  await connection()
  const currentSeason = getCurrentSeason()

  const vibes = await prisma.vibe.findMany({
    where: { approvedAt: { not: null } },
    include: {
      vibeAssignments: {
        take: 4,
        orderBy: { confidenceScore: "desc" },
        include: {
          post: {
            select: { outfitImageUrl: true, title: true, season: true },
          },
        },
      },
      _count: { select: { vibeAssignments: true } },
    },
  })

  // Sort vibes by seasonal cycle: current season first, then upcoming seasons
  // e.g., in spring (April): spring → summer → fall → winter
  const SEASON_ORDER = ["spring", "summer", "fall", "winter"]
  const currentIdx = SEASON_ORDER.indexOf(currentSeason)
  // Build order: [spring, summer, fall, winter] rotated to start at current
  const seasonCycle = [
    ...SEASON_ORDER.slice(currentIdx),
    ...SEASON_ORDER.slice(0, currentIdx),
  ]

  // Determine each vibe's primary season from its posts
  const vibeSeasons = await prisma.$queryRaw<{ vibeId: string; season: string; cnt: bigint }[]>`
    SELECT va."vibeId", p.season, COUNT(*) as cnt
    FROM vibe_assignments va
    JOIN posts p ON p.id = va."postId"
    WHERE p.season IS NOT NULL
    GROUP BY va."vibeId", p.season
    ORDER BY va."vibeId", cnt DESC
  `
  // Map each vibe to its dominant season
  const vibePrimarySeason = new Map<string, string>()
  const seen = new Set<string>()
  for (const row of vibeSeasons) {
    if (!seen.has(row.vibeId)) {
      vibePrimarySeason.set(row.vibeId, row.season)
      seen.add(row.vibeId)
    }
  }

  // Sort: by season cycle position, then by look count within each season
  vibes.sort((a, b) => {
    const aSeason = vibePrimarySeason.get(a.id) || "winter"
    const bSeason = vibePrimarySeason.get(b.id) || "winter"
    const aOrder = seasonCycle.indexOf(aSeason)
    const bOrder = seasonCycle.indexOf(bSeason)
    if (aOrder !== bOrder) return aOrder - bOrder
    // Within same season, sort by look count descending
    return b._count.vibeAssignments - a._count.vibeAssignments
  })

  if (vibes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">
          Vibes are being curated. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {vibes.filter((v) => {
        // Only show vibes that have at least 3 images for the mosaic
        const imgCount = v.vibeAssignments.filter((a) => a.post.outfitImageUrl).length
        return imgCount >= 3
      }).map((vibe, i) => {
        const images = vibe.vibeAssignments
          .map((a) => a.post.outfitImageUrl)
          .filter(Boolean) as string[]

        return (
          <Link
            key={vibe.id}
            href={`/vibe/${vibe.slug}`}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted"
          >
            {/* Photo mosaic */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
              {images.slice(0, 4).map((src, j) => (
                <div
                  key={j}
                  className={`relative overflow-hidden ${
                    j === 0 ? "row-span-2" : ""
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${vibe.name} outfit`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
                    priority={i < 4}
                  />
                </div>
              ))}
            </div>

            {/* Gradient overlay + text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute top-3 right-3 z-10">
              <HeartButton itemType="vibe" itemId={vibe.slug} size="sm" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
              <h2 className="font-display text-2xl text-white mb-1">
                {vibe.name}
              </h2>
              {vibe.tagline && (
                <p className="text-sm text-white/80">{vibe.tagline}</p>
              )}
              <p className="text-xs text-white/60 mt-1">
                {vibe._count.vibeAssignments} looks
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

async function BrandPills() {
  await connection()
  const brands = await prisma.$queryRaw<{ brand: string; count: bigint }[]>`
    SELECT brand, COUNT(DISTINCT "postId") as count
    FROM products
    WHERE brand IS NOT NULL AND "isAlternative" = false
    GROUP BY brand
    HAVING COUNT(DISTINCT "postId") >= 3
    ORDER BY count DESC
    LIMIT 20
  `

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {brands.map((b) => (
        <Link
          key={b.brand}
          href={`/brand/${b.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
          className="px-4 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          {b.brand}
        </Link>
      ))}
    </div>
  )
}
