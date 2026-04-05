import { prisma } from "@/lib/db/prisma"
import { computeEmbedding, cosineSimilarity, type EmbeddingInput } from "./embeddings"

export interface SuggestedLook {
  postId: string
  slug: string
  displayTitle: string
  outfitImageUrl: string | null
  similarity: number
}

/**
 * Given a set of look slugs (already in a capsule), find similar looks
 * by computing the average embedding and ranking all other posts by
 * cosine similarity.
 */
export async function getSimilarLooks(
  lookSlugs: string[],
  limit: number = 10
): Promise<SuggestedLook[]> {
  if (lookSlugs.length === 0) return []

  // 1. Fetch vision data (with precomputed embeddings) for input looks
  const inputPosts = await prisma.post.findMany({
    where: { slug: { in: lookSlugs } },
    select: {
      id: true,
      slug: true,
      visionData: {
        select: {
          embedding: true,
          season: true,
          formality: true,
          mood: true,
          palette: true,
          vibeKeywords: true,
        },
      },
    },
  })

  // Collect embeddings — use precomputed if available, otherwise compute
  const embeddings: number[][] = []
  for (const post of inputPosts) {
    if (post.visionData) {
      const emb = post.visionData.embedding
      if (Array.isArray(emb) && emb.length > 0) {
        embeddings.push(emb as number[])
      } else {
        // Compute on the fly from vision attributes
        const computed = computeEmbedding(post.visionData as EmbeddingInput)
        embeddings.push(computed)
      }
    }
  }

  if (embeddings.length === 0) return []

  // 2. Compute average embedding (centroid)
  const dim = embeddings[0].length
  const centroid = new Array(dim).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i]
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length
  }

  // 3. Fetch candidate posts (with embeddings) — exclude input slugs
  const inputSlugSet = new Set(lookSlugs)
  const candidates = await prisma.post.findMany({
    where: {
      slug: { notIn: lookSlugs },
      outfitImageUrl: { not: null },
      visionData: { isNot: null },
    },
    select: {
      id: true,
      slug: true,
      displayTitle: true,
      title: true,
      outfitImageUrl: true,
      visionData: {
        select: {
          embedding: true,
          season: true,
          formality: true,
          mood: true,
          palette: true,
          vibeKeywords: true,
        },
      },
    },
  })

  // 4. Score each candidate
  const scored: SuggestedLook[] = []
  for (const cand of candidates) {
    if (!cand.visionData) continue
    if (inputSlugSet.has(cand.slug)) continue

    let candEmb: number[]
    const raw = cand.visionData.embedding
    if (Array.isArray(raw) && raw.length > 0) {
      candEmb = raw as number[]
    } else {
      candEmb = computeEmbedding(cand.visionData as EmbeddingInput)
    }

    if (candEmb.length !== dim) continue

    const sim = cosineSimilarity(centroid, candEmb)
    scored.push({
      postId: cand.id,
      slug: cand.slug,
      displayTitle: cand.displayTitle || cand.title,
      outfitImageUrl: cand.outfitImageUrl,
      similarity: sim,
    })
  }

  // 5. Sort by similarity descending, take top N
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, limit)
}
