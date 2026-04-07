import { prisma } from "@/lib/db/prisma"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"
import { ShareButtons } from "@/components/share-buttons"
import { normalizeItemKey, productSlug } from "@/lib/product-normalize"

export const metadata: Metadata = {
  title: "Julia Berolzheimer's Most Worn Items | VibeShop",
  description:
    "Discover the bags, shoes, jewelry, and clothing Julia Berolzheimer reaches for again and again. Her most-repeated pieces across hundreds of styled outfits.",
  openGraph: {
    title: "Julia Berolzheimer's Most Worn Items",
    description:
      "The pieces she reaches for again and again — bags, shoes, jewelry, and more from her Daily Looks archive.",
  },
}

// ---------------------------------------------------------------------------
// Category definitions — we classify products by keywords in their item name
// ---------------------------------------------------------------------------

interface Category {
  label: string
  keywords: string[]
}

const CATEGORIES: Category[] = [
  {
    label: "Bags",
    keywords: ["bag", "tote", "clutch", "purse", "handbag", "crossbody"],
  },
  {
    label: "Shoes",
    keywords: [
      "sandals",
      "sandal",
      "sneakers",
      "sneaker",
      "flats",
      "flat",
      "heels",
      "heel",
      "boots",
      "boot",
      "mules",
      "mule",
      "loafers",
      "loafer",
      "espadrilles",
      "espadrille",
      "slingback",
      "pump",
      "pumps",
    ],
  },
  {
    label: "Jewelry",
    keywords: [
      "necklace",
      "earrings",
      "earring",
      "bracelet",
      "ring",
      "locket",
      "pendant",
      "hoops",
      "hoop",
      "chain",
    ],
  },
  {
    label: "Sunglasses",
    keywords: ["sunglasses", "sunglass"],
  },
  {
    label: "Hats",
    keywords: ["hat", "cap", "beret", "visor", "bucket hat"],
  },
  {
    label: "Belts",
    keywords: ["belt"],
  },
  {
    label: "Tops",
    keywords: [
      "shirt",
      "blouse",
      "top",
      "tank",
      "sweater",
      "cardigan",
      "tee",
      "t-shirt",
      "knit",
      "polo",
      "pullover",
    ],
  },
  {
    label: "Bottoms",
    keywords: [
      "jeans",
      "pants",
      "trousers",
      "skirt",
      "shorts",
      "culottes",
      "leggings",
    ],
  },
  {
    label: "Dresses",
    keywords: ["dress", "gown", "romper", "jumpsuit"],
  },
  {
    label: "Outerwear",
    keywords: [
      "blazer",
      "coat",
      "jacket",
      "trench",
      "cape",
      "vest",
      "parka",
    ],
  },
]

