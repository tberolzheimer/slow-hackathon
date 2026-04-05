/**
 * JBV-61: Second-hop ShopStyle link resolver
 *
 * Fixes dead affiliate links across three categories:
 *
 * 1. shopstyle.it (1619 dead) — Extract real retailer URL from retailerUrl
 *    field's shopstyle.com/action/apiVisitRetailer?url= param, then wrap in ShopMy.
 *    For those without retailerUrl, try following the redirect or fall back to
 *    a Google search ShopMy link using brand + itemName.
 *
 * 2. rstyle.me (113 alive) — Try following redirects to find the real retailer
 *    URL. If dead/timeout, mark linkAlive=false.
 *
 * 3. linksynergy.com (251 alive) — Extract the `murl` param which contains
 *    the encoded retailer URL, then wrap in ShopMy.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const SHOPMY_BASE = "https://go.shopmy.us/ap/juliaberolzheimer?url="
const RATE_LIMIT_MS = 1000 // 1 request per second for HTTP calls
const BATCH_SAVE_EVERY = 50
const REQUEST_TIMEOUT_MS = 5000

const DOMAIN_NAMES: Record<string, string> = {
  "nordstrom.com": "Nordstrom",
  "net-a-porter.com": "Net-a-Porter",
  "shopbop.com": "Shopbop",
  "revolve.com": "Revolve",
  "saksfifthavenue.com": "Saks Fifth Avenue",
  "bergdorfgoodman.com": "Bergdorf Goodman",
  "mytheresa.com": "Mytheresa",
  "matchesfashion.com": "Matches",
  "ssense.com": "SSENSE",
  "farfetch.com": "Farfetch",
  "amazon.com": "Amazon",
  "bloomingdales.com": "Bloomingdale's",
  "neimanmarcus.com": "Neiman Marcus",
  "jcrew.com": "J.Crew",
  "mango.com": "Mango",
  "zara.com": "Zara",
  "freepeople.com": "Free People",
  "anthropologie.com": "Anthropologie",
  "reformation.com": "Reformation",
  "asos.com": "ASOS",
  "nordstrom.sjv.io": "Nordstrom",
  "modaoperandi.com": "Moda Operandi",
  "thewebster.com": "The Webster",
  "chanel.com": "Chanel",
  "dfrfrnt.com": "Dôen",
  "tuckernuck.com": "Tuckernuck",
  "hm.com": "H&M",
  "cos.com": "COS",
  "everlane.com": "Everlane",
  "stories.com": "& Other Stories",
  "bananarepublic.com": "Banana Republic",
  "gap.com": "Gap",
  "nordstromrack.com": "Nordstrom Rack",
  "target.com": "Target",
  "marissacollections.com": "Marissa Collections",
  "vifrancis.com": "VI Francis",
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function domainToName(domain: string): string {
  if (DOMAIN_NAMES[domain]) return DOMAIN_NAMES[domain]
  for (const [key, name] of Object.entries(DOMAIN_NAMES)) {
    if (domain.endsWith(key)) return name
  }
  const parts = domain.split(".")
  const name = parts[parts.length - 2] || parts[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Extract real retailer URL from a shopstyle.com/action/apiVisitRetailer URL
 */
function extractRetailerFromShopStyleUrl(shopstyleUrl: string): string | null {
  try {
    const u = new URL(shopstyleUrl)
    const encodedUrl = u.searchParams.get("url")
    if (encodedUrl) {
      return decodeURIComponent(encodedUrl)
    }
  } catch {}
  return null
}

/**
 * Extract retailer URL from a linksynergy.com deeplink URL
 */
function extractRetailerFromLinkSynergy(linksynergyUrl: string): string | null {
  try {
    const u = new URL(linksynergyUrl)
    const encodedUrl = u.searchParams.get("murl")
    if (encodedUrl) {
      return decodeURIComponent(encodedUrl)
    }
  } catch {}
  return null
}

/**
 * Try to extract a real retailer URL from any intermediate URL.
 * Handles shopstyle.com/action/apiVisitRetailer?url=... and linksynergy deeplinks.
 */
