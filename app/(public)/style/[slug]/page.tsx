import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { HeartButton } from "@/components/heart-button"

// ═══════════════════════════════════════
// SEO Page Configurations
// ═══════════════════════════════════════

interface SeoPageConfig {
  slug: string
  title: string
  keyword: string
  metaTitle: string
  metaDesc: string
  intro: string
  filters: {
    season?: string
    formality?: string | string[]
    mood?: string | string[]
    setting?: string | string[]
    garmentSearch?: string // ILIKE pattern for garments JSON
  }
}

const SEO_PAGES: SeoPageConfig[] = [
  {
    slug: "spring-wedding-guest-dresses",
    title: "Spring Wedding Guest Dresses",
    keyword: "spring wedding guest dress",
    metaTitle: "Spring Wedding Guest Dresses — Styled by Julia Berolzheimer | VibeShop",
    metaDesc: "Find the perfect spring wedding guest dress, styled by Julia Berolzheimer. 50+ real outfit ideas with every piece linked to shop.",
    intro: `Finding a spring wedding guest dress shouldn't feel like a second job. You want something that feels right for the occasion — polished enough for the ceremony, comfortable enough for the dance floor, and memorable enough that you don't blend into the background.\n\nJulia's approach to wedding dressing is refreshingly simple: pick one standout element and let everything else support it. A bold floral midi with understated heels. A sleek column dress with a statement earring. The trick isn't finding the most expensive thing — it's finding the piece that makes you feel like the best version of yourself when you walk in.\n\nThese are real outfits Julia has worn to weddings, rehearsal dinners, and spring celebrations. Every piece is linked so you can shop exactly what she wore, or find something similar that fits your budget. Whether you lean toward romantic florals, architectural silhouettes, or classic neutrals, there's a look here that was made for that spring wedding on your calendar.`,
    filters: { season: "spring", formality: "smart-casual", garmentSearch: "dress" },
  },
  {
    slug: "casual-spring-outfits",
    title: "Casual Spring Outfits",
    keyword: "casual spring outfits",
    metaTitle: "Casual Spring Outfits — Real Outfit Ideas from Julia Berolzheimer | VibeShop",
    metaDesc: "Effortless casual spring outfit ideas styled by Julia Berolzheimer. Light layers, relaxed silhouettes, and every piece linked to shop.",
    intro: `The best casual spring outfits look like you didn't try — but they always involve at least one intentional choice. Maybe it's the way a linen shirt is tucked just so. Maybe it's the sandal that elevates the whole thing from "running errands" to "running errands beautifully."\n\nJulia's casual spring uniform lives in the space between dressed up and dressed down. Think light knits over cotton, denim that actually fits, and colors that feel like the first warm day after winter. The goal isn't to look polished — it's to look like yourself on a good day.\n\nThese are her real everyday outfits from Charleston mornings, weekend markets, and school drop-offs. Nothing here requires a stylist or a mood board. Every piece is linked, most are still available, and the vibe is always "she just looks good without trying." That's the whole point.`,
    filters: { season: "spring", formality: "casual" },
  },
  {
    slug: "spring-outfits-women",
    title: "Spring Outfits for Women",
    keyword: "spring outfits women",
    metaTitle: "Spring Outfits for Women — 200+ Styled Looks | VibeShop",
    metaDesc: "Browse 200+ spring outfits for women, organized by vibe and styled by Julia Berolzheimer. Every product linked to shop.",
    intro: `Spring dressing is its own art form. Too heavy and you're sweating by noon. Too light and you're freezing at dinner. The women who get it right treat spring like a layering game — one where every piece earns its place.\n\nThis collection spans every corner of Julia Berolzheimer's spring wardrobe: garden parties and grocery runs, client meetings and coastal getaways. What connects them isn't a specific garment or color palette — it's an approach. Start with something you love, add what the weather demands, and stop before it feels like a costume.\n\nEvery outfit here was photographed as worn, not styled for a flat lay. These are real combinations that worked in real life, with every piece identified and linked. Browse by the feeling that matches your day — whether that's "Sunday garden" or "Tuesday boardroom" — and build your spring wardrobe one outfit at a time.`,
    filters: { season: "spring" },
  },
  {
    slug: "spring-outfit-ideas",
    title: "Spring Outfit Ideas",
    keyword: "spring outfit ideas",
    metaTitle: "Spring Outfit Ideas — Fresh Inspiration from Julia Berolzheimer | VibeShop",
    metaDesc: "Hundreds of spring outfit ideas organized by aesthetic vibe. Find your style, shop the look, dress with intention.",
    intro: `You don't need more clothes. You need better ideas for the ones you have — and maybe one or two pieces that make everything else click.\n\nThat's the philosophy behind this collection. Julia Berolzheimer's spring outfits aren't about trends or seasonal "must-haves." They're about combinations that feel right: the trench coat that turns jeans into an outfit, the midi skirt that works with three different tops, the sandal that bridges the gap between winter boots and bare feet.\n\nWe've organized hundreds of Julia's spring looks by aesthetic feeling — from polished maximalism to quiet minimalism, from coastal ease to city sharpness. Each outfit is tagged with every garment, color, and fabric so you can search for exactly what you're imagining. Find a look that resonates, shop the pieces you're missing, and stop scrolling Pinterest for inspiration you'll never act on.`,
    filters: { season: "spring" },
  },
  {
    slug: "spring-dress-with-jacket",
    title: "Spring Dresses with Jackets",
    keyword: "spring dress with jacket",
    metaTitle: "How to Style a Spring Dress with a Jacket — Julia Berolzheimer | VibeShop",
    metaDesc: "The spring dress + jacket combination Julia reaches for most. See real outfits and shop every piece.",
    intro: `The spring dress-and-jacket combination is Julia's single most-reached-for formula. It solves the fundamental spring problem: mornings are cold, afternoons are warm, and you need to look good through both.\n\nThe trick isn't matching — it's contrast. A structured blazer over a flowing floral dress. A cropped denim jacket over a midi. A lightweight trench left open over something bright underneath. The jacket does the work of making it "an outfit" instead of "just a dress."\n\nThese pairings come from years of Julia's Daily Looks. Some are obvious (the classic trench + wrap dress), and some are unexpected (a leather jacket over a garden print). Every combination is one you can recreate with pieces you probably already own — and the ones you don't are all linked to shop.`,
    filters: { season: "spring", garmentSearch: "jacket" },
  },
  {
    slug: "spring-work-outfits",
    title: "Spring Work Outfits",
    keyword: "spring work outfits",
    metaTitle: "Spring Work Outfits — Polished & Effortless | VibeShop",
    metaDesc: "Spring work outfit ideas that are polished without being stiff. Styled by Julia Berolzheimer with every piece linked.",
    intro: `Spring work outfits should make you feel sharp without making you feel overdressed. The goal is the colleague everyone notices but nobody can quite pin down why — it's just that everything fits, nothing's fussy, and the colors feel alive.\n\nJulia's work-appropriate spring looks live in the smart-casual sweet spot. Tailored trousers with a silk blouse that breathes. A structured bag that anchors a looser silhouette. Heels that could walk to lunch and back without complaint. The formality comes from the fit, not the fabric.\n\nEvery outfit here has been worn to real meetings, real lunches, and real days where looking put-together was non-negotiable. They're not "workwear" in the corporate catalog sense — they're what a woman who loves getting dressed actually wears to work when the weather turns warm.`,
    filters: { season: "spring", formality: "smart-casual" },
  },
  {
    slug: "spring-capsule-wardrobe",
    title: "Spring Capsule Wardrobe",
    keyword: "spring capsule wardrobe",
    metaTitle: "Spring Capsule Wardrobe — Julia Berolzheimer's Essential Pieces | VibeShop",
    metaDesc: "Build a spring capsule wardrobe from Julia Berolzheimer's most-worn pieces. The 15 items that create 30+ outfits.",
    intro: `A spring capsule wardrobe isn't about owning less — it's about owning better. The right 15 pieces create 30+ outfits because every item was chosen to work with every other item. That's not minimalism for its own sake. It's strategy.\n\nJulia's most versatile spring pieces show up across dozens of Daily Looks in different combinations. The white button-down that works under a blazer and over a bikini. The midi skirt that goes from garden party to dinner. The flat sandal that somehow elevates everything. These are the pieces that earn their closet space.\n\nWe've identified the items Julia reaches for most and the combinations she returns to again and again. This isn't a theoretical capsule — it's a real one, built from outfit data across hundreds of spring looks. Every piece is linked, and every combination has been road-tested by someone who gets dressed in front of a camera every day.`,
    filters: { season: "spring" },
  },
  {
    slug: "spring-brunch-outfit",
    title: "Spring Brunch Outfits",
    keyword: "spring brunch outfit",
    metaTitle: "Spring Brunch Outfits — Weekend Style Ideas | VibeShop",
    metaDesc: "What to wear to spring brunch — relaxed, beautiful outfit ideas styled by Julia Berolzheimer. Every piece linked to shop.",
    intro: `Spring brunch is the most Julia Berolzheimer meal that exists. Sunshine, good food, and an outfit that says "I woke up this beautiful" even though you definitely thought about it for at least ten minutes.\n\nThe spring brunch outfit lives in a very specific zone: more put-together than Saturday morning coffee, less formal than dinner reservations. It's the midi dress you throw a denim jacket over. The wide-leg pant with a cropped knit and your best sunglasses. The jumpsuit that looks like you planned it but required zero effort.\n\nThese are Julia's real weekend looks — the outfits she wears to Charleston brunch spots, garden tables, and patio restaurants where the light is good. Nothing here is precious or overdone. Everything here photographs beautifully, which matters more than we like to admit.`,
    filters: { season: "spring", setting: ["garden", "outdoor", "street"] },
  },
  {
    slug: "spring-date-night-outfit",
    title: "Spring Date Night Outfits",
    keyword: "spring date night outfit",
    metaTitle: "Spring Date Night Outfits — Polished & Romantic | VibeShop",
    metaDesc: "Spring date night outfit ideas from Julia Berolzheimer. Romantic, polished, and every piece linked to shop.",
    intro: `The spring date night outfit has one job: make you feel like the most interesting person in the room. Not the most overdressed. Not the most underdressed. The most interesting.\n\nJulia's evening spring looks lean into romance without tipping into costume. Think: a slip dress with a structured jacket that comes off after the second glass of wine. Wide-leg trousers with a top that catches the candlelight. A bold color that you'd never wear to the office but feels exactly right at 8pm.\n\nThe key is one confident choice. One piece that makes you stand a little taller. Everything else supports it. These are real outfits from evenings out in Charleston, New York, and everywhere in between — not styled on a mannequin but worn by a woman who knows the difference between dressing for someone else and dressing for herself.`,
    filters: { season: "spring", formality: "smart-casual", mood: ["romantic", "polished", "sophisticated"] },
  },
  {
    slug: "spring-fashion-2026",
    title: "Spring Fashion 2026",
    keyword: "spring fashion 2026",
    metaTitle: "Spring Fashion 2026 — The Newest Looks from Julia Berolzheimer | VibeShop",
    metaDesc: "The freshest spring 2026 outfit ideas from Julia Berolzheimer's Daily Looks. See what she's wearing now and shop every piece.",
    intro: `Spring 2026 fashion isn't about a single trend — it's about a feeling. And this year, the feeling is confident ease. Relaxed silhouettes with intentional details. Colors that feel sun-warmed, not manufactured. Fabrics that move with you instead of against you.\n\nJulia's newest spring looks capture exactly where fashion is heading this season: softer tailoring, bolder color mixing, and a return to pieces that actually feel good to wear. The wide-leg pant is having its biggest moment in years. Linen is everywhere but this time it's structured. And the midi dress — Julia's signature — keeps evolving in ways that feel fresh without trying to reinvent the wheel.\n\nThese are the most recent looks from Julia's Daily Looks archive, posted in spring 2026. Every piece is current-season, most are still in stock, and the styling ideas are ones you can use right now. This is what spring fashion looks like when it's worn by someone who actually lives in it.`,
    filters: { season: "spring" },
  },
]

