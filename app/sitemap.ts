import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import type { MetadataRoute } from "next"

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vibes = await prisma.vibe.findMany({
    where: { approvedAt: { not: null } },
    select: { slug: true, updatedAt: true },
  })

  const posts = await prisma.post.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { date: "desc" },
  })

  // Brand pages (brands with 3+ products)
  const brands = await prisma.$queryRaw<{ brand: string }[]>`
    SELECT DISTINCT brand FROM products
    WHERE brand IS NOT NULL AND "isAlternative" = false
    GROUP BY brand
    HAVING COUNT(DISTINCT "postId") >= 3
  `

  const seasons = ["spring", "summer", "fall", "winter"]

  return [
    { url: BASE_URL, lastModified: new Date() },
    // Vibe pages
    ...vibes.map((v) => ({
      url: `${BASE_URL}/vibe/${v.slug}`,
      lastModified: v.updatedAt,
    })),
    // Look pages
    ...posts.map((p) => ({
      url: `${BASE_URL}/look/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    // Brand pages
    ...brands.map((b) => ({
      url: `${BASE_URL}/brand/${b.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      lastModified: new Date(),
    })),
    // Season pages
    ...seasons.map((s) => ({
      url: `${BASE_URL}/season/${s}`,
      lastModified: new Date(),
    })),
    // Style guide pages (keyword-targeted SEO)
    ...[
      "spring-wedding-guest-dresses", "casual-spring-outfits", "spring-outfits-women",
      "spring-outfit-ideas", "spring-dress-with-jacket", "spring-work-outfits",
      "spring-capsule-wardrobe", "spring-brunch-outfit", "spring-date-night-outfit",
      "spring-fashion-2026",
    ].map((s) => ({
      url: `${BASE_URL}/style/${s}`,
      lastModified: new Date(),
    })),
  ]
}
