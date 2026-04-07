import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function POST(req: NextRequest) {
  const { items } = await req.json()

  if (!Array.isArray(items)) {
    return NextResponse.json([], { status: 400 })
  }

  // Group items by type for batched queries (avoids N+1)
  const lookSlugs: string[] = []
  const vibeSlugs: string[] = []
  const productIds: string[] = []

  for (const item of items as { itemType: string; itemId: string }[]) {
    if (item.itemType === "look") lookSlugs.push(item.itemId)
    else if (item.itemType === "vibe") vibeSlugs.push(item.itemId)
    else if (item.itemType === "product") productIds.push(item.itemId)
  }

  // Batch fetch all three types in parallel (max 3 queries total)
  const [looks, vibes, products] = await Promise.all([
    lookSlugs.length > 0
      ? prisma.post.findMany({
          where: { slug: { in: lookSlugs } },
          select: {
            displayTitle: true,
            title: true,
            outfitImageUrl: true,
            slug: true,
            vibeAssignments: {
              take: 1,
              include: { vibe: { select: { name: true } } },
            },
            _count: { select: { products: true } },
          },
        })
      : Promise.resolve([]),
    vibeSlugs.length > 0
      ? prisma.vibe.findMany({
          where: { slug: { in: vibeSlugs } },
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            vibeAssignments: {
              take: 1,
              orderBy: { confidenceScore: "desc" },
              select: { post: { select: { outfitImageUrl: true } } },
            },
          },
        })
      : Promise.resolve([]),
    productIds.length > 0
      ? prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            brand: true,
            itemName: true,
            productImageUrl: true,
            affiliateUrl: true,
            price: true,
          },
        })
      : Promise.resolve([]),
  ])

  // Index results by their lookup key for O(1) access
  const lookMap = new Map(looks.map((p) => [p.slug, p]))
  const vibeMap = new Map(vibes.map((v) => [v.slug, v]))
  const productMap = new Map(products.map((p) => [p.id, p]))

  // Map each original item to its resolved form
  const resolved = (items as { itemType: string; itemId: string; createdAt: string }[]).map(
    (item) => {
      const base = {
        itemType: item.itemType,
        itemId: item.itemId,
        createdAt: item.createdAt,
      }

      try {
        if (item.itemType === "look") {
          const post = lookMap.get(item.itemId)
          if (post) {
            return {
              ...base,
              title: post.displayTitle || post.title,
              imageUrl: post.outfitImageUrl,
              href: `/look/${post.slug}`,
              subtitle: post.vibeAssignments[0]?.vibe.name
                ? `${post.vibeAssignments[0].vibe.name} · ${post._count.products} pieces`
                : `${post._count.products} pieces`,
            }
          }
        }

        if (item.itemType === "vibe") {
          const vibe = vibeMap.get(item.itemId)
          if (vibe) {
            return {
              ...base,
              title: vibe.name,
              imageUrl: vibe.vibeAssignments[0]?.post.outfitImageUrl || null,
              href: `/vibe/${vibe.slug}`,
              subtitle: vibe.tagline,
            }
          }
        }

        if (item.itemType === "product") {
          const product = productMap.get(item.itemId)
          if (product) {
            return {
              ...base,
              title: product.itemName || "Product",
              brand: product.brand,
              imageUrl: product.productImageUrl,
              href: product.affiliateUrl,
              subtitle: product.price ? `$${product.price.toFixed(0)}` : undefined,
            }
          }
        }
      } catch {
        // Item not found — return base
      }

      return base
    }
  )

  return NextResponse.json(resolved)
}
