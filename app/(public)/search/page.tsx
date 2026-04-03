import { prisma } from "@/lib/db/prisma"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { SearchBar } from "../search-bar"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — VibéShop Search` : "Search — VibéShop",
  }
}

export default async function SearchPage({ searchParams }: Props) {
  await connection()
  const { q } = await searchParams
  const query = q?.trim() || ""

  let posts: { id: string; slug: string; title: string; outfitImageUrl: string | null }[] = []
  let products: {
    id: string
    brand: string | null
    itemName: string | null
    productImageUrl: string | null
    affiliateUrl: string
  }[] = []

  if (query) {
    // Search posts by title
    posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, title: true, outfitImageUrl: true },
      take: 20,
      orderBy: { date: "desc" },
    })

    // Search products by brand or item name
    products = await prisma.product.findMany({
      where: {
        isAlternative: false,
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
      take: 24,
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">
      <div className="max-w-xl mx-auto mb-12">
        <h1 className="font-display text-3xl text-foreground text-center mb-6">
          Find your look
        </h1>
        <SearchBar />
      </div>

      {query && (
        <div>
          {posts.length === 0 && products.length === 0 && (
            <p className="text-center text-muted-foreground text-lg py-12">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Matching Looks */}
          {posts.length > 0 && (
            <section className="mb-12">
              <h2 className="font-display text-xl text-foreground mb-4">
                Looks ({posts.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {posts.map(
                  (post) =>
                    post.outfitImageUrl && (
                      <Link
                        key={post.id}
                        href={`/look/${post.slug}`}
                        className="group block rounded-lg overflow-hidden"
                      >
                        <Image
                          src={post.outfitImageUrl}
                          alt={post.title}
                          width={300}
                          height={375}
                          className="w-full h-auto object-cover group-hover:brightness-90 transition-all"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <p className="text-sm text-foreground mt-1">
                          {post.title}
                        </p>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
