import * as cheerio from "cheerio"
import type { ParsedPost, GridProduct, TextProduct, ParsedProduct } from "./types"

/**
 * Parse a Daily Look post's HTML into structured data.
 * Shared by the backfill script and the webhook handler.
 */
export function parsePostHtml(html: string, url: string): ParsedPost {
  const $ = cheerio.load(html)
  const article = $("article.single-daily-look")

  // Title
  const title = $("h1.entry-title").text().trim() || article.attr("data-title") || "Untitled"

  // Slug from URL
  const slug = extractSlug(url)

  // Date from URL slug (daily-look-{M}-{D}-{YY}) or category header
  const date = extractDate(url, $)

  // WordPress post ID
  const wpPostId = parseInt(article.attr("data-id") || "", 10) || null

  // Categories from article class names
  const categories = extractCategories(article.attr("class") || "")

  // Outfit image — prefer og:image (full-res), fallback to inline img
  const ogImage = $('meta[property="og:image"]').attr("content") || null
  const inlineImage = $(".entry-content > img").attr("src") || null
  const outfitImageUrl = ogImage || inlineImage

  // Product grid images (CSS background-image)
  const gridProducts = parseProductGrid($)

  // Product text links
  const textProducts = parseProductText($)

  // Match grid images to text links by affiliate URL, then build final product list
  const products = mergeProducts(textProducts, gridProducts)

  return {
    title,
    slug,
    url,
    date,
    outfitImageUrl,
    products,
    rawHtml: html,
    wpPostId,
    categories,
  }
}

function extractSlug(url: string): string {
  // URL like: https://juliaberolzheimer.com/daily-looks/daily-look-3-28-26/
  const match = url.match(/\/daily-looks\/([^/]+)\/?$/)
  return match ? match[1] : url.replace(/[^a-z0-9-]/gi, "-").toLowerCase()
}

function extractDate(url: string, $: cheerio.CheerioAPI): Date {
  // Try URL slug: daily-look-{M}-{D}-{YY}
  // The trailing 2-digit number could be a year (24, 25, 26) or a look number (28, 30, 34).
  // Only treat as year if it's plausible (23 through current year + 1).
  const slugMatch = url.match(/daily-look-(\d{1,2})-(\d{1,2})-(\d{2})/)
  if (slugMatch) {
    const [, month, day, year] = slugMatch
    const yearNum = parseInt(year, 10)
    const maxYear = new Date().getFullYear() - 2000 + 1
    if (yearNum >= 23 && yearNum <= maxYear) {
      const fullYear = yearNum + 2000
      return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10))
    }
  }

  // Fallback: category header like "Mar 2026"
  const categoryText = $("div.category > h4").text().trim()
  if (categoryText) {
    const parsed = new Date(categoryText + " 1") // "Mar 2026" -> "Mar 2026 1"
    if (!isNaN(parsed.getTime())) return parsed
  }

  // Last fallback: og:image URL path /wp-content/uploads/YYYY/MM/
  const ogImage = $('meta[property="og:image"]').attr("content") || ""
  const uploadMatch = ogImage.match(/uploads\/(\d{4})\/(\d{2})\//)
  if (uploadMatch) {
    return new Date(parseInt(uploadMatch[1], 10), parseInt(uploadMatch[2], 10) - 1, 1)
  }

  return new Date() // shouldn't happen
}

function extractCategories(classAttr: string): string[] {
  const matches = classAttr.match(/daily-look-category-[\w-]+/g) || []
  return matches.map((c) => c.replace("daily-look-category-", ""))
}

function parseProductGrid($: cheerio.CheerioAPI): GridProduct[] {
  const products: GridProduct[] = []
  $("div.product-grid a.product-grid-item").each((_, el) => {
    const href = $(el).attr("href") || ""
    const style = $(el).attr("style") || ""
    const imageMatch = style.match(/background-image:\s*url\(([^)]+)\)/)
    const imageUrl = imageMatch ? imageMatch[1] : ""

    if (href) {
      products.push({ affiliateUrl: href, imageUrl })
    }
  })
  return products
}

