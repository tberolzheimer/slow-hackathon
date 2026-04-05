import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { SearchBar } from "../search-bar"
import { HeartButton } from "@/components/heart-button"

// ─── Synonym expansion map ────────────────────────────────────────
// When a user types a key, we also search for all its synonyms.
const SYNONYM_MAP: Record<string, string[]> = {
  skirt: ["midi skirt", "maxi skirt", "mini skirt", "pleated skirt", "wrap skirt", "a-line skirt"],
  dress: ["midi dress", "maxi dress", "sundress", "wrap dress", "mini dress", "shirt dress", "slip dress"],
  pants: ["wide-leg pants", "trousers", "jeans", "slacks", "chinos", "culottes"],
  flats: ["ballet flats", "loafers", "mules", "espadrilles"],
  heels: ["pumps", "sandals", "slingback", "stilettos", "kitten heels", "block heels"],
  bag: ["handbag", "tote bag", "crossbody bag", "clutch", "shoulder bag"],
  vacation: ["travel", "resort", "beach", "tropical", "getaway"],
  wedding: ["formal", "evening", "polished", "romantic", "black tie", "cocktail"],
  casual: ["relaxed", "effortless", "weekend", "laid-back", "easy"],
  work: ["office", "professional", "polished", "tailored", "corporate", "business"],
  "date night": ["romantic", "evening", "polished", "sultry", "dinner"],
  summer: ["warm weather", "sunny", "tropical", "lightweight"],
  winter: ["cold weather", "layered", "cozy", "knit"],
  spring: ["fresh", "floral", "pastel", "light layers"],
  fall: ["autumn", "layered", "warm tones", "transitional"],
  blazer: ["jacket", "sport coat", "suit jacket"],
  sweater: ["knit", "pullover", "cardigan", "turtleneck"],
  top: ["blouse", "shirt", "tee", "tank", "camisole"],
  boots: ["ankle boots", "knee-high boots", "booties", "chelsea boots"],
  coat: ["overcoat", "trench", "parka", "jacket"],
  jewelry: ["necklace", "bracelet", "earrings", "ring", "accessories"],
}

// Build reverse map so synonyms also expand to their parent
const EXPANDED_SYNONYMS: Record<string, string[]> = {}
for (const [key, values] of Object.entries(SYNONYM_MAP)) {
  // The key itself expands to all its synonyms
  EXPANDED_SYNONYMS[key] = values
  // Each synonym also expands to the parent key (but not sibling synonyms, to avoid explosion)
  for (const v of values) {
    const lower = v.toLowerCase()
    if (!EXPANDED_SYNONYMS[lower]) {
      EXPANDED_SYNONYMS[lower] = []
    }
    if (!EXPANDED_SYNONYMS[lower].includes(key)) {
      EXPANDED_SYNONYMS[lower].push(key)
    }
  }
}

// ─── Stop words to skip ───────────────────────────────────────────
const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "for", "with", "and", "or", "of", "to", "is", "it", "at", "by",
])

