import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"
import { ExternalLink } from "lucide-react"
import { productSlug as makeProductSlug, normalizeItemKey } from "@/lib/product-normalize"


interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const products = await findProductBySlug(slug)
  if (!products) return { title: "Product not found" }

  return {
    title: `How Julia Styles the ${products.brand} ${products.itemName} — VibeShop`,
    description: `See every outfit featuring the ${products.brand} ${products.itemName}, styled ${products.count} different ways by Julia Berolzheimer.`,
  }
}

async function findProductBySlug(slug: string) {
  // Get all non-alternative products with brand + itemName
  const allProducts = await prisma.product.findMany({
    where: {
      isAlternative: false,
      brand: { not: null },
      itemName: { not: null },
    },
    select: {
      brand: true,
      itemName: true,
      postId: true,
    },
  })

  // Group by normalized key (same logic as most-worn page)
  const groups = new Map<
    string,
    {
      brand: string
      itemName: string
      postIds: Set<string>
      /** All distinct (brand, itemName) pairs that collapse into this group */
      variants: { brand: string; itemName: string }[]
    }
  >()

  for (const p of allProducts) {
    if (!p.brand || !p.itemName) continue
    const key = normalizeItemKey(p.brand, p.itemName)
    if (!key) continue

    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, {
        brand: p.brand,
        itemName: p.itemName,
        postIds: new Set([p.postId]),
        variants: [{ brand: p.brand, itemName: p.itemName }],
      })
    } else {
      existing.postIds.add(p.postId)
      // Track unique (brand, itemName) pairs
      if (
        !existing.variants.some(
          (v) => v.brand === p.brand && v.itemName === p.itemName
        )
      ) {
        existing.variants.push({ brand: p.brand, itemName: p.itemName })
      }
    }
  }

  // Match slug against each group's normalized slug
  for (const [, g] of groups) {
    if (g.postIds.size < 2) continue
    const s = makeProductSlug(g.brand, g.itemName)
    if (s === slug) {
      return {
        brand: g.brand,
        itemName: g.itemName,
        count: g.postIds.size,
        variants: g.variants,
      }
    }
  }
  return null
}

export default async function ProductOutfitsPage({ params }: Props) {
  await connection()
  const { slug } = await params

  const product = await findProductBySlug(slug)
  if (!product) notFound()

  // Build an OR filter across all variant (brand, itemName) pairs so
  // "Chanel Ballet Flats" and "Chanel Flats" both contribute outfits.
  const variantFilter = product.variants.map((v) => ({
    brand: v.brand,
    itemName: v.itemName,
  }))

  const posts = await prisma.product.findMany({
    where: {
      OR: variantFilter,
      isAlternative: false,
    },
    include: {
      post: {
        select: {
          id: true,
          slug: true,
          title: true,
          displayTitle: true,
          outfitImageUrl: true,
          date: true,
          vibeAssignments: {
            take: 1,
            orderBy: { confidenceScore: "desc" },
            include: { vibe: { select: { name: true, slug: true } } },
          },
        },
      },
    },
    orderBy: { post: { date: "desc" } },
  })

  // Deduplicate outfits (same post may appear via different variant rows)
  const seenPostIds = new Set<string>()
  const outfits = posts
    .map((p) => p.post)
    .filter((o) => {
      if (seenPostIds.has(o.id)) return false
      seenPostIds.add(o.id)
      return true
    })

  // Get a sample product image + stock status
  const sampleProduct = await prisma.product.findFirst({
    where: { OR: variantFilter, productImageUrl: { not: null } },
    select: { productImageUrl: true, affiliateUrl: true, stockStatus: true },
  })

  const isSoldOut = sampleProduct?.stockStatus === "sold_out"

  // Build "Find at Another Retailer" search links for sold-out products
  const searchQuery = [product.brand, product.itemName].filter(Boolean).join(" ")
  const encodedQuery = encodeURIComponent(searchQuery)
  const SHOPMY_BASE = "https://go.shopmy.us/ap/juliaberolzheimer?url="
  const retailerSearchLinks = [
    {
      name: "Google Shopping",
      url: `${SHOPMY_BASE}${encodeURIComponent(`https://www.google.com/search?tbm=shop&q=${encodedQuery}`)}`,
    },
    {
      name: "Shopbop",
      url: `${SHOPMY_BASE}${encodeURIComponent(`https://www.shopbop.com/s?searchTerm=${encodedQuery}`)}`,
    },
    {
      name: "Net-a-Porter",
      url: `${SHOPMY_BASE}${encodeURIComponent(`https://www.net-a-porter.com/en-us/shop/search?query=${encodedQuery}`)}`,
    },
    {
      name: "Nordstrom",
      url: `${SHOPMY_BASE}${encodeURIComponent(`https://www.nordstrom.com/sr?keyword=${encodedQuery}`)}`,
    },
    {
      name: "The RealReal",
      url: `${SHOPMY_BASE}${encodeURIComponent(`https://www.therealreal.com/search?query=${encodedQuery}`)}`,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← All Vibes
      </Link>

      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
          {product.brand}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-3">
          Julia styled this piece {product.count} ways
        </h1>
        <p className="text-lg text-muted-foreground">
          The {product.brand} {product.itemName} — a wardrobe staple that works
          with everything.
        </p>

        {/* Product image + shop link */}
        {sampleProduct?.productImageUrl && (
          <div className="mt-6 inline-block">
            <a
              href={sampleProduct.affiliateUrl}
              target="_blank"
              rel="noopener sponsored"
              className={`group inline-flex items-center gap-6 p-5 rounded-xl border border-border hover:border-primary/40 transition-all ${isSoldOut ? "opacity-75" : ""}`}
            >
              <div className="relative w-36 h-36 rounded-lg overflow-hidden bg-white flex-shrink-0">
                <Image
                  src={sampleProduct.productImageUrl}
                  alt={`${product.brand} ${product.itemName}`}
                  fill
                  className="object-contain"
                  sizes="144px"
                />
                {isSoldOut && (
                  <div className="absolute top-1 left-1">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-muted-foreground text-[10px] px-1.5 py-0.5">
                      Sold Out
                    </Badge>
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-base font-medium text-foreground">
                  {product.brand} {product.itemName}
                </p>
                <p className="text-sm text-primary group-hover:underline mt-1.5">
                  {isSoldOut ? "View Item" : "Shop This Piece"} →
                </p>
              </div>
            </a>
          </div>
        )}

        {/* Find at Another Retailer — shown when product is sold out */}
        {isSoldOut && (
          <div className="mt-8 max-w-md mx-auto">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
              Find at another retailer
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {retailerSearchLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener sponsored"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outfit grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {outfits.map((outfit) =>
          outfit.outfitImageUrl ? (
            <div key={outfit.id} className="relative">
              <Link
                href={`/look/${outfit.slug}`}
                className="group block rounded-lg overflow-hidden"
              >
                <Image
                  src={outfit.outfitImageUrl}
                  alt={outfit.displayTitle || outfit.title}
                  width={400}
                  height={500}
                  className="w-full h-auto object-cover group-hover:brightness-90 transition-all"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </Link>
              <div className="absolute top-2 right-2">
                <HeartButton itemType="look" itemId={outfit.slug} size="sm" />
              </div>
              <div className="mt-2">
                <p className="text-sm text-foreground truncate">
                  {outfit.displayTitle || outfit.title}
                </p>
                {outfit.vibeAssignments[0]?.vibe && (
                  <Link
                    href={`/vibe/${outfit.vibeAssignments[0].vibe.slug}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {outfit.vibeAssignments[0].vibe.name}
                  </Link>
                )}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}
