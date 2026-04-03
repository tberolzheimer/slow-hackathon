import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { StickyShopBar } from "./sticky-shop-bar"
import { HeartButton } from "@/components/heart-button"


interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { prisma } = await import("@/lib/db/prisma")
  const posts = await prisma.post.findMany({
    select: { slug: true },
    orderBy: { date: "desc" },
    take: 100, // Pre-render recent 100 looks
  })
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({ where: { slug } })
  if (!post) return { title: "Look not found" }
  const title = post.displayTitle || post.title
  return {
    title: `${title} — VibeShop`,
    description: `Shop ${title} by Julia Berolzheimer. Every piece identified with direct links.`,
    openGraph: post.outfitImageUrl
      ? { images: [{ url: post.outfitImageUrl }] }
      : undefined,
  }
}

export default async function LookPage({ params }: Props) {
  await connection()
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isAlternative: false },
        orderBy: { sortOrder: "asc" },
      },
      visionData: true,
      vibeAssignments: {
        take: 1,
        orderBy: { confidenceScore: "desc" },
        include: { vibe: true },
      },
    },
  })

  if (!post) notFound()

  const vibe = post.vibeAssignments[0]?.vibe
  const stylingNotes = post.visionData?.stylingNotes
  const displayTitle = post.displayTitle || post.title
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const isPastSeason = post.date < sixMonthsAgo

  // Get look counts for products in multiple outfits — single batched query
  const lookCounts = new Map<string, number>()
  const productKeys = post.products
    .filter((p) => p.brand && p.itemName)
    .map((p) => ({ brand: p.brand!, itemName: p.itemName! }))

  if (productKeys.length > 0) {
    const multiLookProducts = await prisma.$queryRaw<
      { brand: string; itemName: string; count: bigint }[]
    >`
      SELECT brand, "itemName", COUNT(DISTINCT "postId") as count
      FROM products
      WHERE "isAlternative" = false
        AND brand IS NOT NULL AND "itemName" IS NOT NULL
      GROUP BY brand, "itemName"
      HAVING COUNT(DISTINCT "postId") > 1
    `
    for (const p of multiLookProducts) {
      lookCounts.set(`${p.brand}::${p.itemName}`, Number(p.count))
    }
  }

  // Split products into hero pieces and supporting pieces
  const heroProducts = post.products.filter((p) => p.isHeroPiece)
  const supportingProducts = post.products.filter((p) => !p.isHeroPiece)
  // If no hero pieces flagged, treat first 2 with images as heroes
  const effectiveHeroes =
    heroProducts.length > 0
      ? heroProducts
      : supportingProducts.filter((p) => p.productImageUrl).slice(0, 2)
  const effectiveSupporting =
    heroProducts.length > 0
      ? supportingProducts
      : supportingProducts.filter((p) => p.productImageUrl).slice(2)

  // Related looks from the same vibe
  let relatedPosts: {
    id: string
    slug: string
    title: string
    displayTitle: string | null
    outfitImageUrl: string | null
  }[] = []
  if (vibe) {
    try {
    const related = await prisma.vibeAssignment.findMany({
      where: { vibeId: vibe.id, postId: { not: post.id } },
      take: 8,
      orderBy: { confidenceScore: "desc" },
      include: {
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
    relatedPosts = related.map((r) => r.post)
    } catch {
      // Vibe may have been deleted — gracefully show no related posts
    }
  }

  const productCount = post.products.length

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {vibe && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/vibe/${vibe.slug}`}>
                    {vibe.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{displayTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* PDP Split Layout */}
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 px-4 sm:px-6">
        {/* Hero Image — scrolls naturally on mobile, sticky on desktop */}
        {post.outfitImageUrl && (
          <div className="lg:sticky lg:top-20 lg:self-start mb-6 lg:mb-0">
            <div className="relative w-full rounded-lg overflow-hidden">
              <Image
                src={post.outfitImageUrl}
                alt={displayTitle}
                width={800}
                height={1000}
                className="w-full h-auto"
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            </div>
          </div>
        )}

        {/* RIGHT: Shopping Elements */}
        <div className="mt-6 lg:mt-0">
          {/* Title + Heart + Date */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1">
                {displayTitle}
              </h1>
              <HeartButton itemType="look" itemId={post.slug} size="lg" />
            </div>
            <p className="text-sm text-muted-foreground">
              {post.date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {vibe && (
                <>
                  {" "}
                  &middot;{" "}
                  <Link
                    href={`/vibe/${vibe.slug}`}
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    {vibe.name}
                  </Link>
                </>
              )}
              {post.season && (
                <>
                  {" "}
                  &middot;{" "}
                  <Link
                    href={`/season/${post.season}`}
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    {post.season.charAt(0).toUpperCase() + post.season.slice(1)}
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* All Products — unified grid */}
          {isPastSeason && post.products.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              Past season — some items may no longer be available
            </p>
          )}
          {post.products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[...effectiveHeroes, ...effectiveSupporting].map((product) => (
                <a
                  key={product.id}
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener sponsored"
                  className="group block rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  {product.productImageUrl && (
                    <div className="p-3 pb-0">
                      <div className="relative aspect-[4/5] rounded-md overflow-hidden bg-white">
                        <Image
                          src={product.productImageUrl}
                          alt={product.rawText || "Product"}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 1024px) 45vw, 180px"
                        />
                        <div className="absolute top-2 right-2 z-10">
                          <HeartButton itemType="product" itemId={product.id} size="sm" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    {product.brand ? (
                      <a
                        href={`/brand/${product.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                        className="text-xs text-muted-foreground uppercase tracking-wide hover:text-primary transition-colors"
                      >
                        {product.brand}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Shop</p>
                    )}
                    <p className="text-sm text-foreground truncate mt-0.5">
                      {product.itemName || product.rawText}
                    </p>
                    {product.price ? (
                      <p className="text-sm font-medium mt-1">
                        ${product.price.toFixed(0)}
                      </p>
                    ) : null}
                    <p className="text-xs text-primary font-medium mt-2 group-hover:underline">
                      {product.retailerName ? `Shop at ${product.retailerName} →` : "Shop This →"}
                    </p>
                    {product.brand && product.itemName && lookCounts.get(`${product.brand}::${product.itemName}`) && (
                      <a
                        href={`/product/${`${product.brand}-${product.itemName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
                        className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      >
                        Styled in {lookCounts.get(`${product.brand}::${product.itemName}`)} looks →
                      </a>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Collapsible Sections — SEO content in dropdowns */}
          <Accordion type="multiple" className="mb-8">
            {stylingNotes && (
              <AccordionItem value="styling">
                <AccordionTrigger className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  Styling Notes
                </AccordionTrigger>
                <AccordionContent>
                  <p className="font-display italic text-sm text-muted-foreground leading-relaxed">
                    {stylingNotes}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="details">
              <AccordionTrigger className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Look Details
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  {productCount} pieces from{" "}
                  {[
                    ...new Set(
                      post.products
                        .map((p) => p.brand)
                        .filter(Boolean)
                    ),
                  ].join(", ")}
                  . Originally styled on{" "}
                  {post.date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* More from this vibe — horizontal carousel */}
      {relatedPosts.length > 0 && vibe && (
        <section className="px-4 sm:px-6 py-12 border-t border-border/50 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-foreground">
              If you love this look
            </h2>
            <Link
              href={`/vibe/${vibe.slug}`}
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              All {vibe.name} →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
            {relatedPosts.map(
              (related) =>
                related.outfitImageUrl && (
                  <Link
                    key={related.id}
                    href={`/look/${related.slug}`}
                    className="group flex-shrink-0 w-36 sm:w-44 snap-start"
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                      <Image
                        src={related.outfitImageUrl}
                        alt={related.displayTitle || related.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="176px"
                      />
                    </div>
                  </Link>
                )
            )}
          </div>
        </section>
      )}

      {/* Sticky Mobile CTA */}
      <StickyShopBar
        productCount={productCount}
        products={post.products.map((p) => ({
          id: p.id,
          brand: p.brand,
          itemName: p.itemName,
          affiliateUrl: p.affiliateUrl,
          price: p.price,
        }))}
      />
    </div>
  )
}
