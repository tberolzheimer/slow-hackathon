/**
 * JBV-41: Stock availability checker
 *
 * Checks whether products are still in stock by:
 * 1. Following the affiliate URL redirect chain to find the final destination
 * 2. Checking the HTTP status code (200 = likely available, 404 = sold out)
 * 3. Scanning the HTML body for stock indicators ("add to cart" vs "sold out")
 *
 * Updates Product.stockStatus ("available" | "sold_out" | "unknown")
 * and Product.lastStockCheck timestamp.
 *
 * Rate limits: 2 requests/sec to avoid retailer blocks.
 * Processes in batches of 100.
 *
 * Usage: tsx scripts/check-stock.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const RATE_LIMIT_MS = 500 // 2 requests per second
const BATCH_SIZE = 100
const REQUEST_TIMEOUT_MS = 5000
const STALE_DAYS = 7

// Patterns that indicate item is available for purchase
const AVAILABLE_PATTERNS = [
  /add\s+to\s+bag/i,
  /add\s+to\s+cart/i,
  /buy\s+now/i,
  /add\s+to\s+basket/i,
  /purchase/i,
  /in\s+stock/i,
]

// Patterns that indicate item is sold out
const SOLD_OUT_PATTERNS = [
  /sold\s+out/i,
  /out\s+of\s+stock/i,
  /notify\s+me/i,
  /waitlist/i,
  /coming\s+soon/i,
  /currently\s+unavailable/i,
  /no\s+longer\s+available/i,
  /this\s+item\s+is\s+unavailable/i,
  /email\s+me\s+when\s+available/i,
  /back\s+in\s+stock/i,
]

// Domains that are known homepages (if we redirect here, the product is gone)
const HOMEPAGE_INDICATORS = [
  /^https?:\/\/(www\.)?[^/]+\/?$/,
  /^https?:\/\/(www\.)?[^/]+\/?(#.*)?$/,
]

const stats = {
  total: 0,
  available: 0,
  soldOut: 0,
  unknown: 0,
  errors: 0,
  skipped: 0,
}

/**
 * Follow redirect chain and return the final URL + status code.
 * Uses GET (not HEAD) so we can read body content for stock indicators.
 */
async function checkUrl(url: string): Promise<{
  finalUrl: string | null
  statusCode: number | null
  body: string | null
  error: string | null
}> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
    clearTimeout(timeout)

    // Read a limited portion of the body (first 50KB is enough for stock indicators)
    const body = await res.text().then((t) => t.slice(0, 50_000))

    return {
      finalUrl: res.url,
      statusCode: res.status,
      body,
      error: null,
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { finalUrl: null, statusCode: null, body: null, error: "timeout" }
    }
    return {
      finalUrl: null,
      statusCode: null,
      body: null,
      error: err instanceof Error ? err.message : "unknown error",
    }
  }
}

/**
 * Determine stock status from HTTP response.
 */
function determineStockStatus(
  statusCode: number | null,
  finalUrl: string | null,
  body: string | null,
  originalUrl: string
): "available" | "sold_out" | "unknown" {
  // No response at all
  if (statusCode === null) return "unknown"

  // Clear 404 or 410 Gone
  if (statusCode === 404 || statusCode === 410) return "sold_out"

  // Server error — can't determine
  if (statusCode >= 500) return "unknown"

  // Redirected to homepage — product is gone
  if (finalUrl) {
    for (const pattern of HOMEPAGE_INDICATORS) {
      if (pattern.test(finalUrl)) {
        // Only count as sold_out if we actually redirected (not if original was homepage)
        if (finalUrl !== originalUrl) return "sold_out"
      }
    }
  }

  // For 200 responses, check body for stock indicators
  if (statusCode === 200 && body) {
    // Check sold-out patterns first (they're more specific)
    const hasSoldOut = SOLD_OUT_PATTERNS.some((p) => p.test(body))
    const hasAvailable = AVAILABLE_PATTERNS.some((p) => p.test(body))

    // If both patterns match, the page likely has both states —
    // sold-out text is usually more decisive (e.g. "Sold Out" button replacing "Add to Cart")
    if (hasSoldOut && !hasAvailable) return "sold_out"
    if (hasAvailable && !hasSoldOut) return "available"
    if (hasAvailable && hasSoldOut) {
      // Both present — common on pages that show "Sold Out" but still have
      // "Add to Cart" in scripts/templates. Lean toward sold_out since the
      // sold-out patterns are more intentional.
      return "sold_out"
    }

    // No indicators found — if we got a 200 on what looks like a product page, call it available
    if (finalUrl && !HOMEPAGE_INDICATORS.some((p) => p.test(finalUrl))) {
      return "available"
    }
  }

  return "unknown"
}

