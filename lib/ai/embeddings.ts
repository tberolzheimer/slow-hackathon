/**
 * Compute feature vectors from structured vision attributes.
 * No external embedding model needed — we build vectors from the structured data.
 */

const SEASONS = ["spring", "summer", "fall", "winter"] as const
const FORMALITIES = ["casual", "smart-casual", "polished", "evening"] as const
const MOOD_VOCABULARY = [
  "romantic", "minimalist", "preppy", "edgy", "bohemian", "polished",
  "playful", "classic", "modern", "vintage", "luxe", "relaxed",
  "dramatic", "feminine", "sporty", "artsy", "refined", "whimsical",
  "bold", "soft",
] as const

const SEASON_WEIGHT = 3 // PRD specifies 3x weighting for season

export interface EmbeddingInput {
  season: string | null
  formality: string | null
  mood: string | null
  palette: unknown // Json array of hex colors
  vibeKeywords: unknown // Json array of strings
}

/**
 * Compute an embedding vector from vision analysis data.
 * Returns a normalized float array.
 */
export function computeEmbedding(input: EmbeddingInput): number[] {
  const vec: number[] = []

  // Season (one-hot, 4 dims, 3x weighted)
  for (const s of SEASONS) {
    vec.push((input.season?.toLowerCase() === s ? 1 : 0) * SEASON_WEIGHT)
  }

  // Formality (one-hot, 4 dims)
  for (const f of FORMALITIES) {
    vec.push(input.formality?.toLowerCase() === f ? 1 : 0)
  }

  // Mood (multi-hot against vocabulary, 20 dims)
  const moodLower = (input.mood || "").toLowerCase()
  for (const m of MOOD_VOCABULARY) {
    vec.push(moodLower.includes(m) ? 1 : 0)
  }

  // Palette (average HSL, 3 dims)
  const colors = Array.isArray(input.palette) ? input.palette as string[] : []
  const hsl = averageHSL(colors)
  vec.push(hsl.h / 360, hsl.s / 100, hsl.l / 100) // Normalize to 0-1

  // Vibe keywords (multi-hot, build vocabulary dynamically)
  // Use a fixed vocabulary of common keywords for consistency
  const keywords = Array.isArray(input.vibeKeywords)
    ? (input.vibeKeywords as string[]).map((k) => k.toLowerCase())
    : []
  for (const m of MOOD_VOCABULARY) {
    vec.push(keywords.includes(m) ? 1 : 0)
  }

  // Additional keyword features: common fashion descriptors
  const FASHION_KEYWORDS = [
    "layered", "monochromatic", "color-blocked", "oversized", "fitted",
    "tailored", "flowy", "structured", "deconstructed", "understated",
    "statement", "textured", "neutral", "colorful", "earthy",
    "pastel", "jewel-toned", "warm", "cool", "muted",
    "effortless", "curated", "eclectic", "coastal", "urban",
    "garden", "evening", "weekend", "travel", "office",
  ] as const

  for (const kw of FASHION_KEYWORDS) {
    vec.push(keywords.some((k) => k.includes(kw)) ? 1 : 0)
  }

  return normalize(vec)
}

function normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  if (magnitude === 0) return vec
  return vec.map((v) => v / magnitude)
}

function averageHSL(hexColors: string[]): { h: number; s: number; l: number } {
  if (hexColors.length === 0) return { h: 0, s: 0, l: 0 }

  let totalH = 0, totalS = 0, totalL = 0
  let count = 0

  for (const hex of hexColors) {
    const hsl = hexToHSL(hex)
    if (hsl) {
      totalH += hsl.h
      totalS += hsl.s
      totalL += hsl.l
      count++
    }
  }

  if (count === 0) return { h: 0, s: 0, l: 0 }
  return { h: totalH / count, s: totalS / count, l: totalL / count }
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const match = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return null

  let r = parseInt(match[1], 16) / 255
  let g = parseInt(match[2], 16) / 255
  let b = parseInt(match[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