function tryExtractRetailerFromUrl(url: string): string | null {
  // shopstyle.com/action/apiVisitRetailer?url=ENCODED
  if (url.includes("shopstyle.com/action/apiVisitRetailer")) {
    return extractRetailerFromShopStyleUrl(url)
  }
  // linksynergy deeplink?murl=ENCODED
  if (url.includes("linksynergy.com")) {
    return extractRetailerFromLinkSynergy(url)
  }
  return null
}

/**
 * Follow redirects with timeout to find the final destination.
 * If we land on an intermediate affiliate URL (like shopstyle.com),
 * try to extract the embedded retailer URL from query params.
 */
async function followRedirects(
  url: string,
  maxHops: number = 5
): Promise<string | null> {
  let currentUrl = url
  for (let i = 0; i < maxHops; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const res = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })
      clearTimeout(timeout)

      const location = res.headers.get("location")
      if (!location) {
        // No more redirects. If we're on an intermediate URL with embedded retailer, extract it.
        const extracted = tryExtractRetailerFromUrl(currentUrl)
        if (extracted) return extracted
        // Otherwise, if we moved at all, return current
        return i > 0 ? currentUrl : null
      }

      // Handle relative redirects
      let nextUrl: string
      try {
        nextUrl = new URL(location, currentUrl).toString()
      } catch {
        return null
      }

      // Check if we can extract a retailer URL from this intermediate hop
      const extracted = tryExtractRetailerFromUrl(nextUrl)
      if (extracted) return extracted

      // If we've reached a non-affiliate URL, we're done
      const domain = extractDomain(nextUrl)
      if (
        domain &&
        !domain.includes("shopstyle") &&
        !domain.includes("rstyle") &&
        !domain.includes("linksynergy") &&
        !domain.includes("prf.hn")
      ) {
        return nextUrl
      }

      currentUrl = nextUrl
    } catch (err: unknown) {
      // Timeout or network error
      if (err instanceof Error && err.name === "AbortError") {
        return null // Timeout
      }
      return null
    }
  }
  return null
}

/**
 * Build a ShopMy-wrapped Google search URL as a fallback
 */
