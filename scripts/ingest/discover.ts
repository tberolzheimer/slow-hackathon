import { parseStringPromise } from "xml2js"
import type { DiscoveredPost } from "../../lib/ingest/types"

/**
 * Discover Daily Look post URLs from the WordPress sitemaps.
 * Filters to posts after the given cutoff date.
 */
export async function discoverPosts(afterDate: Date): Promise<DiscoveredPost[]> {
  const sitemapUrls = [
    "https://juliaberolzheimer.com/daily_look-sitemap3.xml",
    "https://juliaberolzheimer.com/daily_look-sitemap2.xml",
    "https://juliaberolzheimer.com/daily_look-sitemap1.xml",
  ]

  const allPosts: DiscoveredPost[] = []

  for (const sitemapUrl of sitemapUrls) {
    console.log(`Fetching sitemap: ${sitemapUrl}`)
    try {
      const response = await fetch(sitemapUrl)
      if (!response.ok) {
        console.log(`  Sitemap returned ${response.status}, skipping`)
        continue
      }

      const xml = await response.text()
      const result = await parseStringPromise(xml)
      const urls = result.urlset?.url || []

      for (const entry of urls) {
        const loc: string = entry.loc?.[0] || ""
        const lastmod: string = entry.lastmod?.[0] || ""

        if (!loc.includes("/daily-looks/")) continue

        // Extract slug
        const slugMatch = loc.match(/\/daily-looks\/([^/]+)\/?$/)
        if (!slugMatch) continue
        const slug = slugMatch[1]

        // Filter by date if we can parse it from the slug
        const dateMatch = slug.match(/daily-look-(\d{1,2})-(\d{1,2})-(\d{2})$/)
        if (dateMatch) {
          const [, month, day, year] = dateMatch
          const postDate = new Date(
            parseInt(year, 10) + 2000,
            parseInt(month, 10) - 1,
            parseInt(day, 10)
          )
          if (postDate < afterDate) continue
        } else if (lastmod) {
          // Fallback: use lastmod date
          const modDate = new Date(lastmod)
          if (modDate < afterDate) continue
        }

        allPosts.push({ url: loc, slug, lastmod })
      }

      console.log(`  Found ${urls.length} entries, ${allPosts.length} total after filtering`)
    } catch (err) {
      console.error(`  Error fetching sitemap: ${err}`)
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = allPosts.filter((p) => {
    if (seen.has(p.url)) return false
    seen.add(p.url)
    return true
  })

  console.log(`\nDiscovered ${unique.length} posts after ${afterDate.toISOString().split("T")[0]}`)
  return unique
}
