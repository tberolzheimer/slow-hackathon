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
  title: "VibéShop — Find Your Vibe, Shop the Look",
  description:
    "VibéShop organizes hundreds of Julia Berolzheimer's styled outfits by aesthetic feeling. Find your vibe and shop it in minutes.",
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
          you to it. VibéShop organizes hundreds of Julia Berolzheimer&apos;s
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

      {/* How It Works — SB4: Plan */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-border/50">
        <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-10">
          How VibéShop Works
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

      {/* Editor's Note — SB7: Success + SB3: Authority */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          VibéShop draws from Julia Berolzheimer&apos;s Daily Looks archive —
          over 500 styled outfits photographed in Charleston, New York, and
          beyond. Each look is analyzed for color palette, fabric, silhouette,
          and mood, then grouped into vibes that capture a feeling, not just a
          category. Whether you&apos;re drawn to polished maximalism, smart
          denim, or vacation glamour, every outfit comes with direct product
          links so you can shop exactly what Julia wore. Updated daily as new
          looks are published.
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

async function VibeGrid() {
  await connection()
  const vibes = await prisma.vibe.findMany({
    where: { approvedAt: { not: null } },
    orderBy: { sortOrder: "asc" },
    include: {
      vibeAssignments: {
        take: 4,
        orderBy: { confidenceScore: "desc" },
        include: {
          post: {
            select: { outfitImageUrl: true, title: true },
          },
        },
      },
    },
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
      {vibes.map((vibe, i) => {
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
                    alt=""
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
