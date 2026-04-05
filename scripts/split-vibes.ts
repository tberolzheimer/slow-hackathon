import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"
import { computeEmbedding } from "../lib/ai/embeddings"

const prisma = new PrismaClient()
const anthropic = new Anthropic()
const MAX_VIBE_SIZE = 80

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += (a[i] - b[i]) ** 2
  }
  return Math.sqrt(sum)
}

function kmeans(data: number[][], k: number, maxIter: number = 50) {
  const n = data.length
  const dim = data[0].length

  // k-means++ init
  const centroids: number[][] = [[...data[Math.floor(Math.random() * n)]]]
  for (let c = 1; c < k; c++) {
    const distances = data.map((p) => {
      let minDist = Infinity
      for (const cent of centroids) minDist = Math.min(minDist, euclideanDistance(p, cent))
      return minDist * minDist
    })
    const total = distances.reduce((a, b) => a + b, 0)
    let target = Math.random() * total
    for (let i = 0; i < n; i++) {
      target -= distances[i]
      if (target <= 0) { centroids.push([...data[i]]); break }
    }
    if (centroids.length <= c) centroids.push([...data[Math.floor(Math.random() * n)]])
  }

  let assignments = new Array(n).fill(0)
  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = data.map((p) => {
      let minDist = Infinity, minIdx = 0
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(p, centroids[c])
        if (d < minDist) { minDist = d; minIdx = c }
      }
      return minIdx
    })
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments
    if (!changed) break
    for (let c = 0; c < k; c++) {
      const members = data.filter((_, i) => assignments[i] === c)
      if (members.length === 0) continue
      for (let d = 0; d < dim; d++) {
        centroids[c][d] = members.reduce((sum, m) => sum + m[d], 0) / members.length
      }
    }
  }
  return { assignments, centroids }
}

