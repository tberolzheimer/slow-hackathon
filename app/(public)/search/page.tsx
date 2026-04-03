import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { SearchBar } from "../search-bar"
import { Badge } from "@/components/ui/badge"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — VibéShop Search` : "Find Your Look — VibéShop",
  }
}

interface LookResult {
  id: string
  slug: string
  title: string
  displayTitle: string | null
  outfitImageUrl: string | null
  matchContext: string
}

export default async function SearchPage({ searchParams }: Props) {
  await connection()
  const { q } = await searchParams
  const query = q?.trim() || ""

  let vibes: { id: string; name: string; slug: string; tagline: string | null }[] = []
  let looks: LookResult[] = []
  let products: {
    id: string
    brand: string | null
    itemName: string | null
    productImageUrl: string | null
    affiliateUrl: string
  }[] = []

  if (query) {
    const pattern = `%${query}%`

    // 1. Search vibes — show matching vibes as cards above everything
    vibes = await prisma.vibe.findMany({
      where: {
        approvedAt: { not: null },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { tagline: { contains: query, mode: "insensitive" } },
          { introText: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, tagline: true },
      take: 4,
    })

    // 2. Search looks via VisionData (garments, mood, season, formality, setting, keywords, styling notes)
    try {
      const visionResults = await prisma.$queryRaw<
        { id: string; slug: string; title: string; displayTitle: string | null; outfitImageUrl: string | null; date: Date; mood: string | null; season: string | null; setting: string | null; garments: string | null }[]
      >(Prisma.sql`
        SELECT DISTINCT p.id, p.slug, p.title, p."displayTitle", p."outfitImageUrl", p.date,
               v.mood, v.season, v.setting, v.garments::text as garments
        FROM posts p
        JOIN vision_data v ON v."postId" = p.id
        WHERE v.garments::text ILIKE ${pattern}
           OR v."vibeKeywords"::text ILIKE ${pattern}
           OR v.mood ILIKE ${pattern}
           OR v.season ILIKE ${pattern}
           OR v.formality ILIKE ${pattern}
           OR v.setting ILIKE ${pattern}
           OR v."stylingNotes" ILIKE ${pattern}
        ORDER BY p.date DESC
        LIMIT 20
      `)

      looks = visionResults.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        displayTitle: r.displayTitle,
        outfitImageUrl: r.outfitImageUrl,
        matchContext: buildMatchContext(r.garments, r.mood, r.season, r.setting, query),
      }))
    } catch {
      // Fallback to simple title search if raw query fails
    }

    // Search posts by product brand/name (e.g. "Chanel" finds looks featuring Chanel)
    try {
      const brandResults = await prisma.$queryRaw<
        { id: string; slug: string; title: string; displayTitle: string | null; outfitImageUrl: string | null; date: Date }[]
      >(Prisma.sql`
        SELECT DISTINCT p.id, p.slug, p.title, p."displayTitle", p."outfitImageUrl", p.date
        FROM posts p
        JOIN products pr ON pr."postId" = p.id
        WHERE pr.brand ILIKE ${pattern} OR pr."itemName" ILIKE ${pattern} OR pr."rawText" ILIKE ${pattern}
        ORDER BY p.date DESC
        LIMIT 20
      `)
      const existingBrandIds = new Set(looks.map((l) => l.id))
      for (const r of brandResults) {
        if (!existingBrandIds.has(r.id)) {
          looks.push({
            id: r.id,
            slug: r.slug,
            title: r.title,
            displayTitle: r.displayTitle,
            outfitImageUrl: r.outfitImageUrl,
            matchContext: `Features ${query} products`,
          })
        }
      }
    } catch {
      // Non-critical
    }

    // Also search by post title / displayTitle (catches things VisionData might miss)
    const titleResults = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { displayTitle: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, title: true, displayTitle: true, outfitImageUrl: true },
      take: 10,
      orderBy: { date: "desc" },
    })

    // Merge title results into looks (deduplicate by id)
    const existingIds = new Set(looks.map((l) => l.id))
    for (const r of titleResults) {
      if (!existingIds.has(r.id)) {
        looks.push({
          id: r.id,
          slug: r.slug,
          title: r.title,
          displayTitle: r.displayTitle,
          outfitImageUrl: r.outfitImageUrl,
          matchContext: "",
        })
      }
    }

    // 3. Search products by brand or item name
    const rawProducts = await prisma.product.findMany({
      where: {
        isAlternative: false,
        productImageUrl: { not: null },
        OR: [
          { brand: { contains: query, mode: "insensitive" } },
          { itemName: { contains: query, mode: "insensitive" } },
          { rawText: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        brand: true,
        itemName: true,
        rawText: true,
        productImageUrl: true,
        affiliateUrl: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    })

    // Deduplicate products
    const seen = new Set<string>()
    products = rawProducts
      .filter((p) => {
        const key = `${(p.brand || "").toLowerCase()}-${(p.itemName || "").toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 24)
  }

  const hasResults = vibes.length > 0 || looks.length > 0 || products.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← All Vibes
      </Link>
      <div className="max-w-xl mx-auto mb-12 mt-6">
        <h1 className="font-display text-3xl text-foreground text-center mb-6">
          Find your look
        </h1>
        <SearchBar />
      </div>

      {query && (
        <div>
          {!hasResults && (
            <p className="text-center text-muted-foreground text-lg py-12">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Matching Vibes */}
          {vibes.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display text-xl text-foreground mb-4">
                Vibes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vibes.map((vibe) => (
                  <Link
                    key={vibe.id}
                    href={`/vibe/${vibe.slug}`}
                    className="group block p-5 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors">
                      {vibe.name}
                    </h3>
                    {vibe.tagline && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {vibe.tagline}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Matching Looks */}
          {looks.length > 0 && (
            <section className="mb-12">
              <h2 className="font-display text-xl text-foreground mb-4">
                Looks ({looks.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {looks.map(
                  (look) =>
                    look.outfitImageUrl && (
                      <Link
                        key={look.id}
                        href={`/look/${look.slug}`}
                        className="group block"
                      >
                        <div className="rounded-lg overflow-hidden mb-2">
                          <Image
                            src={look.outfitImageUrl}
                            alt={look.displayTitle || look.title}
                            width={300}
                            height={375}
                            className="w-full h-auto object-cover group-hover:brightness-90 transition-all"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        </div>
                        <p className="text-sm text-foreground">
                          {look.displayTitle || look.title}
                        </p>
                        {look.matchContext && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {look.matchContext}
                          </p>
                        )}
                      </Link>
                    )
                )}
              </div>
            </section>
          )}

          {/* Matching Products */}
          {products.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-foreground mb-4">
                Products ({products.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {products.map((product) => (
                  <a
                    key={product.id}
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener sponsored"
                    className="group block"
                  >
                    {product.productImageUrl && (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        <Image
                          src={product.productImageUrl}
                          alt={product.brand || "Product"}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                    )}
                    {product.brand && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {product.brand}
                      </p>
                    )}
                    {product.itemName && (
                      <p className="text-sm text-foreground">
                        {product.itemName}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Build a short context string showing WHY this look matched the query.
 * e.g., "Yellow silk blouse · Spring · Garden"
 */
function buildMatchContext(
  garmentsJson: string | null,
  mood: string | null,
  season: string | null,
  setting: string | null,
  query: string
): string {
  const parts: string[] = []
  const q = query.toLowerCase()

  // Check garments for matching pieces
  if (garmentsJson) {
    try {
      const garments = JSON.parse(garmentsJson) as {
        type?: string
        colorName?: string
        fabric?: string
        pattern?: string
      }[]
      for (const g of garments) {
        const desc = [g.colorName, g.fabric, g.type].filter(Boolean).join(" ")
        if (desc.toLowerCase().includes(q)) {
          parts.push(desc.charAt(0).toUpperCase() + desc.slice(1))
          break // Just show the first matching garment
        }
      }
    } catch {
      // garments might not be valid JSON string
    }
  }

  // Add mood/season/setting if they match
  if (mood && mood.toLowerCase().includes(q)) {
    parts.push(mood.charAt(0).toUpperCase() + mood.slice(1))
  }
  if (season && season.toLowerCase().includes(q)) {
    parts.push(season.charAt(0).toUpperCase() + season.slice(1))
  }
  if (setting && setting.toLowerCase().includes(q)) {
    parts.push(setting.charAt(0).toUpperCase() + setting.slice(1))
  }

  return parts.join(" · ")
}
