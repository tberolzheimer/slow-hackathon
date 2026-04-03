import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { connection } from "next/server"
import { SectionNav } from "./section-nav"
import { OutfitGrid } from "./outfit-grid"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vibe = await prisma.vibe.findUnique({ where: { slug } })
  if (!vibe) return { title: "Vibe not found" }
  return {
    title: `${vibe.name} — VibéShop`,
    description: vibe.tagline || `Explore the ${vibe.name} aesthetic on VibéShop.`,
  }
}

export default async function VibePage({ params }: Props) {
  await connection()
  const { slug } = await params
  const vibe = await prisma.vibe.findUnique({
    where: { slug },
    include: {
      vibeAssignments: {
        orderBy: { confidenceScore: "desc" },
        include: {
          post: {
            include: {
              products: {
                where: { isAlternative: false, productImageUrl: { not: null } },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  })

  if (!vibe) notFound()

  const posts = vibe.vibeAssignments.map((a) => a.post)

  // Aggregate unique products across all posts in this vibe
  const allProducts = posts
    .flatMap((p) => p.products)
    .filter((p) => p.productImageUrl)

  // Deduplicate by affiliate URL
  const seen = new Set<string>()
  const uniqueProducts = allProducts.filter((p) => {
    if (seen.has(p.affiliateUrl)) return false
    seen.add(p.affiliateUrl)
    return true
  })

  return (
    <div>
      {/* Sticky Section Nav */}
      <SectionNav productCount={uniqueProducts.length} />

      {/* Vibe Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-foreground mb-3">
          {vibe.name}
        </h1>
        {vibe.tagline && (
          <p className="text-lg text-muted-foreground mb-4">{vibe.tagline}</p>
        )}
        {vibe.introText && (
          <p className="hidden sm:block text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {vibe.introText}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="secondary">{posts.length} looks</Badge>
          <Badge variant="secondary">{uniqueProducts.length} pieces</Badge>
        </div>
      </section>

      {/* Section 1: The Looks */}
      <section id="the-looks" className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="font-display text-2xl text-foreground mb-6">The Looks</h2>
        <OutfitGrid
          posts={posts.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            displayTitle: p.displayTitle,
            outfitImageUrl: p.outfitImageUrl,
          }))}
          productCount={uniqueProducts.length}
        />

        {/* Intro text — mobile only, shown below the image grid */}
        {vibe.introText && (
          <p className="sm:hidden text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed text-center mt-8">
            {vibe.introText}
          </p>
        )}
      </section>

      {/* Styling Tips — SB3: Guide voice */}
      {vibe.stylingTips && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
          <div className="bg-muted/50 rounded-xl p-6 sm:p-8">
            <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-4">
              How to wear this vibe
            </h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {vibe.stylingTips}
            </p>
          </div>
        </section>
      )}

      {/* Section 2: Shop the Vibe */}
      {uniqueProducts.length > 0 && (
        <section id="shop-the-vibe" className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 scroll-mt-32">
          <h2 className="font-display text-2xl text-foreground mb-6">
            Shop the Vibe — {uniqueProducts.length} pieces
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {uniqueProducts.slice(0, 24).map((product) => (
              <a
                key={product.id}
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener sponsored"
                className="group block"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-3">
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
                {product.itemName && (
                  <p className="text-sm text-foreground">{product.itemName}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Occasion Context — SB2: Problem (philosophical) */}
      {vibe.occasionText && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            {vibe.occasionText}
          </p>
        </section>
      )}
    </div>
  )
}