// ═══════════════════════════════════════

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = SEO_PAGES.find((p) => p.slug === slug)
  if (!page) return { title: "Not found" }
  return {
    title: page.metaTitle,
    description: page.metaDesc,
  }
}

export default async function StylePage({ params }: Props) {
  await connection()
  const { slug } = await params
  const page = SEO_PAGES.find((p) => p.slug === slug)
  if (!page) notFound()

  // Query matching posts via VisionData using Prisma findMany
  const { filters } = page

  // Build VisionData where clause
  const visionWhere: Record<string, unknown> = {}
  if (filters.season) visionWhere.season = filters.season
  if (filters.formality) {
    visionWhere.formality = Array.isArray(filters.formality)
      ? { in: filters.formality }
      : filters.formality
  }
  if (filters.mood) {
    visionWhere.mood = Array.isArray(filters.mood)
      ? { in: filters.mood }
      : filters.mood
  }
  if (filters.setting) {
    visionWhere.setting = Array.isArray(filters.setting)
      ? { in: filters.setting }
      : filters.setting
  }

  // First get matching vision data post IDs
  let matchingPostIds: string[] = []
  const visionResults = await prisma.visionData.findMany({
    where: visionWhere,
    select: { postId: true },
  })
  matchingPostIds = visionResults.map((v) => v.postId)

  // If garment filter, further filter by checking garments JSON text
  if (filters.garmentSearch && matchingPostIds.length > 0) {
    // Fetch garments JSON and filter in JS (Prisma Json filters don't work for this)
    const withGarments = await prisma.visionData.findMany({
      where: { postId: { in: matchingPostIds } },
      select: { postId: true, garments: true },
    })
    const filtered = withGarments.filter((v) => {
      const json = JSON.stringify(v.garments || "").toLowerCase()
      return json.includes(filters.garmentSearch!.toLowerCase())
    })
    if (filtered.length > 0) {
      matchingPostIds = filtered.map((v) => v.postId)
    }
  }

  // Get the actual posts
  const posts = matchingPostIds.length > 0
    ? await prisma.post.findMany({
        where: {
          id: { in: matchingPostIds },
          outfitImageUrl: { not: null },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          displayTitle: true,
          outfitImageUrl: true,
          date: true,
        },
        orderBy: { date: "desc" },
        take: 24,
      })
    : []

  // Get products from matching posts
  const postIds = posts.map((p) => p.id)
  let products: { id: string; brand: string | null; itemName: string | null; rawText: string; productImageUrl: string | null; affiliateUrl: string }[] = []
  if (postIds.length > 0) {
    products = await prisma.product.findMany({
      where: {
        postId: { in: postIds },
        isAlternative: false,
        productImageUrl: { not: null },
      },
      select: {
        id: true,
        brand: true,
        itemName: true,
        rawText: true,
        productImageUrl: true,
        affiliateUrl: true,
      },
      take: 50,
    })

    // Deduplicate by brand+itemName
    const seen = new Set<string>()
    products = products.filter((p) => {
      const key = `${p.brand}-${p.itemName}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 16)
  }

  // Related style pages
  const relatedPages = SEO_PAGES.filter((p) => p.slug !== slug).slice(0, 4)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← All Vibes
      </Link>

      {/* Header */}
      <div className="max-w-3xl mx-auto mt-8 mb-10">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground text-center mb-6">
          {page.title}
        </h1>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {page.intro}
        </div>
      </div>

      {/* Outfit Grid */}
      {posts.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-foreground mb-6">
            {posts.length} Looks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {posts.map((post) =>
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
      )}

      {/* Product Grid */}
      {products.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-foreground mb-6">
            Shop These Looks — {products.length} Pieces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id}>
                <a
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener sponsored"
                  className="group block"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-white mb-2">
                    <Image
                      src={product.productImageUrl!}
                      alt={product.rawText || "Product"}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <HeartButton itemType="product" itemId={product.id} size="sm" />
                    </div>
                  </div>
                  {product.brand && (
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {product.brand}
                    </p>
                  )}
                  <p className="text-sm text-foreground truncate">
                    {product.itemName || product.rawText}
                  </p>
                  <p className="text-xs text-primary mt-1 group-hover:underline">Shop This →</p>
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Style Pages */}
      <section>
        <h2 className="font-display text-xl text-foreground mb-4">
          More Style Guides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {relatedPages.map((rp) => (
            <Link
              key={rp.slug}
              href={`/style/${rp.slug}`}
              className="group block p-4 rounded-xl border border-border hover:border-primary/40 transition-all"
            >
              <p className="font-display text-lg text-foreground group-hover:text-primary transition-colors">
                {rp.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {rp.intro.split("\n")[0].substring(0, 100)}...
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
