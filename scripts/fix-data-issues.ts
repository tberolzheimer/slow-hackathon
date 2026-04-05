/**
 * Fix two data issues:
 * 1. 4 posts with future dates (>2027) — slug suffix was misread as year
 *    Fix: extract correct year/month from rawHtml category header or upload path,
 *    and day from the slug's M-D component.
 * 2. 24 posts with null season — copy season from VisionData where available
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function fixFutureDates() {
  console.log("\n=== Issue 1: Posts with future dates (>2027) ===\n")

  const futurePosts = await prisma.post.findMany({
    where: {
      date: { gt: new Date("2027-01-01") },
    },
    select: { id: true, title: true, date: true, url: true, slug: true, rawHtml: true },
  })

  console.log(`Found ${futurePosts.length} posts with date > 2027-01-01:\n`)

  let fixed = 0
  for (const post of futurePosts) {
    console.log(`  Post: "${post.title}"`)
    console.log(`    Slug: ${post.slug}`)
    console.log(`    Bad date: ${post.date.toISOString()}`)

    // The slug is daily-look-M-D-NN where M and D are the real month/day
    // but NN is a look number that was wrongly interpreted as year.
    // Get month and day from the slug.
    const slugMatch = post.slug.match(/daily-look-(\d{1,2})-(\d{1,2})-(\d+)/)
    if (!slugMatch) {
      console.log(`    Could not parse slug — skipping\n`)
      continue
    }
    const [, slugMonth, slugDay] = slugMatch
    const month = parseInt(slugMonth, 10)
    const day = parseInt(slugDay, 10)

    // Get the correct year from rawHtml:
    // 1) Category header like "Apr 2024"
    // 2) Upload path like /uploads/2024/04/
    let year: number | null = null

    if (post.rawHtml) {
      // Try category header first (most reliable)
      const catMatch = post.rawHtml.match(/class="category"[\s\S]*?<h4>([^<]+)<\/h4>/)
      if (catMatch) {
        const catText = catMatch[1].trim() // e.g. "Apr 2024"
        const yearMatch = catText.match(/\b(20\d{2})\b/)
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10)
          console.log(`    Category header: "${catText}" -> year ${year}`)
        }
      }

      // Fallback: upload path
      if (year === null) {
        const uploadMatch = post.rawHtml.match(/uploads\/(\d{4})\/(\d{2})\//)
        if (uploadMatch) {
          year = parseInt(uploadMatch[1], 10)
          console.log(`    Upload path: ${uploadMatch[1]}/${uploadMatch[2]} -> year ${year}`)
        }
      }
    }

    if (year === null) {
      console.log(`    Could not determine correct year — skipping\n`)
      continue
    }

    const correctDate = new Date(year, month - 1, day)
    console.log(`    Corrected date: ${correctDate.toISOString()}`)

    await prisma.post.update({
      where: { id: post.id },
      data: { date: correctDate },
    })
    fixed++
    console.log(`    Updated!\n`)
  }

  // Verify
  const remaining = await prisma.post.count({
    where: { date: { gt: new Date("2027-01-01") } },
  })
  console.log(`Fixed: ${fixed}/${futurePosts.length}`)
  console.log(`Remaining posts with future dates (>2027): ${remaining}`)
}

async function fixMissingSeasons() {
  console.log("\n=== Issue 2: Posts with null season ===\n")

  const totalNullSeason = await prisma.post.count({ where: { season: null } })
  console.log(`Total posts with null season: ${totalNullSeason}`)

  // Find posts with null season that have VisionData with a non-null season
  const postsWithNullSeason = await prisma.post.findMany({
    where: {
      season: null,
      visionData: {
        season: { not: null },
      },
    },
    select: {
      id: true,
      title: true,
      season: true,
      visionData: {
        select: { season: true },
      },
    },
  })

  console.log(
    `Posts with null season that have VisionData.season: ${postsWithNullSeason.length}\n`
  )

  let fixed = 0
  for (const post of postsWithNullSeason) {
    const visionSeason = post.visionData?.season
    if (!visionSeason) continue

    console.log(`  "${post.title}" -> season: "${visionSeason}"`)

    await prisma.post.update({
      where: { id: post.id },
      data: { season: visionSeason },
    })
    fixed++
  }

  // Verify
  const remainingNull = await prisma.post.count({ where: { season: null } })
  const remainingFixable = await prisma.post.count({
    where: {
      season: null,
      visionData: { season: { not: null } },
    },
  })

  console.log(`\nFixed: ${fixed}`)
  console.log(`Remaining posts with null season (total): ${remainingNull}`)
  console.log(`Remaining fixable (have VisionData.season): ${remainingFixable}`)

  if (remainingNull > 0 && remainingFixable === 0) {
    console.log(
      `Note: ${remainingNull} posts still have null season but lack VisionData entirely — they need vision processing first.`
    )
  }
}

async function main() {
  try {
    await fixFutureDates()
    await fixMissingSeasons()
  } finally {
    await prisma.$disconnect()
  }
}

main()
