import type { DiscoveredPost, ParsedPost } from "../../lib/ingest/types"
import { parsePostHtml } from "../../lib/ingest/parse-post-html"

const RATE_LIMIT_MS = 2000 // 2 seconds between requests
const MAX_RETRIES = 2

/**
 * Scrape a single post URL and return parsed data.
 */
async function scrapePost(post: DiscoveredPost): Promise<ParsedPost | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(post.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      })

      if (!response.ok) {
        console.error(`  HTTP ${response.status} for ${post.url}`)
        if (response.status === 429 || response.status >= 500) {
          // Rate limited or server error — wait and retry
          await sleep(5000 * (attempt + 1))
          continue
        }
        return null
      }

      const html = await response.text()
      return parsePostHtml(html, post.url)
    } catch (err) {
      console.error(`  Fetch error for ${post.url}: ${err}`)
      if (attempt < MAX_RETRIES) {
        await sleep(3000 * (attempt + 1))
      }
    }
  }
  return null
}

/**
 * Scrape multiple posts with rate limiting.
 * Returns an array of [post, parsedData | null] tuples.
 */
export async function scrapePosts(
  posts: DiscoveredPost[],
  onProgress?: (done: number, total: number, title: string) => void
): Promise<{ post: DiscoveredPost; parsed: ParsedPost | null }[]> {
  const results: { post: DiscoveredPost; parsed: ParsedPost | null }[] = []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const parsed = await scrapePost(post)

    if (parsed) {
      onProgress?.(i + 1, posts.length, parsed.title)
    } else {
      onProgress?.(i + 1, posts.length, `FAILED: ${post.slug}`)
    }

    results.push({ post, parsed })

    // Rate limiting — don't hammer the server
    if (i < posts.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  return results
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