function classifyProduct(
  brand: string | null,
  itemName: string | null,
  affiliateUrl: string
): string | null {
  // Combine brand + itemName + url for matching
  const text = [brand, itemName, affiliateUrl]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      // Match as a whole word (or at word boundary)
      const regex = new RegExp(`\\b${kw}\\b`, "i")
      if (regex.test(text)) {
        return cat.label
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface MostWornItem {
  affiliateUrl: string
  lookCount: number
  brand: string | null
  itemName: string | null
  productImageUrl: string | null
  productId: string
  looks: {
    postId: string
    slug: string
    title: string
    displayTitle: string | null
    outfitImageUrl: string | null
  }[]
}

// normalizeItemKey is imported from @/lib/product-normalize

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getMostWornItems(): Promise<MostWornItem[]> {
  // ---------------------------------------------------------------------------
  // Step 1: Fetch ONLY the 3 columns needed for grouping via raw SQL.
  // This avoids loading all ~4800 full product rows into memory.
  // The DISTINCT eliminates duplicate (brand, itemName, postId) triples
  // so we transfer less data from the database.
  // ---------------------------------------------------------------------------
  const rows = await prisma.$queryRaw<
    { brand: string; itemName: string; postId: string }[]
  >`
    SELECT DISTINCT brand, "itemName", "postId"
    FROM products
    WHERE "isAlternative" = false
      AND brand IS NOT NULL
      AND "itemName" IS NOT NULL
  `

  // ---------------------------------------------------------------------------
  // Step 2: Group by normalized key in JS (normalization logic is too complex
  // for SQL — it involves regex synonym replacement, colour/material stripping).
  // We only track postIds per group, plus one representative (brand, itemName).
  // ---------------------------------------------------------------------------
  const itemGroups = new Map<string, {
    postIds: Set<string>
    brand: string
    itemName: string
    /** All variant (brand, itemName) pairs that collapse into this group */
    variants: { brand: string; itemName: string }[]
  }>()

  for (const p of rows) {
    const itemKey = normalizeItemKey(p.brand, p.itemName)
    if (!itemKey) continue

    const existing = itemGroups.get(itemKey)
    if (!existing) {
      itemGroups.set(itemKey, {
        postIds: new Set([p.postId]),
        brand: p.brand,
        itemName: p.itemName,
        variants: [{ brand: p.brand, itemName: p.itemName }],
      })
    } else {
      existing.postIds.add(p.postId)
      if (
        !existing.variants.some(
          (v) => v.brand === p.brand && v.itemName === p.itemName
        )
      ) {
        existing.variants.push({ brand: p.brand, itemName: p.itemName })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3: Filter to items appearing in 3+ posts, sort by count
  // ---------------------------------------------------------------------------
  const repeated = Array.from(itemGroups.values())
    .filter((v) => v.postIds.size >= 3)
    .sort((a, b) => b.postIds.size - a.postIds.size)

  if (repeated.length === 0) return []

  // ---------------------------------------------------------------------------
  // Step 4: Fetch product details (image, affiliateUrl, id) ONLY for the
  // items that passed the threshold. We build an OR filter across all variant
  // (brand, itemName) pairs so all name variants are covered.
  // ---------------------------------------------------------------------------
  const variantFilter = repeated.flatMap((g) =>
    g.variants.map((v) => ({ brand: v.brand, itemName: v.itemName }))
  )

  const detailProducts = await prisma.product.findMany({
    where: {
      OR: variantFilter,
      isAlternative: false,
    },
    select: {
      id: true,
      brand: true,
      itemName: true,
      affiliateUrl: true,
      productImageUrl: true,
    },
    distinct: ["brand", "itemName", "affiliateUrl"],
  })

  // Index details by normalized key for quick lookup
  const detailsByKey = new Map<string, {
    id: string
    affiliateUrl: string
    productImageUrl: string | null
  }>()

  for (const d of detailProducts) {
    const key = normalizeItemKey(d.brand, d.itemName)
    if (!key) continue
    const existing = detailsByKey.get(key)
    // Prefer a product row that has an image
    if (!existing || (d.productImageUrl && !existing.productImageUrl)) {
      detailsByKey.set(key, {
        id: d.id,
        affiliateUrl: d.affiliateUrl,
        productImageUrl: d.productImageUrl,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Step 5: Fetch look thumbnails for items that will be displayed.
  // We only need thumbnails for items that will actually render on the page:
  // top 24 overall + up to 8 per category. Cap at ~50 unique items.
  // ---------------------------------------------------------------------------
  const itemsNeedingLooks = repeated.slice(0, 50)
  const lookVariantFilter = itemsNeedingLooks.flatMap((g) =>
    g.variants.map((v) => ({ brand: v.brand, itemName: v.itemName }))
  )

  const productPosts = await prisma.product.findMany({
    where: {
      OR: lookVariantFilter,
      isAlternative: false,
    },
    select: {
      brand: true,
      itemName: true,
      post: {
        select: {
          id: true,
          slug: true,
          title: true,
          displayTitle: true,
          outfitImageUrl: true,
        },
      },
    },
  })

  // Group posts by normalized key, deduplicating by postId
  const postsByKey = new Map<string, Map<string, {
    postId: string
    slug: string
    title: string
    displayTitle: string | null
    outfitImageUrl: string | null
  }>>()

  for (const pp of productPosts) {
    const key = normalizeItemKey(pp.brand, pp.itemName)
    if (!key) continue
    if (!postsByKey.has(key)) {
      postsByKey.set(key, new Map())
    }
    const postsMap = postsByKey.get(key)!
    if (!postsMap.has(pp.post.id)) {
      postsMap.set(pp.post.id, {
        postId: pp.post.id,
        slug: pp.post.slug,
        title: pp.post.title,
        displayTitle: pp.post.displayTitle,
        outfitImageUrl: pp.post.outfitImageUrl,
      })
    }
  }

  // ---------------------------------------------------------------------------
  // Step 6: Assemble final results
  // ---------------------------------------------------------------------------
  return repeated.map((g) => {
    const key = normalizeItemKey(g.brand, g.itemName)!
    const detail = detailsByKey.get(key)
    return {
      affiliateUrl: detail?.affiliateUrl ?? "",
      lookCount: g.postIds.size,
      brand: g.brand,
      itemName: g.itemName,
      productImageUrl: detail?.productImageUrl ?? null,
      productId: detail?.id ?? "",
      looks: Array.from(postsByKey.get(key)?.values() ?? []),
    }
  })
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function MostWornPage() {
  await connection()

  const items = await getMostWornItems()

  // Overall top items (top 24)
  const topItems = items.slice(0, 24)

  // Group by category
  const categorized = new Map<string, MostWornItem[]>()
  for (const item of items) {
    const cat = classifyProduct(item.brand, item.itemName, item.affiliateUrl)
    if (cat) {
      if (!categorized.has(cat)) categorized.set(cat, [])
      categorized.get(cat)!.push(item)
    }
  }

  // Order categories by the ones defined in CATEGORIES that have items
  const categoryOrder = CATEGORIES.map((c) => c.label).filter((label) =>
    categorized.has(label)
  )

  return (
    <div>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 pb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">
          Most Worn
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-foreground mb-4">
          Julia&apos;s Most Worn Pieces
        </h1>
        <p className="font-display italic text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The items she reaches for again and again — across hundreds of
          outfits, these are the pieces that earn a permanent spot in her
          rotation.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Badge variant="secondary">{items.length} repeat pieces</Badge>
        </div>
        <div className="mt-4 flex justify-center">
          <ShareButtons title="Julia Berolzheimer's Most Worn Items — VibeShop" />
        </div>
      </section>

      {/* Jump links */}
      {categoryOrder.length > 0 && (
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="#top-items"
              className="px-4 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Top Picks
            </a>
            {categoryOrder.map((cat) => (
              <a
                key={cat}
                href={`#cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {cat}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Top Items */}
      {topItems.length > 0 && (
        <section
          id="top-items"
          className="max-w-7xl mx-auto px-4 sm:px-6 py-12 scroll-mt-20"
        >
          <h2 className="font-display text-2xl text-foreground mb-2">
            The All-Time Favorites
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            The pieces that appear in the most looks
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {topItems.map((item) => (
              <MostWornCard key={item.affiliateUrl} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Category sections */}
      {categoryOrder.map((cat) => {
        const catItems = categorized.get(cat)!
        return (
          <section
            key={cat}
            id={`cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            className="max-w-7xl mx-auto px-4 sm:px-6 py-12 scroll-mt-20 border-t border-border/50"
          >
            <h2 className="font-display text-2xl text-foreground mb-2">
              Most Worn {cat}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              {catItems.length} {cat.toLowerCase()} worn across multiple looks
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {catItems.slice(0, 8).map((item) => (
                <MostWornCard key={item.affiliateUrl} item={item} />
              ))}
            </div>
          </section>
        )
      })}

      {/* Bottom note */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          These repeat items are tracked automatically from Julia
          Berolzheimer&apos;s Daily Looks archive. When the same product link
          appears across multiple outfits, it means Julia reached for that piece
          more than once — a true wardrobe staple.
        </p>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

// productSlug is imported from @/lib/product-normalize

function MostWornCard({ item }: { item: MostWornItem }) {
  const displayName =
    item.brand && item.itemName
      ? `${item.brand} ${item.itemName}`
      : item.brand || item.itemName || "Wardrobe Staple"
  const slug = productSlug(item.brand, item.itemName)

  return (
    <div>
      {/* Product image → product page */}
      <Link
        href={slug ? `/product/${slug}` : item.affiliateUrl}
        className="group block"
      >
        <div className="relative aspect-square rounded-lg overflow-hidden bg-white mb-3">
          {item.productImageUrl ? (
            <Image
              src={item.productImageUrl}
              alt={displayName}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          <div className="absolute top-2 right-2 z-10">
            <HeartButton itemType="product" itemId={item.productId} size="sm" />
          </div>
          <div className="absolute bottom-2 left-2 z-10">
            <Badge className="bg-foreground/80 text-background text-xs hover:bg-foreground/80">
              {item.lookCount} looks
            </Badge>
          </div>
        </div>
        {item.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {item.brand}
          </p>
        )}
        {item.itemName && (
          <p className="text-sm text-foreground">{item.itemName}</p>
        )}
        <p className="text-xs text-primary mt-1 group-hover:underline">
          See All Looks &rarr;
        </p>
      </Link>
      <a
        href={item.affiliateUrl}
        target="_blank"
        rel="noopener sponsored"
        className="text-xs text-muted-foreground hover:text-primary mt-0.5 inline-block"
      >
        Shop This &rarr;
      </a>

      {/* Look thumbnails */}
      {item.looks.length > 0 && (
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {item.looks.slice(0, 6).map((look) => (
            <Link
              key={look.postId}
              href={`/look/${look.slug}`}
              className="shrink-0 relative w-10 h-14 rounded overflow-hidden bg-muted hover:ring-2 ring-primary/40 transition-all"
              title={look.displayTitle || look.title}
            >
              {look.outfitImageUrl && (
                <Image
                  src={look.outfitImageUrl}
                  alt={look.displayTitle || look.title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              )}
            </Link>
          ))}
          {item.looks.length > 6 && (
            <div className="shrink-0 w-10 h-14 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
              +{item.looks.length - 6}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
