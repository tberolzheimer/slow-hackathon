import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"

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
    title: `How Julia Styles the ${products.brand} ${products.itemName} — VibéShop`,
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
  // Get a sample product image
  const sampleProduct = await prisma.product.findFirst({
    where: { brand: product.brand, itemName: product.itemName, productImageUrl: { not: null } },
    select: { productImageUrl: true, affiliateUrl: true },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16">
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
              className="group inline-flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 transition-all"
            >
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={sampleProduct.productImageUrl}
                  alt={`${product.brand} ${product.itemName}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  {product.brand} {product.itemName}
                </p>
                <p className="text-xs text-primary group-hover:underline mt-1">
                  Shop This Piece →
                </p>
              </div>
            </a>
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
