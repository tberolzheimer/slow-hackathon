import { prisma } from "@/lib/db/prisma"
import { computeEmbedding, type EmbeddingInput } from "./embeddings"
import { analyzeOutfitImage, type VisionAnalysis } from "./vision"

export interface TasteScore {
  wouldRecommend: boolean
  score: number // 0-100
  matchingVibes: { name: string; slug: string; confidence: number }[]
  bestVibe: { name: string; slug: string } | null
}

/**
 * Euclidean distance between two vectors.
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * Score a product/outfit by comparing its embedding against all vibe centroids.
 * Returns which of Julia's aesthetics it matches.
 *
 * The key insight: Julia's style is not one thing — it's 12 vibes.
 * A product matches if it falls within the radius of ANY vibe centroid.
 */
async function scoreAgainstVibes(embedding: number[]): Promise<TasteScore> {
  const vibes = await prisma.vibe.findMany({
    where: { centroid: { not: undefined }, approvedAt: { not: null } },
    select: { id: true, name: true, slug: true, centroid: true },
  })

  // Calculate distance to each vibe centroid
  const scored = vibes
    .map((vibe) => {
      const centroid = vibe.centroid as number[]
      if (!centroid || centroid.length === 0) return null
      const distance = euclideanDistance(embedding, centroid)
      // Max possible distance for normalized vectors ≈ √2 ≈ 1.414
      const maxDist = 1.5
      const confidence = Math.max(0, Math.min(1, 1 - distance / maxDist))
      return {
        name: vibe.name,
        slug: vibe.slug,
        distance,
        confidence,
      }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.distance - b.distance)

  // Threshold: items with confidence > 0.3 match a vibe
  // This means distance < 1.05 (about 70% of max distance)
  const CONFIDENCE_THRESHOLD = 0.3
  const matchingVibes = scored
    .filter((s) => s.confidence >= CONFIDENCE_THRESHOLD)
    .map((s) => ({
      name: s.name,
      slug: s.slug,
      confidence: Math.round(s.confidence * 100) / 100,
    }))

  const bestMatch = matchingVibes[0] || null

  return {
    wouldRecommend: matchingVibes.length > 0,
    score: bestMatch ? Math.round(bestMatch.confidence * 100) : 0,
    matchingVibes,
    bestVibe: bestMatch ? { name: bestMatch.name, slug: bestMatch.slug } : null,
  }
}

/**
 * Score from pre-computed vision attributes (no API call needed).
 * Use when you already have garment/mood/season data.
 */
export async function scoreFromAttributes(attributes: EmbeddingInput): Promise<TasteScore> {
  const embedding = computeEmbedding(attributes)
  return scoreAgainstVibes(embedding)
}

/**
 * Score a product image by running Vision AI + comparing to vibes.
 * Full pipeline: image → Vision AI → embedding → vibe matching.
 * Costs ~$0.013 per call (Claude Sonnet vision).
 */
export async function scoreProduct(imageUrl: string): Promise<TasteScore> {
  // Step 1: Analyze image with Vision AI
  const analysis = await analyzeOutfitImage(imageUrl, [])

  // Step 2: Compute embedding from analysis
  const embedding = computeEmbedding({
    season: analysis.season,
    formality: analysis.formality,
    mood: analysis.mood,
    palette: analysis.palette,
    vibeKeywords: analysis.vibeKeywords,
  })

  // Step 3: Score against vibes
  const score = await scoreAgainstVibes(embedding)

  return score
}

/**
 * Score an existing post that already has VisionData.
 * No API call — uses stored analysis data.
 */
export async function scorePost(postId: string): Promise<TasteScore | null> {
  const visionData = await prisma.visionData.findUnique({
    where: { postId },
  })

  if (!visionData) return null

  return scoreFromAttributes({
    season: visionData.season,
    formality: visionData.formality,
    mood: visionData.mood,
    palette: visionData.palette,
    vibeKeywords: visionData.vibeKeywords,
  })
}
