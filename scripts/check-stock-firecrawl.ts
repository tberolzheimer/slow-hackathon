/**
 * Re-check "unknown" stock status products using Firecrawl.
 * Firecrawl renders pages with a real browser, bypassing 403s.
 *
 * Targets: Net-a-Porter, Saks, Bergdorf, Neiman Marcus, Farfetch, + others.
 * Skips: Chanel, Dior, Hermès (luxury brands we want to keep linking to).
 * ShopMy product-ID links: resolves redirect first, then scrapes destination.
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import FirecrawlApp from "@mendable/firecrawl-js"

const prisma = new PrismaClient()
const fcApp = new (FirecrawlApp as any)({ apiKey: process.env.FIRECRAWL_API_KEY! })
const firecrawl = fcApp.v1 || fcApp

const BATCH_SIZE = 10
const DELAY_MS = 2000

// Luxury brands to skip — keep as "unknown" (still link to their sites)
const SKIP_DOMAINS = new Set([
  "chanel.com", "dior.com", "hermes.com", "louisvuitton.com",
])

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
  for (const signal of SOLD_OUT_SIGNALS) {
    if (lower.includes(signal)) return "sold_out"
  }
  for (const signal of IN_STOCK_SIGNALS) {
    if (lower.includes(signal)) return "available"
  }
  return "unknown"
}

function getDestinationDomain(url: string): string | null {
  try {
    if (url.includes("go.shopmy.us/ap/") && url.includes("url=")) {
      const match = url.match(/url=([^&]+)/)
      if (match) return new URL(decodeURIComponent(match[1])).hostname.replace("www.", "")
    }
    return new URL(url).hostname.replace("www.", "")
  } catch { return null }
}

async function resolveShopMyRedirect(url: string): Promise<string> {
  // For go.shopmy.us/p-XXXXX links, follow the redirect to find the real URL
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) })
    const location = res.headers.get("location")
    if (location) return location
  } catch {}
  return url
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("Firecrawl Stock Checker — Targeted Retailers")
  console.log("═══════════════════════════════════════\n")

  // Get all unknown-status products
  const allUnknowns = await prisma.product.findMany({
    where: {
      stockStatus: "unknown",
      linkAlive: true,
      affiliateUrl: { not: "" },
      productImageUrl: { not: null },
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
  })

  // Filter out luxury brands we want to skip
  const unknowns = allUnknowns.filter((p) => {
    const domain = getDestinationDomain(p.affiliateUrl)
    return !domain || !SKIP_DOMAINS.has(domain)
  })

  console.log(`Total unknown: ${allUnknowns.length}`)
  console.log(`Skipping luxury brands: ${allUnknowns.length - unknowns.length}`)
  console.log(`Checking: ${unknowns.length}\n`)

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
        // Resolve ShopMy product-ID redirects first
        let scrapeUrl = product.affiliateUrl
        if (product.affiliateUrl.includes("go.shopmy.us/p-")) {
          scrapeUrl = await resolveShopMyRedirect(product.affiliateUrl)
          if (scrapeUrl !== product.affiliateUrl) {
            // Follow one more redirect if it's another ShopMy wrapper
            if (scrapeUrl.includes("go.shopmy.us")) {
              scrapeUrl = await resolveShopMyRedirect(scrapeUrl)
            }
          }
        }

        // Extract destination URL from ShopMy auto-links
        if (scrapeUrl.includes("go.shopmy.us/ap/") && scrapeUrl.includes("url=")) {
          const match = scrapeUrl.match(/url=([^&]+)/)
          if (match) scrapeUrl = decodeURIComponent(match[1])
        }

        // Skip if destination is a luxury brand we want to keep
        const destDomain = getDestinationDomain(scrapeUrl)
        if (destDomain && SKIP_DOMAINS.has(destDomain)) {
          console.log(`  [${i + batch.indexOf(product) + 1}/${unknowns.length}] ${label} — skipped (${destDomain})`)
          stillUnknown++
          continue
        }

        // Use Firecrawl to scrape the destination page
        const result = await firecrawl.scrapeUrl(scrapeUrl, {
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
