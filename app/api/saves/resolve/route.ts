import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function POST(req: NextRequest) {
  const { items } = await req.json()

  if (!Array.isArray(items)) {
    return NextResponse.json([], { status: 400 })
  }

  const resolved = await Promise.all(
    items.map(async (item: { itemType: string; itemId: string; createdAt: string }) => {
      const base = {
        itemType: item.itemType,
        itemId: item.itemId,
        createdAt: item.createdAt,
      }

      try {
        if (item.itemType === "look") {
          // itemId is the post slug
          const post = await prisma.post.findUnique({
            where: { slug: item.itemId },
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
          // itemId is the vibe slug
          const vibe = await prisma.vibe.findUnique({
            where: { slug: item.itemId },
            select: { name: true, slug: true, tagline: true },
          })
          // Get a cover image from the first assigned post
          const assignment = vibe
            ? await prisma.vibeAssignment.findFirst({
                where: { vibeId: (await prisma.vibe.findUnique({ where: { slug: item.itemId } }))?.id },
                include: { post: { select: { outfitImageUrl: true } } },
                orderBy: { confidenceScore: "desc" },
              })
            : null
          if (vibe) {
            return {
              ...base,
              title: vibe.name,
              imageUrl: assignment?.post.outfitImageUrl || null,
              href: `/vibe/${vibe.slug}`,
              subtitle: vibe.tagline,
            }
          }
        }

        if (item.itemType === "product") {
          const product = await prisma.product.findUnique({
            where: { id: item.itemId },
            select: {
              brand: true,
              itemName: true,
              productImageUrl: true,
              affiliateUrl: true,
              price: true,
            },
          })
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
    })
  )

  return NextResponse.json(resolved)
}
