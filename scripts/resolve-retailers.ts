import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const RATE_LIMIT_MS = 500
const BATCH_SIZE = 500

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
  "margauxny.com": "Margaux",
  "dfrfrnt.com": "Dôen",
  "tuckernuck.com": "Tuckernuck",
  "jcrew.com": "J.Crew",
  "mango.com": "Mango",
  "zara.com": "Zara",
  "hm.com": "H&M",
  "cos.com": "COS",
  "everlane.com": "Everlane",
  "reformation.com": "Reformation",
  "stories.com": "& Other Stories",
  "bananarepublic.com": "Banana Republic",
  "gap.com": "Gap",
  "bloomingdales.com": "Bloomingdale's",
  "neimanmarcus.com": "Neiman Marcus",
  "nordstromrack.com": "Nordstrom Rack",
  "asos.com": "ASOS",
  "freepeople.com": "Free People",
  "anthropologie.com": "Anthropologie",
  "target.com": "Target",
  "walmart.com": "Walmart",
  "shopstyle.com": "ShopStyle",
  "nordstrom.sjv.io": "Nordstrom",
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url)
    // Remove www. prefix
    return u.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function domainToName(domain: string): string {
  // Check exact match
  if (DOMAIN_NAMES[domain]) return DOMAIN_NAMES[domain]

  // Check if domain ends with a known domain (e.g., subdomain.nordstrom.com)
  for (const [key, name] of Object.entries(DOMAIN_NAMES)) {
    if (domain.endsWith(key)) return name
  }

  // Capitalize the domain name as fallback
  const parts = domain.split(".")
  const name = parts[parts.length - 2] || parts[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

async function resolveAffiliateUrl(affiliateUrl: string): Promise<{
  retailerUrl: string | null
  retailerDomain: string | null
  retailerName: string | null
}> {
  // Strategy 1: ShopMy URLs with encoded destination
  if (affiliateUrl.includes("go.shopmy.us/ap/")) {
    try {
      const u = new URL(affiliateUrl)
      const encodedUrl = u.searchParams.get("url")
      if (encodedUrl) {
        const retailerUrl = decodeURIComponent(encodedUrl)
        const domain = extractDomain(retailerUrl)
        return {
          retailerUrl,
          retailerDomain: domain,
          retailerName: domain ? domainToName(domain) : null,
        }
      }
    } catch {
      // Fall through to redirect following
    }
  }

  // Strategy 2: Follow redirect
  try {
    const res = await fetch(affiliateUrl, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    })
    const location = res.headers.get("location")
    if (location) {
      const domain = extractDomain(location)
      return {
        retailerUrl: location,
        retailerDomain: domain,
        retailerName: domain ? domainToName(domain) : null,
      }
    }
  } catch {
    // Failed to resolve
  }

  return { retailerUrl: null, retailerDomain: null, retailerName: null }
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibéShop Retailer URL Resolver")
  console.log("═══════════════════════════════════════\n")

  const products = await prisma.product.findMany({
    where: {
      retailerName: null,
      isAlternative: false,
    },
    select: { id: true, affiliateUrl: true, brand: true, itemName: true },
    take: BATCH_SIZE,
  })

  console.log(`Found ${products.length} products to resolve\n`)

  let resolved = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const product = products[i]

    try {
      const result = await resolveAffiliateUrl(product.affiliateUrl)

      if (result.retailerName) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            retailerName: result.retailerName,
            retailerUrl: result.retailerUrl,
            retailerDomain: result.retailerDomain,
          },
        })
        resolved++
        if (resolved % 50 === 0 || i < 10) {
          console.log(`[${i + 1}/${products.length}] ${product.brand} ${product.itemName} → ${result.retailerName}`)
        }
      } else {
        failed++
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
  console.log(`  Resolved: ${resolved}`)
  console.log(`  Failed: ${failed}`)

  // Show retailer distribution
  const dist = await prisma.product.groupBy({
    by: ["retailerName"],
    where: { retailerName: { not: null } },
    _count: true,
    orderBy: { _count: { retailerName: "desc" } },
    take: 15,
  })
  console.log("\nTop retailers:")
  for (const r of dist) {
    console.log(`  ${r.retailerName}: ${r._count}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
