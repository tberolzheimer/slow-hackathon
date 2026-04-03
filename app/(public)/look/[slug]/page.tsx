import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { connection } from "next/server"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({ where: { slug } })
  if (!post) return { title: "Look not found" }
  return {
    title: `${post.title} — VibéShop`,
    description: `Shop ${post.title} by Julia Berolzheimer.`,
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

  // Related looks from the same vibe
  let relatedPosts: { id: string; slug: string; title: string; outfitImageUrl: string | null }[] = []
  if (vibe) {
    const related = await prisma.vibeAssignment.findMany({
      where: {
        vibeId: vibe.id,
        postId: { not: post.id },
      },
      take: 6,
      orderBy: { confidenceScore: "desc" },
      include: {
        post: {
          select: { id: true, slug: true, title: true, outfitImageUrl: true },
        },
      },
    })
    relatedPosts = related.map((r) => r.post)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="pt-6 pb-4">
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
              <BreadcrumbPage>{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Image */}
      {post.outfitImageUrl && (
        <div className="relative w-full max-w-lg mx-auto mb-8">
          <Image
            src={post.outfitImageUrl}
            alt={post.title}
            width={600}
            height={750}
            className="w-full h-auto rounded-lg"
            priority
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {/* Title + Date */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-foreground mb-2">
          {post.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {post.date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Styling Notes — SB3: Guide voice, magazine caption treatment */}
      {stylingNotes && (
        <div className="max-w-2xl mx-auto mb-10 px-4">
          <p className="font-display italic text-base text-muted-foreground leading-relaxed">
            {stylingNotes}
          </p>
        </div>
      )}

      {/* Get the Look */}
      {post.products.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-xl text-foreground mb-6 text-center">
            Get the Look
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {post.products.map((product) => (
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
                      alt={product.rawText || "Product"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>
                )}
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

      {/* More from this vibe — internal linking for SEO + session depth */}
      {relatedPosts.length > 0 && vibe && (
        <section className="mb-16">
          <h2 className="font-display text-xl text-foreground mb-2 text-center">
            If you love this look
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            <Link
              href={`/vibe/${vibe.slug}`}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Explore more {vibe.name} &rarr;
            </Link>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {relatedPosts.map(
              (related) =>
                related.outfitImageUrl && (
                  <Link
                    key={related.id}
                    href={`/look/${related.slug}`}
                    className="group block rounded-lg overflow-hidden"
                  >
                    <Image
                      src={related.outfitImageUrl}
                      alt={related.title}
                      width={300}
                      height={375}
                      className="w-full h-auto object-cover group-hover:brightness-90 transition-all duration-300"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </Link>
                )
            )}
          </div>
        </section>
      )}
    </div>
  )
}
