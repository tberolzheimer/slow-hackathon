import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"
import { ExternalLink } from "lucide-react"


interface Props {
  params: Promise<{ slug: string }>
}

function parseSlug(slug: string): { brand: string; itemName: string } | null {
  // Slug format: "chanel-jacket" or "hermes-bag"
  // We need to try matching against known products
  return null // Will use DB lookup instead
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findFirst({
    where: {
      isAlternative: false,
      brand: { not: null },
      itemName: { not: null },
    },
    // We'll match by constructing the slug from brand+itemName
  })

  // Look up by slug pattern
  const products = await findProductBySlug(slug)
  if (!products) return { title: "Product not found" }

  return {
    title: `How Julia Styles the ${products.brand} ${products.itemName} — VibeShop`,
    description: `See every outfit featuring the ${products.brand} ${products.itemName}, styled ${products.count} different ways by Julia Berolzheimer.`,
  }
}

async function findProductBySlug(slug: string) {
  // Get all unique brand+itemName combos that appear in 2+ posts
  const multiLook = await prisma.$queryRaw<
    { brand: string; itemName: string; count: bigint }[]
  >`
    SELECT brand, "itemName", COUNT(DISTINCT "postId") as count
    FROM products
    WHERE brand IS NOT NULL AND "itemName" IS NOT NULL AND "isAlternative" = false
    GROUP BY brand, "itemName"
    HAVING COUNT(DISTINCT "postId") > 1
  `

  // Match slug against brand-itemName
  for (const p of multiLook) {
    const productSlug = `${p.brand}-${p.itemName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    if (productSlug === slug) {
      return { brand: p.brand, itemName: p.itemName, count: Number(p.count) }
    }
  }
  return null
}

export default async function ProductOutfitsPage({ params }: Props) {
  await connection()
  const { slug } = await params

  const product = await findProductBySlug(slug)
  if (!product) notFound()

  const posts = await prisma.product.findMany({
    where: {
      brand: product.brand,
      itemName: product.itemName,
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

  const outfits = posts.map((p) => p.post)
  // Get a sample product image + stock status
  const sampleProduct = await prisma.product.findFirst({
    where: { brand: product.brand, itemName: product.itemName, productImageUrl: { not: null } },
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
