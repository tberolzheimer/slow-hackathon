/**
 * Backfill VisionData for posts missing it.
 *
 * Pipeline:
 * 1. Find posts with outfitImageUrl but no VisionData
 * 2. Run Claude Sonnet vision analysis on each
 * 3. Store VisionData record + update post season
 * 4. Compute embedding from vision attributes
 * 5. Score against vibe centroids and create VibeAssignment
 */

import { PrismaClient } from "@prisma/client"
import { analyzeOutfitImage } from "../lib/ai/vision"
import { computeEmbedding } from "../lib/ai/embeddings"

const prisma = new PrismaClient()
const RATE_LIMIT_MS = 1200 // ~1 req/sec with buffer

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Backfill: Vision + Vibes")
  console.log("═══════════════════════════════════════\n")

  // ─── Phase 1: Vision Analysis ─────────────────────────

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
    orderBy: { date: "desc" },
  })

  console.log(`Phase 1: Vision Analysis — ${posts.length} posts to analyze\n`)

  if (posts.length === 0) {
    console.log("All posts already have VisionData. Skipping to Phase 2.\n")
  }

  let successCount = 0
  let failCount = 0
  const analyzedPostIds: string[] = []

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

      // Compute embedding from vision attributes
      const embedding = computeEmbedding({
        season: analysis.season,
        formality: analysis.formality,
        mood: analysis.mood,
        palette: analysis.palette,
        vibeKeywords: analysis.vibeKeywords,
      })

      // Store VisionData with embedding
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
          embedding: embedding,
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
      analyzedPostIds.push(post.id)
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

  if (posts.length > 0) {
    console.log(`\nPhase 1 Complete: ${successCount} analyzed, ${failCount} failed\n`)
  }

  // ─── Phase 2: Vibe Assignment ─────────────────────────

  console.log("Phase 2: Vibe Assignment\n")

  // Load approved vibes with centroids
  const vibes = await prisma.vibe.findMany({
    where: { centroid: { not: undefined }, approvedAt: { not: null } },
    select: { id: true, name: true, slug: true, centroid: true },
  })

  if (vibes.length === 0) {
    console.log("No approved vibes with centroids found. Skipping vibe assignment.")
    console.log("Run the clustering script first, then approve vibes.\n")
  } else {
    console.log(`Found ${vibes.length} approved vibes\n`)

    // Find all VisionData that don't have vibe assignments yet
    // (include both just-analyzed and any previously missed)
    const unassigned = await prisma.visionData.findMany({
      where: {
        post: {
          vibeAssignments: { none: {} },
        },
      },
      select: {
        postId: true,
        season: true,
        formality: true,
        mood: true,
        palette: true,
        vibeKeywords: true,
        embedding: true,
        post: { select: { title: true } },
      },
    })

    console.log(`${unassigned.length} posts need vibe assignment\n`)

    let assignedCount = 0
    const CONFIDENCE_THRESHOLD = 0.3

    for (const vd of unassigned) {
      // Get or compute embedding
      let embedding: number[]
      if (vd.embedding && Array.isArray(vd.embedding) && (vd.embedding as number[]).length > 0) {
        embedding = vd.embedding as number[]
      } else {
        embedding = computeEmbedding({
          season: vd.season,
          formality: vd.formality,
          mood: vd.mood,
          palette: vd.palette,
          vibeKeywords: vd.vibeKeywords,
        })
        // Store the computed embedding
        await prisma.visionData.update({
          where: { postId: vd.postId },
          data: { embedding },
        })
      }

      // Score against all vibes
      const scored = vibes
        .map((vibe) => {
          const centroid = vibe.centroid as number[]
          if (!centroid || centroid.length === 0) return null
          const distance = euclideanDistance(embedding, centroid)
          const maxDist = 1.5
          const confidence = Math.max(0, Math.min(1, 1 - distance / maxDist))
          return { vibeId: vibe.id, name: vibe.name, slug: vibe.slug, distance, confidence }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => a.distance - b.distance)

      // Assign to best matching vibe above threshold
      const bestMatch = scored[0]
      if (bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
        await prisma.vibeAssignment.create({
          data: {
            postId: vd.postId,
            vibeId: bestMatch.vibeId,
            confidenceScore: Math.round(bestMatch.confidence * 100) / 100,
            assignedBy: "ai",
          },
        })
        console.log(`  ✓ "${vd.post.title}" → ${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(0)}%)`)
        assignedCount++
      } else {
        // Assign to closest vibe even if below threshold (with low confidence noted)
        if (bestMatch) {
          await prisma.vibeAssignment.create({
            data: {
              postId: vd.postId,
              vibeId: bestMatch.vibeId,
              confidenceScore: Math.round(bestMatch.confidence * 100) / 100,
              assignedBy: "ai",
            },
          })
          console.log(`  ~ "${vd.post.title}" → ${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(0)}% - low confidence)`)
          assignedCount++
        }
      }
    }

    console.log(`\nPhase 2 Complete: ${assignedCount} vibe assignments created\n`)
  }

  // ─── Summary ──────────────────────────────────────────

  console.log("═══════════════════════════════════════")
  console.log("Backfill Complete!")
  console.log("═══════════════════════════════════════")

  const totalVision = await prisma.visionData.count()
  const totalPosts = await prisma.post.count({ where: { outfitImageUrl: { not: null } } })
  const totalAssignments = await prisma.vibeAssignment.count()
  const postsWithoutVision = await prisma.post.count({
    where: { outfitImageUrl: { not: null }, visionData: null },
  })

  console.log(`  VisionData records:  ${totalVision} / ${totalPosts} posts with images`)
  console.log(`  Posts still missing:  ${postsWithoutVision}`)
  console.log(`  Vibe assignments:     ${totalAssignments}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
