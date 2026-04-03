import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"
import { computeEmbedding, cosineSimilarity } from "../lib/ai/embeddings"

const prisma = new PrismaClient()
const anthropic = new Anthropic()

interface DataPoint {
  postId: string
  embedding: number[]
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Vibe Clustering")
  console.log("═══════════════════════════════════════\n")

  // Load all vision data
  const visionData = await prisma.visionData.findMany({
    include: { post: { select: { id: true, title: true } } },
  })

  console.log(`Found ${visionData.length} analyzed posts\n`)

  if (visionData.length < 10) {
    console.log("Not enough data to cluster. Need at least 10 analyzed posts.")
    await prisma.$disconnect()
    return
  }

  // Compute embeddings
  console.log("Computing embeddings...")
  const dataPoints: DataPoint[] = visionData.map((vd) => ({
    postId: vd.postId,
    embedding: computeEmbedding({
      season: vd.season,
      formality: vd.formality,
      mood: vd.mood,
      palette: vd.palette,
      vibeKeywords: vd.vibeKeywords,
    }),
  }))

  // Store embeddings back to DB
  for (const dp of dataPoints) {
    await prisma.visionData.update({
      where: { postId: dp.postId },
      data: { embedding: dp.embedding },
    })
  }
  console.log(`Stored ${dataPoints.length} embeddings\n`)

  // Try k-means for k=8 to k=15, pick best silhouette score
  console.log("Running k-means clustering (k=8 to k=15)...")
  let bestK = 10
  let bestScore = -1
  let bestAssignments: number[] = []
  let bestCentroids: number[][] = []

  for (let k = 8; k <= 15; k++) {
    const { assignments, centroids } = kmeans(
      dataPoints.map((d) => d.embedding),
      k,
      50 // max iterations
    )
    const score = silhouetteScore(
      dataPoints.map((d) => d.embedding),
      assignments,
      k
    )
    console.log(`  k=${k}: silhouette=${score.toFixed(4)}`)

    if (score > bestScore) {
      bestScore = score
      bestK = k
      bestAssignments = assignments
      bestCentroids = centroids
    }
  }

  console.log(`\nBest k=${bestK} (silhouette=${bestScore.toFixed(4)})\n`)

  // Gather cluster data for naming
  const clusters: Map<number, { postIds: string[]; visionData: typeof visionData }> = new Map()
  for (let i = 0; i < dataPoints.length; i++) {
    const clusterId = bestAssignments[i]
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, { postIds: [], visionData: [] })
    }
    clusters.get(clusterId)!.postIds.push(dataPoints[i].postId)
    clusters.get(clusterId)!.visionData.push(visionData[i])
  }

  // Name each cluster using Claude
  console.log("Naming vibes with Claude...\n")

  // Clear existing vibes and assignments
  await prisma.vibeAssignment.deleteMany()
  await prisma.vibe.deleteMany()

  let vibeOrder = 0
  for (const [clusterId, cluster] of clusters) {
    const centroid = bestCentroids[clusterId]

    // Aggregate cluster stats
    const seasons: Record<string, number> = {}
    const moods: Record<string, number> = {}
    const allKeywords: Record<string, number> = {}
    const allColors: string[] = []

    for (const vd of cluster.visionData) {
      if (vd.season) seasons[vd.season] = (seasons[vd.season] || 0) + 1
      if (vd.mood) moods[vd.mood] = (moods[vd.mood] || 0) + 1
      const kws = Array.isArray(vd.vibeKeywords) ? (vd.vibeKeywords as string[]) : []
      for (const kw of kws) allKeywords[kw] = (allKeywords[kw] || 0) + 1
      const palette = Array.isArray(vd.palette) ? (vd.palette as string[]) : []
      allColors.push(...palette)
    }

    const topKeywords = Object.entries(allKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k]) => k)

    const topMoods = Object.entries(moods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k)

    const seasonDist = Object.entries(seasons)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s}: ${n}`)
      .join(", ")

    // Ask Claude to name this vibe
    const naming = await nameCluster(topKeywords, topMoods, seasonDist, cluster.postIds.length)

    console.log(`  Vibe ${vibeOrder + 1}: "${naming.name}" — ${naming.tagline}`)
    console.log(`    ${cluster.postIds.length} outfits | ${seasonDist}`)
    console.log(`    Keywords: ${topKeywords.slice(0, 6).join(", ")}`)

    // Create Vibe record (handle name collisions)
    let vibeName = naming.name
    let vibeSlug = slugify(naming.name)
    const existingName = await prisma.vibe.findUnique({ where: { name: vibeName } })
    if (existingName) {
      vibeName = `${naming.name} ${vibeOrder + 1}`
      vibeSlug = slugify(vibeName)
    }
    const existingSlug = await prisma.vibe.findUnique({ where: { slug: vibeSlug } })
    if (existingSlug) {
      vibeSlug = `${vibeSlug}-${vibeOrder + 1}`
    }

    const vibe = await prisma.vibe.create({
      data: {
        name: vibeName,
        slug: vibeSlug,
        tagline: naming.tagline,
        introText: naming.description,
        centroid: centroid,
        sortOrder: vibeOrder++,
        // approvedAt left null — Julia reviews
      },
    })

    // Create assignments
    for (let i = 0; i < dataPoints.length; i++) {
      if (bestAssignments[i] === clusterId) {
        const dist = euclideanDistance(dataPoints[i].embedding, centroid)
        const maxDist = Math.sqrt(dataPoints[i].embedding.length) // theoretical max
        const confidence = Math.max(0, 1 - dist / maxDist)

        await prisma.vibeAssignment.create({
          data: {
            postId: dataPoints[i].postId,
            vibeId: vibe.id,
            confidenceScore: confidence,
            assignedBy: "ai",
          },
        })
      }
    }

    // Rate limit Claude calls
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("\n═══════════════════════════════════════")
  console.log("Clustering Complete!")
  console.log("═══════════════════════════════════════")

  const vibeCount = await prisma.vibe.count()
  const assignmentCount = await prisma.vibeAssignment.count()
  console.log(`  Vibes created: ${vibeCount}`)
  console.log(`  Assignments: ${assignmentCount}`)
  console.log(`\nVibes are in DRAFT state. Use the admin UI or Prisma Studio to approve them.`)

  await prisma.$disconnect()
}

async function nameCluster(
  keywords: string[],
  moods: string[],
  seasonDist: string,
  postCount: number
): Promise<{ name: string; tagline: string; description: string }> {
  // Retry with exponential backoff for rate limits
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await _nameClusterCall(keywords, moods, seasonDist, postCount)
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && err.message.includes("rate_limit")
      if (isRateLimit && attempt < 4) {
        const waitMs = (attempt + 1) * 15000 // 15s, 30s, 45s, 60s
        console.log(`  Rate limited, waiting ${waitMs / 1000}s...`)
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }
      throw err
    }
  }
  throw new Error("Max retries exceeded")
}

async function _nameClusterCall(
  keywords: string[],
  moods: string[],
  seasonDist: string,
  postCount: number
): Promise<{ name: string; tagline: string; description: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are naming aesthetic vibes for VibeShop, Julia Berolzheimer's fashion styling destination. Each vibe is an emotional portal — it should evoke a feeling and identity, not describe a clothing category.

Given this cluster of ${postCount} outfit photos:
- Top keywords: ${keywords.join(", ")}
- Moods: ${moods.join(", ")}
- Season distribution: ${seasonDist}

Generate a JSON object:
{
  "name": "2-3 word vibe name — identity-forward and aspirational (e.g., 'Coastal Ease', 'Garden Romantic', 'City Polish', 'Quiet Luxe')",
  "tagline": "One evocative sentence, max 12 words. Speak to who she becomes in this vibe, not what she wears. (e.g., 'Sun on your shoulders, nowhere to be', 'She walks in knowing exactly who she is')",
  "description": "2-3 sentences describing the WOMAN who lives in this vibe, not the clothes. Write as if inviting her into an identity. Start with 'This is for the woman who...' or 'You know that feeling when...' — make her see herself in it."
}

Return ONLY valid JSON.`,
      },
    ],
  })

  const text = response.content.find((b) => b.type === "text")
  if (!text || text.type !== "text") throw new Error("No text response")

  let jsonStr = text.text.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  return JSON.parse(jsonStr)
}