async function nameSubVibe(
  keywords: string[], moods: string[], seasonDist: string, postCount: number, existingNames: string[]
): Promise<{ name: string; tagline: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Name this fashion vibe in 2-3 words and write a tagline (max 10 words).

Think like a playlist name or photo album title. Simple. Visual. A moment or place, not an adjective + noun.
Good: "Endless Summer", "Sunday Garden", "After Dark", "October Layers"
BAD — do NOT use: golden, wanderer, confidence, muse, radiant, energy, spirit

Already used (do NOT repeat): ${existingNames.join(", ")}

This vibe has ${postCount} outfits:
- Keywords: ${keywords.join(", ")}
- Moods: ${moods.join(", ")}
- Seasons: ${seasonDist}

Return JSON only: {"name": "2-3 words", "tagline": "max 10 words"}`
        }]
      })
      const text = response.content.find((b) => b.type === "text")
      if (!text || text.type !== "text") throw new Error("No text")
      let json = text.text.trim()
      const match = json.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) json = match[1].trim()
      return JSON.parse(json)
    } catch (err) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 15000)); continue }
      throw err
    }
  }
  throw new Error("Max retries")
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Vibe Splitter")
  console.log("═══════════════════════════════════════\n")

  // Find oversized vibes
  const vibes = await prisma.vibe.findMany({
    include: { _count: { select: { vibeAssignments: true } } },
  })
  const oversized = vibes.filter((v) => v._count.vibeAssignments > MAX_VIBE_SIZE)

  if (oversized.length === 0) {
    console.log("No oversized vibes found!")
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${oversized.length} oversized vibes:\n`)
  for (const v of oversized) {
    console.log(`  ${v.name}: ${v._count.vibeAssignments} looks`)
  }

  const existingNames = vibes.map((v) => v.name)

  for (const vibe of oversized) {
    const k = Math.ceil(vibe._count.vibeAssignments / 60) // target ~60 per sub-vibe
    console.log(`\nSplitting "${vibe.name}" (${vibe._count.vibeAssignments} looks) into ${k} sub-vibes...`)

    // Load all assignments + vision data for this vibe
    const assignments = await prisma.vibeAssignment.findMany({
      where: { vibeId: vibe.id },
      include: {
        post: {
          include: { visionData: true },
        },
      },
    })

    // Compute embeddings
    const dataPoints: { postId: string; assignmentId: string; embedding: number[] }[] = []
    for (const a of assignments) {
      const vd = a.post.visionData
      if (!vd) continue
      const embedding = computeEmbedding({
        season: vd.season,
        formality: vd.formality,
        mood: vd.mood,
        palette: vd.palette,
        vibeKeywords: vd.vibeKeywords,
      })
      dataPoints.push({ postId: a.postId, assignmentId: a.id, embedding })
    }

    if (dataPoints.length < k * 2) {
      console.log(`  Not enough data points (${dataPoints.length}), skipping`)
      continue
    }

    // Run k-means
    const { assignments: clusterAssignments, centroids } = kmeans(
      dataPoints.map((d) => d.embedding), k
    )

    // Group by cluster
    const clusters = new Map<number, typeof dataPoints>()
    for (let i = 0; i < dataPoints.length; i++) {
      const clusterId = clusterAssignments[i]
      if (!clusters.has(clusterId)) clusters.set(clusterId, [])
      clusters.get(clusterId)!.push(dataPoints[i])
    }

    // Name and create each sub-vibe
    for (const [clusterId, clusterPosts] of clusters) {
      // Gather stats
      const allKeywords: Record<string, number> = {}
      const moods: Record<string, number> = {}
      const seasons: Record<string, number> = {}

      for (const dp of clusterPosts) {
        const a = assignments.find((a) => a.postId === dp.postId)
        const vd = a?.post.visionData
        if (!vd) continue
        if (vd.mood) moods[vd.mood] = (moods[vd.mood] || 0) + 1
        if (vd.season) seasons[vd.season] = (seasons[vd.season] || 0) + 1
        const kws = Array.isArray(vd.vibeKeywords) ? (vd.vibeKeywords as string[]) : []
        for (const kw of kws) allKeywords[kw] = (allKeywords[kw] || 0) + 1
      }

      const topKeywords = Object.entries(allKeywords).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)
      const topMoods = Object.entries(moods).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
      const seasonDist = Object.entries(seasons).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}: ${n}`).join(", ")

      const naming = await nameSubVibe(topKeywords, topMoods, seasonDist, clusterPosts.length, existingNames)

      let newName = naming.name
      let newSlug = slugify(newName)

      // Handle collisions
      const nameExists = await prisma.vibe.findUnique({ where: { name: newName } })
      if (nameExists) { newName = `${newName} ${clusterId + 1}`; newSlug = slugify(newName) }
      const slugExists = await prisma.vibe.findUnique({ where: { slug: newSlug } })
      if (slugExists) newSlug = `${newSlug}-${clusterId + 1}`

      existingNames.push(newName)

      // Create new sub-vibe
      const newVibe = await prisma.vibe.create({
        data: {
          name: newName,
          slug: newSlug,
          tagline: naming.tagline,
          centroid: centroids[clusterId],
          sortOrder: vibes.length + clusterId,
          approvedAt: new Date(),
        },
      })

      // Reassign posts
      for (const dp of clusterPosts) {
        await prisma.vibeAssignment.update({
          where: { id: dp.assignmentId },
          data: { vibeId: newVibe.id },
        })
      }

      console.log(`  ✓ "${newName}" — ${naming.tagline} (${clusterPosts.length} looks)`)

      await new Promise((r) => setTimeout(r, 1000)) // rate limit naming
    }

    // Delete the old oversized vibe (assignments already reassigned)
    await prisma.vibe.delete({ where: { id: vibe.id } })
    console.log(`  Deleted old vibe "${vibe.name}"`)
  }

  // Summary
  console.log("\n═══════════════════════════════════════")
  console.log("Done! New vibes:")
  const finalVibes = await prisma.vibe.findMany({
    include: { _count: { select: { vibeAssignments: true } } },
    orderBy: { sortOrder: "asc" },
  })
  for (const v of finalVibes) {
    console.log(`  ${v.name}: ${v._count.vibeAssignments} looks`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
