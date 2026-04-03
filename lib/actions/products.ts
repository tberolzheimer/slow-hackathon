"use server"

import { prisma } from "@/lib/db/prisma"

/**
 * Get the number of distinct looks a product appears in.
 * Products matched by brand + itemName combo.
 */
export async function getProductLookCounts(
  productKeys: { brand: string; itemName: string }[]
): Promise<Map<string, number>> {
  if (productKeys.length === 0) return new Map()

  const counts = new Map<string, number>()

  // Batch query: get all products matching these brand+itemName combos
  for (const key of productKeys) {
    if (!key.brand || !key.itemName) continue

    const count = await prisma.product.groupBy({
      by: ["postId"],
      where: {
        brand: key.brand,
        itemName: key.itemName,
        isAlternative: false,
      },
    })

    if (count.length > 1) {
      counts.set(`${key.brand}::${key.itemName}`, count.length)
    }
  }

  return counts
}

/**
 * Get all posts featuring a specific product (by brand + itemName).
 */
export async function getProductOutfits(brand: string, itemName: string) {
  const products = await prisma.product.findMany({
    where: {
      brand,
      itemName,
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

  return products.map((p) => p.post)
}