// ═══════════════════════════════════════
// K-Means Implementation
// ═══════════════════════════════════════

function kmeans(
  data: number[][],
  k: number,
  maxIter: number
): { assignments: number[]; centroids: number[][] } {
  const n = data.length
  const dim = data[0].length

  // Initialize centroids with k-means++
  const centroids = kmeansppInit(data, k)
  let assignments = new Array(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = data.map((point) => {
      let minDist = Infinity
      let minIdx = 0
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(point, centroids[c])
        if (d < minDist) {
          minDist = d
          minIdx = c
        }
      }
      return minIdx
    })

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments
    if (!changed) break

    // Update centroids
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

function kmeansppInit(data: number[][], k: number): number[][] {
  const centroids: number[][] = []

  // First centroid: random
  centroids.push([...data[Math.floor(Math.random() * data.length)]])

  for (let c = 1; c < k; c++) {
    // Compute distances to nearest centroid
    const distances = data.map((point) => {
      let minDist = Infinity
      for (const cent of centroids) {
        const d = euclideanDistance(point, cent)
        if (d < minDist) minDist = d
      }
      return minDist * minDist // square for probability weighting
    })

    // Weighted random selection
    const totalDist = distances.reduce((a, b) => a + b, 0)
    let target = Math.random() * totalDist
    for (let i = 0; i < data.length; i++) {
      target -= distances[i]
      if (target <= 0) {
        centroids.push([...data[i]])
        break
      }
    }

    // Fallback if floating point issues
    if (centroids.length <= c) {
      centroids.push([...data[Math.floor(Math.random() * data.length)]])
    }
  }

  return centroids
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

function silhouetteScore(data: number[][], assignments: number[], k: number): number {
  const n = data.length
  if (n < 2) return 0

  // Sample for large datasets
  const sampleSize = Math.min(n, 200)
  const indices = n <= sampleSize
    ? Array.from({ length: n }, (_, i) => i)
    : Array.from({ length: sampleSize }, () => Math.floor(Math.random() * n))

  let totalScore = 0

  for (const i of indices) {
    const cluster = assignments[i]

    // Average distance to same cluster (a)
    const sameCluster = data.filter((_, j) => j !== i && assignments[j] === cluster)
    if (sameCluster.length === 0) continue

    const a = sameCluster.reduce((sum, p) => sum + euclideanDistance(data[i], p), 0) / sameCluster.length

    // Min average distance to other clusters (b)
    let b = Infinity
    for (let c = 0; c < k; c++) {
      if (c === cluster) continue
      const otherCluster = data.filter((_, j) => assignments[j] === c)
      if (otherCluster.length === 0) continue
      const avgDist = otherCluster.reduce((sum, p) => sum + euclideanDistance(data[i], p), 0) / otherCluster.length
      if (avgDist < b) b = avgDist
    }

    if (b === Infinity) continue
    totalScore += (b - a) / Math.max(a, b)
  }

  return totalScore / indices.length
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