function buildSearchFallback(
  brand: string | null,
  itemName: string | null
): string | null {
  if (!brand) return null
  const searchQuery = [brand, itemName].filter(Boolean).join(" ")
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + " buy")}`
  return SHOPMY_BASE + encodeURIComponent(googleUrl)
}

// Stats tracking
const stats = {
  // Phase 1: shopstyle.it with retailerUrl
  shopstyleExtracted: 0,
  shopstyleExtractFailed: 0,
  // Phase 2: shopstyle.it without retailerUrl (redirect attempts)
  shopstyleRedirectResolved: 0,
  shopstyleSearchFallback: 0,
  shopstyleTrulyDead: 0,
  // Phase 3: rstyle.me
  rstyleResolved: 0,
  rstyleSearchFallback: 0,
  rstyleDead: 0,
  // Phase 4: linksynergy.com
  linksynergyExtracted: 0,
  linksynergyFailed: 0,
}

async function phase1_shopstyleWithRetailerUrl() {
  console.log("\n══════════════════════════════════════════════")
  console.log("Phase 1: shopstyle.it with retailerUrl (extract real URL)")
  console.log("══════════════════════════════════════════════\n")

  const products = await prisma.product.findMany({
    where: {
      affiliateUrl: { contains: "shopstyle.it" },
      linkAlive: false,
      retailerUrl: { not: null },
    },
    select: {
      id: true,
      affiliateUrl: true,
      retailerUrl: true,
      brand: true,
      itemName: true,
    },
  })

  console.log(`Found ${products.length} products with extractable retailerUrl\n`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const realUrl = extractRetailerFromShopStyleUrl(product.retailerUrl!)

    if (realUrl) {
      const domain = extractDomain(realUrl)
      const retailerName = domain ? domainToName(domain) : null
      const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(realUrl)

      await prisma.product.update({
        where: { id: product.id },
        data: {
          affiliateUrl: newAffiliateUrl,
          retailerUrl: realUrl,
          retailerDomain: domain,
          retailerName: retailerName,
          linkAlive: true,
          lastCheckedAt: new Date(),
        },
      })

      stats.shopstyleExtracted++
      if (stats.shopstyleExtracted % 100 === 0 || i < 5) {
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} ✓`
        )
      }
    } else {
      stats.shopstyleExtractFailed++
      if (stats.shopstyleExtractFailed <= 5) {
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} — could not extract URL from: ${product.retailerUrl?.substring(0, 80)}`
        )
      }
    }
  }

  console.log(
    `\nPhase 1 done: ${stats.shopstyleExtracted} extracted, ${stats.shopstyleExtractFailed} failed`
  )
}

async function phase2_shopstyleWithoutRetailerUrl() {
  console.log("\n══════════════════════════════════════════════")
  console.log("Phase 2: shopstyle.it without retailerUrl (try redirects)")
  console.log("══════════════════════════════════════════════\n")

  const products = await prisma.product.findMany({
    where: {
      affiliateUrl: { contains: "shopstyle.it" },
      linkAlive: false,
      retailerUrl: null,
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
  })

  console.log(
    `Found ${products.length} products — trying redirects then search fallback\n`
  )

  for (let i = 0; i < products.length; i++) {
    const product = products[i]

    // Try following the redirect chain
    const resolvedUrl = await followRedirects(product.affiliateUrl)

    if (resolvedUrl) {
      const domain = extractDomain(resolvedUrl)
      const retailerName = domain ? domainToName(domain) : null
      const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(resolvedUrl)

      await prisma.product.update({
        where: { id: product.id },
        data: {
          affiliateUrl: newAffiliateUrl,
          retailerUrl: resolvedUrl,
          retailerDomain: domain,
          retailerName: retailerName,
          linkAlive: true,
          lastCheckedAt: new Date(),
        },
      })

      stats.shopstyleRedirectResolved++
      console.log(
        `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} (redirect) ✓`
      )
    } else {
      // Redirect failed — try search fallback
      const searchUrl = buildSearchFallback(product.brand, product.itemName)
      if (searchUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            affiliateUrl: searchUrl,
            linkAlive: true,
            lastCheckedAt: new Date(),
          },
        })
        stats.shopstyleSearchFallback++
        if (stats.shopstyleSearchFallback % 50 === 0 || i < 5) {
          console.log(
            `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → search fallback`
          )
        }
      } else {
        // No brand info, truly dead
        await prisma.product.update({
          where: { id: product.id },
          data: { lastCheckedAt: new Date() },
        })
        stats.shopstyleTrulyDead++
      }
    }

    // Rate limit only for HTTP requests
    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log(
    `\nPhase 2 done: ${stats.shopstyleRedirectResolved} via redirect, ${stats.shopstyleSearchFallback} search fallback, ${stats.shopstyleTrulyDead} truly dead`
  )
}

async function phase3_rstyleMe() {
  console.log("\n══════════════════════════════════════════════")
  console.log("Phase 3: rstyle.me (follow redirects)")
  console.log("══════════════════════════════════════════════\n")

  const products = await prisma.product.findMany({
    where: {
      affiliateUrl: { contains: "rstyle.me" },
      linkAlive: true,
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
  })

  console.log(`Found ${products.length} products with rstyle.me URLs\n`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]

    const resolvedUrl = await followRedirects(product.affiliateUrl)

    if (resolvedUrl) {
      const domain = extractDomain(resolvedUrl)
      const retailerName = domain ? domainToName(domain) : null
      const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(resolvedUrl)

      await prisma.product.update({
        where: { id: product.id },
        data: {
          affiliateUrl: newAffiliateUrl,
          retailerUrl: resolvedUrl,
          retailerDomain: domain,
          retailerName: retailerName,
          lastCheckedAt: new Date(),
        },
      })

      stats.rstyleResolved++
      console.log(
        `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} ✓`
      )
    } else {
      // Try search fallback
      const searchUrl = buildSearchFallback(product.brand, product.itemName)
      if (searchUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            affiliateUrl: searchUrl,
            linkAlive: true,
            lastCheckedAt: new Date(),
          },
        })
        stats.rstyleSearchFallback++
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → search fallback`
        )
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            linkAlive: false,
            lastCheckedAt: new Date(),
          },
        })
        stats.rstyleDead++
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → DEAD`
        )
      }
    }

    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log(
    `\nPhase 3 done: ${stats.rstyleResolved} resolved, ${stats.rstyleSearchFallback} search fallback, ${stats.rstyleDead} dead`
  )
}

async function phase4_linksynergy() {
  console.log("\n══════════════════════════════════════════════")
  console.log("Phase 4: linksynergy.com (extract murl param)")
  console.log("══════════════════════════════════════════════\n")

  const products = await prisma.product.findMany({
    where: {
      affiliateUrl: { contains: "linksynergy.com" },
      linkAlive: true,
    },
    select: {
      id: true,
      affiliateUrl: true,
      brand: true,
      itemName: true,
    },
  })

  console.log(`Found ${products.length} products with linksynergy.com URLs\n`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const realUrl = extractRetailerFromLinkSynergy(product.affiliateUrl)

    if (realUrl) {
      const domain = extractDomain(realUrl)
      const retailerName = domain ? domainToName(domain) : null
      const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(realUrl)

      await prisma.product.update({
        where: { id: product.id },
        data: {
          affiliateUrl: newAffiliateUrl,
          retailerUrl: realUrl,
          retailerDomain: domain,
          retailerName: retailerName,
          lastCheckedAt: new Date(),
        },
      })

      stats.linksynergyExtracted++
      if (stats.linksynergyExtracted % 50 === 0 || i < 5) {
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} ✓`
        )
      }
    } else {
      // No murl param — try following redirect
      const resolvedUrl = await followRedirects(product.affiliateUrl)
      if (resolvedUrl) {
        const domain = extractDomain(resolvedUrl)
        const retailerName = domain ? domainToName(domain) : null
        const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(resolvedUrl)

        await prisma.product.update({
          where: { id: product.id },
          data: {
            affiliateUrl: newAffiliateUrl,
            retailerUrl: resolvedUrl,
            retailerDomain: domain,
            retailerName: retailerName,
            lastCheckedAt: new Date(),
          },
        })
        stats.linksynergyExtracted++
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} (redirect) ✓`
        )
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            linkAlive: false,
            lastCheckedAt: new Date(),
          },
        })
        stats.linksynergyFailed++
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → DEAD`
        )
      }

      // Rate limit for HTTP calls only
      if (i < products.length - 1) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
      }
    }
  }

  console.log(
    `\nPhase 4 done: ${stats.linksynergyExtracted} extracted, ${stats.linksynergyFailed} failed`
  )
}

