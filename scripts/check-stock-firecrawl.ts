/**
 * Re-check "unknown" stock status products using Firecrawl.
 * Firecrawl renders pages with a real browser, bypassing 403s.
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import FirecrawlApp from "@mendable/firecrawl-js"

const prisma = new PrismaClient()
const fcApp = new (FirecrawlApp as any)({ apiKey: process.env.FIRECRAWL_API_KEY! })
const firecrawl = fcApp.v1 || fcApp

const BATCH_SIZE = 10
const DELAY_MS = 2000 // 2s between batches (Firecrawl has its own rate limits)

const IN_STOCK_SIGNALS = [
  "add to bag", "add to cart", "buy now", "add to basket",
  "purchase", "select size", "choose size", "in stock",
]

const SOLD_OUT_SIGNALS = [
  "sold out", "out of stock", "notify me", "coming soon",
  "unavailable", "waitlist", "back soon", "no longer available",
  "this item is currently", "currently unavailable",
]

function detectStock(text: string): "available" | "sold_out" | "unknown" {
  const lower = text.toLowerCase()

  // Check sold out first (more specific)
  for (const signal of SOLD_OUT_SIGNALS) {
    if (lower.includes(signal)) return "sold_out"
  }

  // Then check in stock
  for (const signal of IN_STOCK_SIGNALS) {
    if (lower.includes(signal)) return "available"
  }

  return "unknown"
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("Firecrawl Stock Checker — Unknown Products")
  console.log("═══════════════════════════════════════\n")

  // Get all unknown-status products with affiliate URLs
  const unknowns = await prisma.product.findMany({
    where: {
      stockStatus: "unknown",
      linkAlive: true,
      affiliateUrl: { not: "" },
      productImageUrl: { not: null }, // Only check products users can see
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
    take: 500, // Stay within free tier limits
  })

  console.log(`Found ${unknowns.length} unknown products to check\n`)

  let available = 0
  let soldOut = 0
  let stillUnknown = 0
  let errors = 0

  for (let i = 0; i < unknowns.length; i += BATCH_SIZE) {
    const batch = unknowns.slice(i, i + BATCH_SIZE)
    console.log(`--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unknowns.length / BATCH_SIZE)} ---`)

    for (const product of batch) {
      const label = `${product.brand || ""} ${product.itemName || ""}`.trim() || product.id
      try {
        // Use Firecrawl to scrape the page
        const result = await firecrawl.scrapeUrl(product.affiliateUrl, {
          formats: ["markdown"],
          timeout: 15000,
        })

        if (result.success && result.markdown) {
          const status = detectStock(result.markdown)

          await prisma.product.update({
            where: { id: product.id },
            data: {
              stockStatus: status,
              lastStockCheck: new Date(),
            },
          })

          if (status === "available") available++
          else if (status === "sold_out") soldOut++
          else stillUnknown++

          console.log(`  [${i + batch.indexOf(product) + 1}/${unknowns.length}] ${label} — ${status}`)
        } else {
          stillUnknown++
          await prisma.product.update({
            where: { id: product.id },
            data: { lastStockCheck: new Date() },
          })
          console.log(`  [${i + batch.indexOf(product) + 1}/${unknowns.length}] ${label} — no content`)
        }
      } catch (err: any) {
        errors++
        const msg = err?.message?.slice(0, 60) || "unknown error"
        console.log(`  [${i + batch.indexOf(product) + 1}/${unknowns.length}] ${label} — ERROR: ${msg}`)
      }
    }

    // Delay between batches
    if (i + BATCH_SIZE < unknowns.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  console.log("\n═══════════════════════════════════════")
  console.log("SUMMARY")
  console.log("═══════════════════════════════════════")
  console.log(`Checked: ${unknowns.length}`)
  console.log(`  Available: ${available}`)
  console.log(`  Sold Out:  ${soldOut}`)
  console.log(`  Still Unknown: ${stillUnknown}`)
  console.log(`  Errors: ${errors}`)

  // Final DB stats
  const stats = await prisma.$queryRaw<{ stockStatus: string; cnt: bigint }[]>`
    SELECT "stockStatus", COUNT(*)::bigint as cnt FROM products GROUP BY "stockStatus"
  `
  console.log("\nFull database stock distribution:")
  for (const s of stats) {
    console.log(`  ${s.stockStatus}: ${s.cnt}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
