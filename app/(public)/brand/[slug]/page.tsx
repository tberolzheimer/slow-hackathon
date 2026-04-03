import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
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

// Get all brands with 3+ products
async function getBrandsWithMinProducts(min: number) {
  const brands = await prisma.$queryRaw<{ brand: string; count: bigint }[]>`
    SELECT brand, COUNT(DISTINCT "postId") as count
    FROM products
    WHERE brand IS NOT NULL AND "isAlternative" = false
    GROUP BY brand
    HAVING COUNT(DISTINCT "postId") >= ${min}
    ORDER BY count DESC
  `
  return brands.map((b) => ({
    brand: b.brand,
    slug: b.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    count: Number(b.count),
  }))
}

export async function generateStaticParams() {
  const brands = await getBrandsWithMinProducts(3)
  return brands.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brands = await getBrandsWithMinProducts(3)
  const brand = brands.find((b) => b.slug === slug)
  if (!brand) return { title: "Brand not found" }
  return {
    title: `Julia's ${brand.brand} Outfits — VibeShop`,
    description: `See every outfit featuring ${brand.brand}, styled ${brand.count} different ways by Julia Berolzheimer. Shop the look.`,
  }
}

export default async function BrandPage({ params }: Props) {
  await connection()
  const { slug } = await params
  const brands = await getBrandsWithMinProducts(1)
  const brand = brands.find((b) => b.slug === slug)
  if (!brand) notFound()

  // Get all posts featuring this brand
  const products = await prisma.product.findMany({
    where: { brand: brand.brand, isAlternative: false },
    include: {
      post: {
        select: {
          id: true,
          slug: true,
          title: true,
          displayTitle: true,
          outfitImageUrl: true,
          date: true,
        },
      },
    },
    orderBy: { post: { date: "desc" } },
  })

  // Unique posts
  const seenPosts = new Set<string>()
  const posts = products
    .map((p) => p.post)
    .filter((p) => {
      if (seenPosts.has(p.id)) return false
      seenPosts.add(p.id)
      return true
    })

  // Unique products (deduplicate by itemName)
  const seenItems = new Set<string>()
  const uniqueProducts = products.filter((p) => {
    const key = `${p.brand}-${p.itemName || p.rawText}`
    if (seenItems.has(key)) return false
    seenItems.add(key)
    return true
  })

  // Related brands (brands that appear in the same posts)
  const postIds = posts.map((p) => p.id)
  const relatedBrands = await prisma.$queryRaw<{ brand: string; count: bigint }[]>`
    SELECT brand, COUNT(*) as count
    FROM products
    WHERE "postId" = ANY(${postIds}::text[])
      AND brand IS NOT NULL
      AND brand != ${brand.brand}
      AND "isAlternative" = false
    GROUP BY brand
    ORDER BY count DESC
    LIMIT 6
  `

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← All Vibes
      </Link>

      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-10 mt-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Brand
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-3">
          {brand.brand}
        </h1>
        <p className="text-lg text-muted-foreground">
          {posts.length} looks featuring {brand.brand}, styled by Julia Berolzheimer
        </p>
      </div>

      {/* Outfit Grid */}
      <section className="mb-16">
        <h2 className="font-display text-2xl text-foreground mb-6">
          The Looks
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {posts.slice(0, 20).map((post) =>
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

      {/* Product Grid */}
      {uniqueProducts.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-foreground mb-6">
            Shop {brand.brand} — {uniqueProducts.length} pieces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {uniqueProducts.filter((p) => p.productImageUrl).slice(0, 16).map((product) => (
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {product.brand}
                  </p>
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

      {/* Related Brands */}
      {relatedBrands.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-foreground mb-4">
            Often styled with
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedBrands.map((rb) => (
              <Link
                key={rb.brand}
                href={`/brand/${rb.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                className="px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {rb.brand}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