async function phase0_fixShopstyleRetailerUrls() {
  console.log("\n══════════════════════════════════════════════")
  console.log("Phase 0: Fix products with shopstyle.com retailerUrl (from prior run)")
  console.log("══════════════════════════════════════════════\n")

  // Find products that have shopstyle.com/action/apiVisitRetailer URLs in retailerUrl
  // These were either from the original script or from Phase 2's first run
  const products = await prisma.product.findMany({
    where: {
      retailerUrl: { contains: "shopstyle.com/action/apiVisitRetailer" },
    },
    select: {
      id: true,
      retailerUrl: true,
      brand: true,
      itemName: true,
    },
  })

  console.log(`Found ${products.length} products with shopstyle.com retailerUrl to fix\n`)

  let fixed = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const realUrl = extractRetailerFromShopStyleUrl(product.retailerUrl!)

    if (realUrl) {
      const domain = extractDomain(realUrl)
      const retailerName = domain ? domainToName(domain) : null
      const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(realUrl)

      await prisma.product.update({
        where: { id: product.id },
        data: {
          affiliateUrl: newAffiliateUrl,
          retailerUrl: realUrl,
          retailerDomain: domain,
          retailerName: retailerName,
          linkAlive: true,
          lastCheckedAt: new Date(),
        },
      })

      fixed++
      if (fixed % 100 === 0 || i < 5) {
        console.log(
          `  [${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} ✓`
        )
      }
    } else {
      failed++
    }
  }

  console.log(`\nPhase 0 done: ${fixed} fixed, ${failed} failed`)
}

