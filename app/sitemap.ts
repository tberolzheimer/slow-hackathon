import { prisma } from "@/lib/db/prisma"
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

  return [
    { url: BASE_URL, lastModified: new Date() },
    ...vibes.map((v) => ({
      url: `${BASE_URL}/vibe/${v.slug}`,
      lastModified: v.updatedAt,
    })),
    ...posts.map((p) => ({
      url: `${BASE_URL}/look/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ]
}
