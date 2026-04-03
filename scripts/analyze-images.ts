import { PrismaClient } from "@prisma/client"
import { analyzeOutfitImage } from "../lib/ai/vision"

const prisma = new PrismaClient()
const RATE_LIMIT_MS = 1200 // ~1 req/sec with buffer
const BATCH_SIZE = 500

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Vision AI Analysis")
  console.log("═══════════════════════════════════════\n")

  // Find posts without vision data
  const posts = await prisma.post.findMany({
    where: {
      outfitImageUrl: { not: null },
      visionData: null,
    },
    include: {
      products: {
        where: { isAlternative: false },
        orderBy: { sortOrder: "asc" },
      },
    },
    take: BATCH_SIZE,
    orderBy: { date: "desc" },
  })

  console.log(`Found ${posts.length} posts to analyze\n`)

  if (posts.length === 0) {
    console.log("Nothing to do!")
    await prisma.$disconnect()
    return
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const pct = Math.round(((i + 1) / posts.length) * 100)

    try {
      console.log(`[${i + 1}/${posts.length}] (${pct}%) ${post.title}`)

      // Build product names for context
      const productNames = post.products
        .filter((p) => p.rawText)
        .map((p) => p.rawText)

      // Run vision analysis
      const analysis = await analyzeOutfitImage(post.outfitImageUrl!, productNames)

      // Store results
      await prisma.visionData.create({
        data: {
          postId: post.id,
          garments: analysis.garments,
          palette: analysis.palette,
          mood: analysis.mood,
          season: analysis.season,
          formality: analysis.formality,
          setting: analysis.setting,
          vibeKeywords: analysis.vibeKeywords,
          stylingNotes: analysis.stylingNotes,
          modelVersion: "claude-sonnet-4-20250514",
          processedAt: new Date(),
        },
      })

      // Update post season from AI analysis
      await prisma.post.update({
        where: { id: post.id },
        data: { season: analysis.season },
      })

      console.log(`  ✓ ${analysis.vibeKeywords.slice(0, 5).join(", ")} | ${analysis.mood} | ${analysis.season}`)
      successCount++
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`)
      failCount++
    }

    // Rate limiting
    if (i < posts.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log("\n═══════════════════════════════════════")
  console.log("Analysis Complete!")
  console.log("═══════════════════════════════════════")
  console.log(`  Analyzed: ${successCount}`)
  console.log(`  Failed:   ${failCount}`)

  const totalVision = await prisma.visionData.count()
  console.log(`  Total VisionData records: ${totalVision}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