async function printSummary() {
  console.log("\n\n══════════════════════════════════════════════")
  console.log("FINAL SUMMARY")
  console.log("══════════════════════════════════════════════\n")

  const totalFixed =
    stats.shopstyleExtracted +
    stats.shopstyleRedirectResolved +
    stats.shopstyleSearchFallback +
    stats.rstyleResolved +
    stats.rstyleSearchFallback +
    stats.linksynergyExtracted

  const totalDead =
    stats.shopstyleExtractFailed +
    stats.shopstyleTrulyDead +
    stats.rstyleDead +
    stats.linksynergyFailed

  console.log(`Total fixed: ${totalFixed}`)
  console.log(`  shopstyle.it (URL extracted): ${stats.shopstyleExtracted}`)
  console.log(`  shopstyle.it (redirect resolved): ${stats.shopstyleRedirectResolved}`)
  console.log(`  shopstyle.it (search fallback): ${stats.shopstyleSearchFallback}`)
  console.log(`  rstyle.me (resolved): ${stats.rstyleResolved}`)
  console.log(`  rstyle.me (search fallback): ${stats.rstyleSearchFallback}`)
  console.log(`  linksynergy.com (extracted): ${stats.linksynergyExtracted}`)
  console.log(``)
  console.log(`Still dead: ${totalDead}`)
  console.log(`  shopstyle.it (extract failed): ${stats.shopstyleExtractFailed}`)
  console.log(`  shopstyle.it (truly dead): ${stats.shopstyleTrulyDead}`)
  console.log(`  rstyle.me (dead): ${stats.rstyleDead}`)
  console.log(`  linksynergy.com (failed): ${stats.linksynergyFailed}`)

  // Overall DB stats
  const totalProducts = await prisma.product.count()
  const aliveProducts = await prisma.product.count({ where: { linkAlive: true } })
  const deadProducts = await prisma.product.count({ where: { linkAlive: false } })

  console.log(`\n--- Database Status ---`)
  console.log(`Total products: ${totalProducts}`)
  console.log(`linkAlive=true: ${aliveProducts} (${((aliveProducts / totalProducts) * 100).toFixed(1)}%)`)
  console.log(`linkAlive=false: ${deadProducts} (${((deadProducts / totalProducts) * 100).toFixed(1)}%)`)

  // Retailer distribution
  const dist = await prisma.product.groupBy({
    by: ["retailerName"],
    where: { retailerName: { not: null } },
    _count: true,
    orderBy: { _count: { retailerName: "desc" } },
    take: 20,
  })
  console.log("\nTop retailers (after fix):")
  for (const r of dist) {
    console.log(`  ${r.retailerName}: ${r._count}`)
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("JBV-61: Dead Affiliate Link Resolver (Second Hop)")
  console.log("═══════════════════════════════════════════════")
  console.log(`Started at: ${new Date().toISOString()}\n`)

  // Phase 0: Fix products from prior run that stored shopstyle.com retailerUrls
  await phase0_fixShopstyleRetailerUrls()

  // Phase 1: No HTTP needed — pure URL extraction (fast)
  await phase1_shopstyleWithRetailerUrl()

  // Phase 2: HTTP redirect following (slow, ~529 requests)
  await phase2_shopstyleWithoutRetailerUrl()

  // Phase 3: HTTP redirect following (slow, ~113 requests)
  await phase3_rstyleMe()

  // Phase 4: Mostly URL extraction, some HTTP (fast for most)
  await phase4_linksynergy()

  await printSummary()

  console.log(`\nFinished at: ${new Date().toISOString()}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
