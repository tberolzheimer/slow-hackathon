import { prisma } from "@/lib/db/prisma"
import type { ParsedPost } from "./types"

/**
 * Upsert a parsed post into the database.
 * Idempotent: uses url as unique key. Re-running updates existing records.
 * Products are deleted and recreated per post in a transaction.
 */
export async function upsertPost(parsed: ParsedPost): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    // Upsert the post
    const post = await tx.post.upsert({
      where: { url: parsed.url },
      create: {
        title: parsed.title,
        slug: parsed.slug,
        url: parsed.url,
        date: parsed.date,
        outfitImageUrl: parsed.outfitImageUrl,
        rawHtml: parsed.rawHtml,
        wpPostId: parsed.wpPostId,
        ingestStatus: "scraped",
      },
      update: {
        title: parsed.title,
        outfitImageUrl: parsed.outfitImageUrl,
        rawHtml: parsed.rawHtml,
        wpPostId: parsed.wpPostId,
        ingestStatus: "scraped",
        ingestError: null,
      },
    })

    // Delete existing products for this post (clean re-create)
    await tx.product.deleteMany({ where: { postId: post.id } })

    // Create products — first pass for non-alternatives
    const mainProducts = parsed.products.filter((p) => !p.isAlternative)
    const createdMains: { id: string; rawText: string }[] = []

    for (const p of mainProducts) {
      const created = await tx.product.create({
        data: {
          postId: post.id,
          rawText: p.rawText,
          brand: p.brand,
          itemName: p.itemName,
          affiliateUrl: p.affiliateUrl,
          productImageUrl: p.productImageUrl,
          sortOrder: p.sortOrder,
          isAlternative: false,
        },
      })
      createdMains.push({ id: created.id, rawText: p.rawText })
    }

    // Second pass: create alternatives, linking to parent by rawText match
    const altProducts = parsed.products.filter((p) => p.isAlternative)
    for (const p of altProducts) {
      // Find the parent product by matching rawText
      const parent = createdMains.find(
        (m) => m.rawText.toLowerCase() === p.rawText.toLowerCase()
      )

      await tx.product.create({
        data: {
          postId: post.id,
          rawText: p.rawText,
          brand: p.brand,
          itemName: p.itemName,
          affiliateUrl: p.affiliateUrl,
          productImageUrl: p.productImageUrl,
          sortOrder: p.sortOrder,
          isAlternative: true,
          parentProductId: parent?.id || null,
        },
      })
    }

    return post.id
  })

  return result
}
