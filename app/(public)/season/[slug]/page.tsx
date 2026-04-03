import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { HeartButton } from "@/components/heart-button"


const SEASONS = ["spring", "summer", "fall", "winter"] as const
const SEASON_DESCRIPTIONS: Record<string, { tagline: string; description: string }> = {
  spring: {
    tagline: "Layers that come off by noon",
    description: "Spring in Julia's wardrobe means light knits over silk, trench coats left unbuttoned, and the first appearance of sandals. These are the looks for the woman who knows the season is a feeling, not a date on the calendar.",
  },
  summer: {
    tagline: "Sun on your shoulders, everywhere to be",
    description: "Summer dressing is about one confident choice — a print that does all the work, a silhouette that moves with you, colors that look like you just stepped off a boat in Capri. Julia's summer looks are vacation energy, every single day.",
  },
  fall: {
    tagline: "She walks through golden leaves like she owns the season",
    description: "Fall is when Julia's wardrobe gets its richest — layered textures, warm palettes, boots that mean business. These are the outfits for the woman who treats getting dressed in October like an art form.",
  },
  winter: {
    tagline: "She commands every room before she even speaks",
    description: "Winter dressing is about presence. Bold coats, rich fabrics, statement pieces that earn their place in a smaller rotation. These are the looks Julia reaches for when the days are short and the stakes are high.",
  },
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return SEASONS.map((s) => ({ slug: s }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const season = slug.charAt(0).toUpperCase() + slug.slice(1)
  const desc = SEASON_DESCRIPTIONS[slug]
  return {
    title: `${season} Outfits — VibéShop by Julia Berolzheimer`,
    description: desc?.description.slice(0, 160) || `${season} outfit inspiration from Julia Berolzheimer's Daily Looks.`,
  }
}

export default async function SeasonPage({ params }: Props) {
  await connection()
  const { slug } = await params

  if (!SEASONS.includes(slug as typeof SEASONS[number])) notFound()

  const seasonName = slug.charAt(0).toUpperCase() + slug.slice(1)
  const desc = SEASON_DESCRIPTIONS[slug]

  // Get posts for this season
  const posts = await prisma.post.findMany({
    where: { season: slug },
    select: {
      id: true,
      slug: true,
      title: true,
      displayTitle: true,
      outfitImageUrl: true,
      date: true,
      products: {
        where: { isAlternative: false, productImageUrl: { not: null } },
        take: 3,
        select: {
          id: true,
          brand: true,
          itemName: true,
          rawText: true,
          productImageUrl: true,
          affiliateUrl: true,
        },
      },
    },
    orderBy: { date: "desc" },
  })

  // Aggregate products
  const seen = new Set<string>()
  const allProducts = posts
    .flatMap((p) => p.products)
    .filter((p) => {
      const key = `${p.brand}-${p.itemName}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Season
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-3">
          {seasonName}
        </h1>
        {desc && (
          <>
            <p className="font-display italic text-lg text-muted-foreground mb-4">
              {desc.tagline}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {desc.description}
            </p>
          </>
        )}
        <p className="text-sm text-muted-foreground mt-4">
          {posts.length} looks
        </p>
      </div>

      {/* Outfit Grid */}
      <section className="mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {posts.slice(0, 24).map((post) =>
            post.outfitImageUrl ? (
              <div key={post.id} className="relative">
                <Link
                  href={`/look/${post.slug}`}
                  className="group block rounded-lg overflow-hidden"
                >
                  <Image
                    src={post.outfitImageUrl}
                    alt={post.displayTitle || post.title}
                    width={400}
                    height={500}
                    className="w-full h-auto object-cover group-hover:brightness-90 transition-all"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </Link>
                <div className="absolute top-2 right-2">
                  <HeartButton itemType="look" itemId={post.slug} size="sm" />
                </div>
                <p className="text-sm text-foreground mt-2 truncate">
                  {post.displayTitle || post.title}
                </p>
              </div>
            ) : null
          )}
        </div>
      </section>

      {/* Products */}
      {allProducts.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-foreground mb-6">
            Shop {seasonName} — {allProducts.length} pieces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {allProducts.slice(0, 16).map((product) => (
              <a
                key={product.id}
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener sponsored"
                className="group block"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                  <Image
                    src={product.productImageUrl!}
                    alt={product.rawText || "Product"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                {product.brand && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {product.brand}
                  </p>
                )}
                <p className="text-sm text-foreground truncate">
                  {product.itemName || product.rawText}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Other Seasons */}
      <section>
        <h2 className="font-display text-xl text-foreground mb-4">
          Explore other seasons
        </h2>
        <div className="flex flex-wrap gap-2">
          {SEASONS.filter((s) => s !== slug).map((s) => (
            <Link
              key={s}
              href={`/season/${s}`}
              className="px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
