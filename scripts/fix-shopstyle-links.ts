import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const RATE_LIMIT_MS = 500
const SHOPMY_BASE = "https://go.shopmy.us/ap/juliaberolzheimer?url="

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
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function domainToName(domain: string): string {
  for (const [key, name] of Object.entries(DOMAIN_NAMES)) {
    if (domain.endsWith(key)) return name
  }
  const parts = domain.split(".")
  const name = parts[parts.length - 2] || parts[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

async function followShopStyleRedirect(url: string): Promise<string | null> {
  try {
    // ShopStyle URLs redirect to the retailer
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    })

    const location = res.headers.get("location")
    if (location) {
      // Sometimes it's a double redirect — follow one more hop
      if (location.includes("shopstyle.com")) {
        const res2 = await fetch(location, { method: "GET", redirect: "manual" })
        return res2.headers.get("location")
      }
      return location
    }

    // If no redirect, try parsing the URL parameter
    try {
      const u = new URL(url)
      const targetUrl = u.searchParams.get("url")
      if (targetUrl) return decodeURIComponent(targetUrl)
    } catch {}

    return null
  } catch {
    return null
  }
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibéShop ShopStyle → ShopMy Link Fixer")
  console.log("═══════════════════════════════════════\n")

  // Find all products with ShopStyle affiliate URLs
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { affiliateUrl: { contains: "shopstyle" } },
        { retailerDomain: { contains: "shopstyle" } },
        { retailerName: "ShopStyle" },
      ],
    },
    select: { id: true, affiliateUrl: true, brand: true, itemName: true },
  })

  console.log(`Found ${products.length} ShopStyle products to fix\n`)

  let fixed = 0
  let dead = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const product = products[i]

    try {
      // Follow the ShopStyle redirect to find the real retailer URL
      const retailerUrl = await followShopStyleRedirect(product.affiliateUrl)

      if (retailerUrl && !retailerUrl.includes("shopstyle")) {
        const domain = extractDomain(retailerUrl)
        const retailerName = domain ? domainToName(domain) : null

        // Build new ShopMy affiliate URL
        const newAffiliateUrl = SHOPMY_BASE + encodeURIComponent(retailerUrl)

        await prisma.product.update({
          where: { id: product.id },
          data: {
            affiliateUrl: newAffiliateUrl,
            retailerUrl: retailerUrl,
            retailerDomain: domain,
            retailerName: retailerName,
          },
        })

        fixed++
        if (fixed % 50 === 0 || i < 10) {
          console.log(`[${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${retailerName} (ShopMy)`)
        }
      } else {
        // ShopStyle link is truly dead — can't resolve
        await prisma.product.update({
          where: { id: product.id },
          data: { linkAlive: false },
        })
        dead++
      }
    } catch {
      failed++
    }

    if (i < products.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log("\n═══════════════════════════════════════")
  console.log("Done!")
  console.log(`  Fixed (→ ShopMy): ${fixed}`)
  console.log(`  Dead (marked linkAlive=false): ${dead}`)
  console.log(`  Failed: ${failed}`)

  // Show updated retailer distribution
  const dist = await prisma.product.groupBy({
    by: ["retailerName"],
    where: { retailerName: { not: null } },
    _count: true,
    orderBy: { _count: { retailerName: "desc" } },
    take: 15,
  })
  console.log("\nTop retailers (after fix):")
  for (const r of dist) {
    console.log(`  ${r.retailerName}: ${r._count}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