// ─── Search fields in vision_data ─────────────────────────────────
const VISION_FIELDS = [
  "mood",
  "season",
  "formality",
  "setting",
  `"vibeKeywords"::text`,
  "garments::text",
  `"stylingNotes"`,
] as const

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — VibeShop Search` : "Find Your Look — VibeShop",
  }
}

interface LookResult {
  id: string
  slug: string
  title: string
  displayTitle: string | null
  outfitImageUrl: string | null
  matchContext: string
  score: number
}

/**
 * Split the user query into individual search words, dropping stop words.
 * Also preserves multi-word phrases that appear in the synonym map (e.g. "date night").
 */
function extractSearchTerms(query: string): string[] {
  const lower = query.toLowerCase().trim()
  if (!lower) return []

  const terms: string[] = []

  // First check for multi-word synonym keys (e.g. "date night")
  let remaining = lower
  for (const key of Object.keys(SYNONYM_MAP)) {
    if (key.includes(" ") && remaining.includes(key)) {
      terms.push(key)
      remaining = remaining.replace(key, " ").trim()
    }
  }

  // Split remaining text into single words and filter stop words
  const words = remaining.split(/\s+/).filter((w) => w.length > 0 && !STOP_WORDS.has(w))
  terms.push(...words)

  return [...new Set(terms)] // deduplicate
}

/**
 * Very simple stemming: produce both singular and plural forms so
 * "skirts" also checks "skirt" and synonym map lookup works both ways.
 */
function stemVariants(word: string): string[] {
  const variants = [word]
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes") ||
      word.endsWith("ches") || word.endsWith("shes")) {
    // "dresses" → "dress", "boxes" → "box"
    variants.push(word.slice(0, -2))
  } else if (word.endsWith("ies") && word.length > 4) {
    // "parties" → "party"
    variants.push(word.slice(0, -3) + "y")
  } else if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    // "skirts" → "skirt"
    variants.push(word.slice(0, -1))
  }
  // Add plural if not already plural
  if (!word.endsWith("s")) {
    variants.push(word + "s")
  }
  return [...new Set(variants)]
}

/**
 * Expand search terms with synonyms.
 * Returns all terms to search for (original + expanded).
 * Also tries singular/plural variants for synonym lookup.
 */
function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set<string>()
  for (const term of terms) {
    // Add the term itself plus its stem variants
    const variants = stemVariants(term)
    for (const v of variants) {
      expanded.add(v)
      // Check synonym map for each variant
      const synonyms = EXPANDED_SYNONYMS[v]
      if (synonyms) {
        for (const s of synonyms) {
          expanded.add(s)
        }
      }
    }
  }
  return [...expanded]
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
    const searchTerms = extractSearchTerms(query)
    const allTerms = expandWithSynonyms(searchTerms)

    // 1. Search vibes — use word-level matching too
    const vibeOrConditions: Prisma.VibeWhereInput[] = []
    for (const term of allTerms) {
      vibeOrConditions.push(
        { name: { contains: term, mode: "insensitive" } },
        { tagline: { contains: term, mode: "insensitive" } },
        { introText: { contains: term, mode: "insensitive" } },
      )
    }
    vibes = await prisma.vibe.findMany({
      where: {
        approvedAt: { not: null },
        OR: vibeOrConditions,
      },
      select: { id: true, name: true, slug: true, tagline: true },
      take: 4,
    })

    // 2. Search looks via VisionData — word-level matching with relevance scoring
    try {
      // Build a SQL WHERE clause: match ANY expanded term in ANY field
      // We search vision_data fields + product brand/itemName in a single scored query
      const whereFragments: Prisma.Sql[] = []
      for (const term of allTerms) {
        const pattern = `%${term}%`
        for (const field of VISION_FIELDS) {
          whereFragments.push(
            Prisma.sql`v.${Prisma.raw(field)} ILIKE ${pattern}`
          )
        }
      }

      // Build per-original-term score expressions
      // Each original search term that matches contributes 1 to the score
      const scoreFragments: Prisma.Sql[] = []
      for (const term of searchTerms) {
        // Get this term + its stem variants + all their synonyms
        const variants = stemVariants(term)
        const termGroupSet = new Set<string>(variants)
        for (const v of variants) {
          const synonyms = EXPANDED_SYNONYMS[v]
          if (synonyms) {
            for (const s of synonyms) termGroupSet.add(s)
          }
        }
        const termConditions: Prisma.Sql[] = []
        for (const t of termGroupSet) {
          const pat = `%${t}%`
          for (const field of VISION_FIELDS) {
            termConditions.push(
              Prisma.sql`v.${Prisma.raw(field)} ILIKE ${pat}`
            )
          }
        }
        // CASE WHEN (any match for this term group) THEN 1 ELSE 0 END
        scoreFragments.push(
          Prisma.sql`CASE WHEN (${Prisma.join(termConditions, " OR ")}) THEN 1 ELSE 0 END`
        )
      }

      const scoreExpr =
        scoreFragments.length > 0
          ? Prisma.join(scoreFragments, " + ")
          : Prisma.sql`1`

      const whereClause = Prisma.join(whereFragments, " OR ")

      const visionResults = await prisma.$queryRaw<
        {
          id: string
          slug: string
          title: string
          displayTitle: string | null
          outfitImageUrl: string | null
          date: Date
          mood: string | null
          season: string | null
          setting: string | null
          formality: string | null
          garments: string | null
          vibeKeywords: string | null
          stylingNotes: string | null
          score: number
        }[]
      >(Prisma.sql`
        SELECT DISTINCT ON (p.id)
               p.id, p.slug, p.title, p."displayTitle", p."outfitImageUrl", p.date,
               v.mood, v.season, v.setting, v.formality,
               v.garments::text as garments,
               v."vibeKeywords"::text as "vibeKeywords",
               v."stylingNotes",
               (${scoreExpr}) as score
        FROM posts p
        JOIN vision_data v ON v."postId" = p.id
        WHERE (${whereClause})
        ORDER BY p.id, (${scoreExpr}) DESC
      `)

      // Sort by score descending, then by date descending
      visionResults.sort((a, b) => {
        if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score)
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })

      looks = visionResults.slice(0, 40).map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        displayTitle: r.displayTitle,
        outfitImageUrl: r.outfitImageUrl,
        matchContext: buildMatchContext(r, searchTerms, allTerms),
        score: Number(r.score),
      }))
    } catch (e) {
      console.error("VisionData search failed:", e)
      // Fallback handled below
    }

    // 3. Search posts by product brand/name — also word-level
    try {
      const productWhereFragments: Prisma.Sql[] = []
      for (const term of allTerms) {
        const pattern = `%${term}%`
        productWhereFragments.push(
          Prisma.sql`pr.brand ILIKE ${pattern}`,
          Prisma.sql`pr."itemName" ILIKE ${pattern}`,
          Prisma.sql`pr."rawText" ILIKE ${pattern}`,
        )
      }

      const brandResults = await prisma.$queryRaw<
        { id: string; slug: string; title: string; displayTitle: string | null; outfitImageUrl: string | null; date: Date }[]
      >(Prisma.sql`
        SELECT DISTINCT p.id, p.slug, p.title, p."displayTitle", p."outfitImageUrl", p.date
        FROM posts p
        JOIN products pr ON pr."postId" = p.id
        WHERE (${Prisma.join(productWhereFragments, " OR ")})
        ORDER BY p.date DESC
        LIMIT 20
      `)

      const existingIds = new Set(looks.map((l) => l.id))
      for (const r of brandResults) {
        if (!existingIds.has(r.id)) {
          looks.push({
            id: r.id,
            slug: r.slug,
            title: r.title,
            displayTitle: r.displayTitle,
            outfitImageUrl: r.outfitImageUrl,
            matchContext: `Features matching products`,
            score: 0,
          })
        }
      }
    } catch (e) {
      console.error("Brand search failed:", e)
    }

    // 4. Also search by post title / displayTitle — word-level
    const titleOrConditions: Prisma.PostWhereInput[] = []
    for (const term of allTerms) {
      titleOrConditions.push(
        { title: { contains: term, mode: "insensitive" } },
        { displayTitle: { contains: term, mode: "insensitive" } },
      )
    }
    const titleResults = await prisma.post.findMany({
      where: { OR: titleOrConditions },
      select: { id: true, slug: true, title: true, displayTitle: true, outfitImageUrl: true },
      take: 10,
      orderBy: { date: "desc" },
    })

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
          score: 0,
        })
      }
    }

    // 5. Search products by brand or item name — word-level
    const productOrConditions: Prisma.ProductWhereInput[] = []
    for (const term of allTerms) {
      productOrConditions.push(
        { brand: { contains: term, mode: "insensitive" } },
        { itemName: { contains: term, mode: "insensitive" } },
        { rawText: { contains: term, mode: "insensitive" } },
      )
    }
    const rawProducts = await prisma.product.findMany({
      where: {
        isAlternative: false,
        productImageUrl: { not: null },
        OR: productOrConditions,
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
        &larr; All Vibes
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
              No results for &ldquo;{query}&rdquo;. Try searching for a garment type (dress, skirt),
              occasion (wedding, date night), or brand name.
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
                  <div key={product.id}>
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener sponsored"
                      className="group block"
                    >
                      {product.productImageUrl && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-white mb-2">
                          <Image
                            src={product.productImageUrl}
                            alt={product.brand || "Product"}
                            fill
                            className="object-contain group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                          <div className="absolute top-2 right-2 z-10">
                            <HeartButton itemType="product" itemId={product.id} size="sm" />
                          </div>
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
                      <p className="text-xs text-primary mt-1 group-hover:underline">Shop This &rarr;</p>
                    </a>
                  </div>
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
 * Checks which fields matched which search terms and shows the most relevant ones.
 */
function buildMatchContext(
  result: {
    garments: string | null
    mood: string | null
    season: string | null
    setting: string | null
    formality: string | null
    vibeKeywords: string | null
    stylingNotes: string | null
  },
  searchTerms: string[],
  allTerms: string[]
): string {
  const parts: string[] = []

  // Check garments for matching pieces
  if (result.garments) {
    try {
      const garments = JSON.parse(result.garments) as {
        type?: string
        colorName?: string
        fabric?: string
        pattern?: string
      }[]
      for (const g of garments) {
        const desc = [g.colorName, g.fabric, g.type].filter(Boolean).join(" ")
        const descLower = desc.toLowerCase()
        if (allTerms.some((t) => descLower.includes(t))) {
          parts.push(desc.charAt(0).toUpperCase() + desc.slice(1))
          if (parts.length >= 2) break // Show up to 2 matching garments
        }
      }
    } catch {
      // garments might not be valid JSON string
    }
  }

  // Add mood/season/setting/formality if they match any term
  const fields = [
    { value: result.mood, label: "mood" },
    { value: result.season, label: "season" },
    { value: result.setting, label: "setting" },
    { value: result.formality, label: "formality" },
  ]
  for (const { value } of fields) {
    if (value && allTerms.some((t) => value.toLowerCase().includes(t))) {
      const capitalized = value.charAt(0).toUpperCase() + value.slice(1)
      if (!parts.includes(capitalized)) {
        parts.push(capitalized)
      }
    }
  }

  return parts.slice(0, 3).join(" · ")
}