function parseProductText($: cheerio.CheerioAPI): TextProduct[] {
  const products: TextProduct[] = []
  const paragraph = $("div.daily-look-content > p").first()
  if (!paragraph.length) return products

  const html = paragraph.html() || ""

  // Remove "Outfit Details:" prefix and <br> tags
  const cleaned = html
    .replace(/Outfit\s*Details:\s*/i, "")
    .replace(/<br\s*\/?>/gi, "")
    .trim()

  // Split by comma (but not commas inside parentheses)
  const segments = splitByComma(cleaned)

  for (const segment of segments) {
    const seg$ = cheerio.load(`<span>${segment.trim()}</span>`)

    // Find all links in this segment
    const links = seg$("a")

    if (links.length === 0) {
      // Plain text product with no link — skip (can't affiliate)
      continue
    }

    // Check if this segment has "similar/old/last seen" alternative pattern
    const segText = segment.toLowerCase()
    const hasAlternatives = /\(.*(?:similar|less expensive|old|last seen)/.test(segText)

    if (hasAlternatives) {
      // Pattern: "Brand Item (similar here and here)" or "Brand Item (old, similar here)"
      // The first link might be the main product itself, or all links might be alternatives

      // Get the full text and extract the main product name (before parenthetical)
      const fullText = seg$("span").text().trim()
      const mainName = fullText.replace(/\s*\(.*$/, "").trim()

      // Check if the first link's text is the product name (not "here"/"this")
      const firstLink = links.first()
      const firstLinkText = firstLink.text().trim().toLowerCase()
      const isFirstLinkMain = firstLinkText !== "here" && firstLinkText !== "this" &&
        firstLinkText.length > 4 // "here" is 4 chars

      if (isFirstLinkMain) {
        // First link IS the main product: <a href="...">Chanel Jacket</a> (similar <a>here</a>)
        const href = firstLink.attr("href") || ""
        if (href) {
          products.push({
            rawText: firstLink.text().trim(),
            affiliateUrl: href,
            isAlternative: false,
          })
        }
        // Remaining links are alternatives
        links.each((i, link) => {
          if (i === 0) return // skip the main product
          const href = seg$(link).attr("href") || ""
          if (href) {
            products.push({
              rawText: mainName,
              affiliateUrl: href,
              isAlternative: true,
            })
          }
        })
      } else {
        // No main product link — all links are alternatives for a plain-text product name
        links.each((_, link) => {
          const href = seg$(link).attr("href") || ""
          if (href) {
            products.push({
              rawText: mainName,
              affiliateUrl: href,
              isAlternative: true,
            })
          }
        })
      }
    } else {
      // Direct product link — anchor text is the product name
      const firstLink = links.first()
      const href = firstLink.attr("href") || ""
      const text = firstLink.text().trim()
      if (href && text) {
        products.push({
          rawText: text,
          affiliateUrl: href,
          isAlternative: false,
        })
      }
    }
  }

  return products
}

/**
 * Split HTML string by commas, but not commas inside parentheses.
 */
function splitByComma(html: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ""

  for (const char of html) {
    if (char === "(") depth++
    if (char === ")") depth--
    if (char === "," && depth === 0) {
      parts.push(current)
      current = ""
    } else {
      current += char
    }
  }
  if (current.trim()) parts.push(current)
  return parts
}

/**
 * Normalize affiliate URLs for comparison.
 * Strip tracking params and trailing slashes.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // For shopmy, the path + url param is the key
    if (u.hostname.includes("shopmy.us")) {
      const targetUrl = u.searchParams.get("url")
      return targetUrl ? `shopmy:${targetUrl}` : `shopmy:${u.pathname}`
    }
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "")
  } catch {
    return url
  }
}

/**
 * Merge text products with grid product images.
 * Grid products have images but no names; text products have names but no images.
 * Join on affiliate URL.
 */
function mergeProducts(
  textProducts: TextProduct[],
  gridProducts: GridProduct[]
): ParsedProduct[] {
  // Build a lookup from normalized URL to grid image
  const gridByUrl = new Map<string, string>()
  for (const gp of gridProducts) {
    gridByUrl.set(normalizeUrl(gp.affiliateUrl), gp.imageUrl)
  }

  const merged: ParsedProduct[] = []
  const usedGridUrls = new Set<string>()

  // First pass: match text products to grid images
  for (let i = 0; i < textProducts.length; i++) {
    const tp = textProducts[i]
    const normUrl = normalizeUrl(tp.affiliateUrl)
    const imageUrl = gridByUrl.get(normUrl) || null
    if (imageUrl) usedGridUrls.add(normUrl)

    const { brand, itemName } = parseBrandItem(tp.rawText)

    merged.push({
      rawText: tp.rawText,
      brand,
      itemName,
      affiliateUrl: tp.affiliateUrl,
      productImageUrl: imageUrl,
      sortOrder: i,
      isAlternative: tp.isAlternative,
    })
  }

  // Second pass: add grid-only products (no matching text link)
  for (const gp of gridProducts) {
    const normUrl = normalizeUrl(gp.affiliateUrl)
    if (!usedGridUrls.has(normUrl)) {
      merged.push({
        rawText: "",
        brand: null,
        itemName: null,
        affiliateUrl: gp.affiliateUrl,
        productImageUrl: gp.imageUrl,
        sortOrder: merged.length,
        isAlternative: false,
      })
    }
  }

  return merged
}

// Known brands for splitting "Brand Item" text
const KNOWN_BRANDS = [
  "Christopher John Rogers",
  "JB x Margaux",
  "Victoria Beckham",
  "Jil Sander",
  "Rosie Assoulin",
  "Lela Rose",
  "Arielle Ratner",
  "Oscar de la Renta",
  "Carolina Herrera",
  "Ulla Johnson",
  "Veronica Beard",
  "Simone Rocha",
  "Tory Burch",
  "Rachel Comey",
  "Miu Miu",
  "Chloe",
  "Chanel",
  "Hermes",
  "Gucci",
  "Doen",
  "Attersee",
  "Altuzarra",
  "Alaia",
  "Prada",
  "Fendi",
  "Loewe",
  "Zimmermann",
  "Staud",
  "Khaite",
  "Bottega",
  "Tuckernuck",
  "Mother",
  "Metier",
  "Margaux",
  "Mansur Gavriel",
  "Isabel Marant",
  "Toteme",
  "Reformation",
  "Jenni Kayne",
  "J.Crew",
  "Banana Republic",
  "Mango",
  "Zara",
  "H&M",
  "Gap",
  "Everlane",
  "COS",
  "& Other Stories",
]

function parseBrandItem(rawText: string): { brand: string | null; itemName: string | null } {
  if (!rawText) return { brand: null, itemName: null }

  const text = rawText.trim()

  // Try known brands (longest first to match multi-word brands)
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)
  for (const brand of sorted) {
    if (text.toLowerCase().startsWith(brand.toLowerCase())) {
      const rest = text.slice(brand.length).trim()
      return { brand, itemName: rest || null }
    }
  }

  // Fallback: first word is brand, rest is item
  const spaceIdx = text.indexOf(" ")
  if (spaceIdx > 0) {
    return { brand: text.slice(0, spaceIdx), itemName: text.slice(spaceIdx + 1) }
  }

  return { brand: text, itemName: null }
}
