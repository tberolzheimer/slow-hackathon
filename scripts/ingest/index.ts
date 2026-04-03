import { PrismaClient } from "@prisma/client"
import { discoverPosts } from "./discover"
import { scrapePosts } from "./scrape"
import { parsePostHtml } from "../../lib/ingest/parse-post-html"

// Use a direct PrismaClient for scripts (not the Next.js singleton)
const prisma = new PrismaClient()

const AFTER_DATE = new Date("2024-01-01")

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibéShop Ingest Pipeline")
  console.log("═══════════════════════════════════════\n")

  // Create ingest log
  const log = await prisma.ingestLog.create({
    data: { runType: "full_backfill", status: "running" },
  })

  try {
    // Step 1: Discover post URLs from sitemaps
    console.log("Step 1: Discovering posts from sitemaps...\n")
    const discovered = await discoverPosts(AFTER_DATE)
    console.log()

    // Check which posts we already have
    const existingUrls = new Set(
      (await prisma.post.findMany({ select: { url: true } })).map((p) => p.url)
    )
    const newPosts = discovered.filter((p) => !existingUrls.has(p.url))
    const existingPosts = discovered.filter((p) => existingUrls.has(p.url))

    console.log(`Found ${discovered.length} posts total`)
    console.log(`  ${newPosts.length} new, ${existingPosts.length} already in DB\n`)

    // Step 2: Scrape and parse posts
    const toScrape = discovered // Scrape all (upsert handles dedup)
    console.log(`Step 2: Scraping ${toScrape.length} posts...\n`)

    let successCount = 0
    let failCount = 0

    const results = await scrapePosts(toScrape, (done, total, title) => {
      const pct = Math.round((done / total) * 100)
      console.log(`  [${done}/${total}] (${pct}%) ${title}`)
    })

    // Step 3: Upsert into database
    console.log(`\nStep 3: Saving to database...\n`)

    for (const { post, parsed } of results) {
      if (!parsed) {
        failCount++
        continue
      }

      try {
        await prisma.$transaction(async (tx) => {
          // Upsert post
          const dbPost = await tx.post.upsert({
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

          // Delete existing products for clean re-create
          await tx.product.deleteMany({ where: { postId: dbPost.id } })

          // Create main products first
          const mainProducts = parsed.products.filter((p) => !p.isAlternative)
          const createdMains: { id: string; rawText: string }[] = []

          for (const p of mainProducts) {
            const created = await tx.product.create({
              data: {
                postId: dbPost.id,
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

          // Create alternative products
          const altProducts = parsed.products.filter((p) => p.isAlternative)
          for (const p of altProducts) {
            const parent = createdMains.find(
              (m) => m.rawText.toLowerCase() === p.rawText.toLowerCase()
            )
            await tx.product.create({
              data: {
                postId: dbPost.id,
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
        })
        successCount++
      } catch (err) {
        console.error(`  Failed to save ${parsed.slug}: ${err}`)
        failCount++

        // Mark post as failed if it exists
        try {
          await prisma.post.update({
            where: { url: parsed.url },
            data: {
              ingestStatus: "failed",
              ingestError: String(err),
            },
          })
        } catch {
          // Post might not exist yet
        }
      }
    }

    // Update ingest log
    await prisma.ingestLog.update({
      where: { id: log.id },
      data: {
        status: "completed",
        postsFound: discovered.length,
        postsNew: newPosts.length,
        postsUpdated: existingPosts.length,
        postsFailed: failCount,
        completedAt: new Date(),
      },
    })

    // Summary
    console.log("\n═══════════════════════════════════════")
    console.log("Ingest Complete!")
    console.log("═══════════════════════════════════════")
    console.log(`  Discovered: ${discovered.length}`)
    console.log(`  Saved:      ${successCount}`)
    console.log(`  Failed:     ${failCount}`)

    // Quick stats
    const postCount = await prisma.post.count()
    const productCount = await prisma.product.count()
    const withImage = await prisma.post.count({ where: { outfitImageUrl: { not: null } } })
    console.log(`\nDatabase totals:`)
    console.log(`  Posts:    ${postCount}`)
    console.log(`  Products: ${productCount}`)
    console.log(`  With outfit image: ${withImage}`)
  } catch (err) {
    console.error("\nFatal error:", err)
    await prisma.ingestLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorLog: { error: String(err) },
        completedAt: new Date(),
      },
    })
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