async function processBatch(
  products: {
    id: string
    affiliateUrl: string
    brand: string | null
    itemName: string | null
  }[],
  batchNum: number,
  totalBatches: number
) {
  console.log(
    `\n--- Batch ${batchNum}/${totalBatches} (${products.length} products) ---`
  )

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const globalIndex = (batchNum - 1) * BATCH_SIZE + i + 1

    const result = await checkUrl(product.affiliateUrl)

    if (result.error) {
      stats.errors++
      stats.unknown++

      await prisma.product.update({
        where: { id: product.id },
        data: {
          lastStockCheck: new Date(),
          // Keep existing stockStatus on error
        },
      })

      if (stats.errors <= 10 || stats.errors % 50 === 0) {
        console.log(
          `  [${globalIndex}/${stats.total}] ${product.brand ?? "?"} ${product.itemName ?? "?"} — ERROR: ${result.error}`
        )
      }
    } else {
      const status = determineStockStatus(
        result.statusCode,
        result.finalUrl,
        result.body,
        product.affiliateUrl
      )

      await prisma.product.update({
        where: { id: product.id },
        data: {
          stockStatus: status,
          lastStockCheck: new Date(),
        },
      })

      if (status === "available") stats.available++
      else if (status === "sold_out") stats.soldOut++
      else stats.unknown++

      // Log periodically
      if (i < 3 || (globalIndex % 100 === 0)) {
        console.log(
          `  [${globalIndex}/${stats.total}] ${product.brand ?? "?"} ${product.itemName ?? "?"} — ${status} (HTTP ${result.statusCode})`
        )
      }
    }

    // Rate limit
    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }
}

async function main() {
  console.log("===============================================")
  console.log("JBV-41: Stock Availability Checker")
  console.log("===============================================")
  console.log(`Started at: ${new Date().toISOString()}`)

  // Calculate the stale threshold
  const staleDate = new Date()
  staleDate.setDate(staleDate.getDate() - STALE_DAYS)

  // Find products that need checking:
  // - Have an affiliate URL
  // - linkAlive is true (skip known-dead links)
  // - lastStockCheck is null OR older than STALE_DAYS
  const products = await prisma.product.findMany({
    where: {
      affiliateUrl: { not: "" },
      linkAlive: true,
      OR: [
        { lastStockCheck: null },
        { lastStockCheck: { lt: staleDate } },
      ],
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
    orderBy: { lastStockCheck: { sort: "asc", nulls: "first" } },
  })

  stats.total = products.length
  console.log(`\nFound ${products.length} products to check`)
  console.log(`(stale threshold: ${STALE_DAYS} days, before ${staleDate.toISOString()})`)
  console.log(`Rate limit: ${1000 / RATE_LIMIT_MS} requests/sec`)
  console.log(
    `Estimated time: ${Math.ceil((products.length * RATE_LIMIT_MS) / 1000 / 60)} minutes\n`
  )

  // Process in batches
  const totalBatches = Math.ceil(products.length / BATCH_SIZE)
  for (let b = 0; b < totalBatches; b++) {
    const batch = products.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    await processBatch(batch, b + 1, totalBatches)
  }

  // Print summary
  console.log("\n\n===============================================")
  console.log("SUMMARY")
  console.log("===============================================")
  console.log(`Total checked: ${stats.total}`)
  console.log(`  Available:   ${stats.available} (${((stats.available / stats.total) * 100).toFixed(1)}%)`)
  console.log(`  Sold Out:    ${stats.soldOut} (${((stats.soldOut / stats.total) * 100).toFixed(1)}%)`)
  console.log(`  Unknown:     ${stats.unknown} (${((stats.unknown / stats.total) * 100).toFixed(1)}%)`)
  console.log(`  Errors:      ${stats.errors}`)

  // Overall DB stats
  const statusDist = await prisma.product.groupBy({
    by: ["stockStatus"],
    _count: true,
  })
  console.log("\nDatabase stock status distribution:")
  for (const s of statusDist) {
    console.log(`  ${s.stockStatus}: ${s._count}`)
  }

  console.log(`\nFinished at: ${new Date().toISOString()}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
