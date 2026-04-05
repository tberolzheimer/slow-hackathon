/**
 * Capsule Engine V2 — Multi-signal scoring with vibe-centroid matching.
 *
 * Assembles a trip-specific wardrobe capsule from Julia's 835-post archive.
 * No LLM calls — uses 5 weighted scoring signals + two-pass allocation
 * + garment diversity enforcement.
 *
 * Signals:
 *   1. Vibe affinity (35%) — cosine similarity to destination-relevant vibe centroids
 *   2. Garment fit (25%) — boost/penalize garment types per activity
 *   3. Setting + Formality (20%) — direct attribute match
 *   4. Season (15%) — clean season match
 *   5. Shoppability (5%) — product count + recency
 */

import { prisma } from "@/lib/db/prisma"
import { computeEmbedding, cosineSimilarity } from "./embeddings"

// ═══════════════════════════════════════
// Types (unchanged — UI depends on these)
// ═══════════════════════════════════════

export interface TripInput {
  destinationType: string
  season: string
  duration: string
  activities: string[]
}

export interface CapsuleLook {
  postId: string
  slug: string
  displayTitle: string | null
  outfitImageUrl: string
  vibeName: string
  vibeSlug: string
  score: number
  products: {
    id: string
    brand: string | null
    itemName: string | null
    productImageUrl: string | null
    affiliateUrl: string
    garmentType: string | null
  }[]
}

export interface CapsuleSection {
  activity: string
  label: string
  icon: string
  looks: CapsuleLook[]
}

export interface CapsuleResult {
  tripName: string
  sections: CapsuleSection[]
  packingList: {
    id: string
    brand: string | null
    itemName: string | null
    productImageUrl: string | null
    affiliateUrl: string
    garmentType: string | null
    usedInLooks: number
  }[]
  vibeBreakdown: { name: string; slug: string; count: number }[]
  totalLooks: number
  totalPieces: number
}

// ═══════════════════════════════════════
// Activity contexts — settings/formalities match actual DB values
// ═══════════════════════════════════════

interface ActivityContext {
  key: string
  label: string
  icon: string
  formalities: string[] // actual DB values: casual, smart-casual, polished, evening
  settings: string[] // actual DB values: indoor, garden, urban, travel, street, beach, outdoor, resort, porch, waterfront, coastal, countryside
  garmentBoost: string[] // garment types to favor (substring match)
  garmentPenalize: string[] // garment types to penalize (substring match)
  // Which vibe "flavor" to prefer: casual vibes or polished vibes
  vibeFormality: "casual" | "polished" | "evening"
  looksPerSlot: { weekend: number; week: number; extended: number }
}

const ACTIVITY_CONTEXTS: Record<string, ActivityContext> = {
  "pool-days": {
    key: "pool-days",
    label: "For poolside",
    icon: "sun",
    formalities: ["casual"],
    settings: ["beach", "resort", "outdoor", "tropical resort"],
    garmentBoost: ["swimsuit", "coverup", "sun hat", "tote bag", "sandals", "sunglasses", "kaftan", "sarong", "shorts"],
    garmentPenalize: ["blazer", "sweater", "boots", "coat", "trousers"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 2, week: 3, extended: 4 },
  },
  "dinners-out": {
    key: "dinners-out",
    label: "For dinner",
    icon: "utensils",
    formalities: ["smart-casual", "polished", "evening"],
    settings: ["indoor", "urban", "garden"],
    garmentBoost: ["midi dress", "maxi dress", "earrings", "necklace", "heels", "clutch", "blazer", "silk", "wrap dress"],
    garmentPenalize: ["sneakers", "sun hat", "swimsuit", "shorts", "athletic"],
    vibeFormality: "polished",
    looksPerSlot: { weekend: 2, week: 4, extended: 5 },
  },
  sightseeing: {
    key: "sightseeing",
    label: "For exploring",
    icon: "map-pin",
    formalities: ["casual", "smart-casual"],
    settings: ["street", "urban", "travel", "outdoor"],
    garmentBoost: ["jeans", "sneakers", "flats", "crossbody bag", "sunglasses", "ballet flats", "wide-leg pants", "t-shirt", "button-up"],
    garmentPenalize: ["heels", "gown", "clutch", "swimsuit", "evening"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 2, week: 4, extended: 6 },
  },
  brunch: {
    key: "brunch",
    label: "For brunch",
    icon: "coffee",
    formalities: ["smart-casual", "casual"],
    settings: ["garden", "outdoor", "porch", "indoor"],
    garmentBoost: ["midi dress", "midi skirt", "sandals", "flats", "earrings", "cardigan", "blouse", "linen"],
    garmentPenalize: ["sneakers", "athletic", "swimsuit", "boots"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 1, week: 2, extended: 3 },
  },
  cocktails: {
    key: "cocktails",
    label: "For cocktail hour",
    icon: "wine",
    formalities: ["polished", "evening"],
    settings: ["indoor", "urban", "resort"],
    garmentBoost: ["midi dress", "maxi dress", "earrings", "necklace", "heels", "clutch", "blazer", "statement", "silk"],
    garmentPenalize: ["sneakers", "sun hat", "jeans", "swimsuit", "athletic"],
    vibeFormality: "evening",
    looksPerSlot: { weekend: 1, week: 2, extended: 3 },
  },
  "beach-walks": {
    key: "beach-walks",
    label: "For the beach",
    icon: "waves",
    formalities: ["casual"],
    settings: ["beach", "coastal", "outdoor", "waterfront"],
    garmentBoost: ["swimsuit", "coverup", "sandals", "sun hat", "tote bag", "maxi dress", "shorts", "linen", "kaftan"],
    garmentPenalize: ["blazer", "sweater", "boots", "coat", "heels"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 2, week: 3, extended: 4 },
  },
  shopping: {
    key: "shopping",
    label: "For shopping days",
    icon: "shopping-bag",
    formalities: ["casual", "smart-casual"],
    settings: ["street", "urban", "indoor"],
    garmentBoost: ["jeans", "sneakers", "flats", "crossbody bag", "sunglasses", "tote bag", "ballet flats", "wide-leg pants"],
    garmentPenalize: ["heels", "gown", "swimsuit"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 1, week: 2, extended: 3 },
  },
  "special-evening": {
    key: "special-evening",
    label: "For a special evening",
    icon: "sparkles",
    formalities: ["evening", "polished"],
    settings: ["indoor"],
    garmentBoost: ["maxi dress", "midi dress", "earrings", "necklace", "heels", "clutch", "statement", "silk", "gown"],
    garmentPenalize: ["sneakers", "sun hat", "jeans", "swimsuit", "athletic", "shorts"],
    vibeFormality: "evening",
    looksPerSlot: { weekend: 1, week: 2, extended: 2 },
  },
  active: {
    key: "active",
    label: "For active days",
    icon: "mountain",
    formalities: ["casual"],
    settings: ["outdoor", "countryside", "travel"],
    garmentBoost: ["sneakers", "jeans", "shorts", "cardigan", "sweater", "boots", "crossbody bag", "t-shirt", "tank top"],
    garmentPenalize: ["heels", "gown", "clutch", "midi dress", "silk"],
    vibeFormality: "casual",
    looksPerSlot: { weekend: 1, week: 2, extended: 3 },
  },
}

// ═══════════════════════════════════════
// Destination → Vibe mapping (from actual data analysis)
// ═══════════════════════════════════════

interface VibeMapping {
  casual: string[] // slugs for casual activities at this destination
  polished: string[] // slugs for polished/dinner activities
  evening: string[] // slugs for evening/cocktail activities
}

const DESTINATION_VIBES: Record<string, VibeMapping> = {
  "beach-resort": {
    casual: ["coastal-dreams", "sunset-getaway", "mediterranean-mornings", "poolside-gallery"],
    polished: ["european-august", "villa-afternoons", "resort-rituals"],
    evening: ["european-august", "villa-afternoons", "poolside-gallery"],
  },
  "european-city": {
    casual: ["city-palette", "spring-cotillion", "spring-rituals"],
    polished: ["city-palette", "european-august", "autumn-club", "november-power"],
    evening: ["november-power", "european-august", "city-palette"],
  },
  "mountain-escape": {
    casual: ["autumn-ease", "autumn-reverie", "bohemian-april"],
    polished: ["autumn-club", "winter-luxe"],
    evening: ["winter-luxe", "november-power"],
  },
  "tropical-getaway": {
    casual: ["coastal-dreams", "sunset-getaway", "poolside-gallery"],
    polished: ["villa-afternoons", "resort-rituals", "european-august"],
    evening: ["resort-rituals", "villa-afternoons"],
  },
  "countryside-retreat": {
    casual: ["morning-porch", "bohemian-april", "summer-wandering", "spring-studio"],
    polished: ["villa-afternoons", "morning-porch", "resort-rituals"],
    evening: ["villa-afternoons", "autumn-club"],
  },
  "city-weekend": {
    casual: ["city-palette", "spring-cotillion", "spring-rituals", "spring-studio"],
    polished: ["city-palette", "november-power", "autumn-club"],
    evening: ["november-power", "city-palette"],
  },
}

// ═══════════════════════════════════════
// Accessory filter (for garment diversity)
// ═══════════════════════════════════════

const ACCESSORIES = new Set([
  "sunglasses", "handbag", "tote bag", "crossbody bag", "necklace",
  "earrings", "belt", "bracelet", "ring", "watch", "hat", "sun hat",
  "clutch", "scarf", "hair accessory",
])

function getPrimaryGarmentCategory(garments: { type: string }[]): string {
  for (const g of garments) {
    const t = (g.type || "").toLowerCase()
    if (ACCESSORIES.has(t)) continue
    // Bucket into broad categories
    if (t.includes("dress")) return "dress"
    if (t.includes("skirt")) return "skirt-combo"
    if (t.includes("pants") || t.includes("jeans") || t.includes("trouser")) return "pants-combo"
    if (t.includes("jumpsuit") || t.includes("romper")) return "jumpsuit"
    if (t.includes("shorts")) return "shorts-combo"
    if (t.includes("swimsuit") || t.includes("bikini")) return "swimwear"
    if (t.includes("coverup") || t.includes("kaftan")) return "coverup"
    return t // fallback to raw type
  }
  return "unknown"
}

// ═══════════════════════════════════════
// Trip name generation
// ═══════════════════════════════════════

const DESTINATION_LABELS: Record<string, string> = {
  "beach-resort": "Beach",
  "european-city": "European",
  "mountain-escape": "Mountain",
  "tropical-getaway": "Tropical",
  "countryside-retreat": "Countryside",
  "city-weekend": "City",
}

const DURATION_LABELS: Record<string, string> = {
  weekend: "Weekend",
  week: "Week",
  extended: "Getaway",
}

function generateTripName(input: TripInput): string {
  const dest = DESTINATION_LABELS[input.destinationType] || "Travel"
  const dur = DURATION_LABELS[input.duration] || "Trip"
  return `Your ${dest} ${dur} Capsule`
}

// ═══════════════════════════════════════
// Multi-Signal Scoring (the core improvement)
// ═══════════════════════════════════════

function scorePostForActivity(
  post: { visionData: any; products: any[]; date: Date },
  postEmbedding: number[],
  context: ActivityContext,
  vibeCentroids: { centroid: number[]; weight: number }[],
  season: string,
): number {
  const vd = post.visionData

  // ── Signal 1: Vibe Affinity (35%) ──
  // Best cosine similarity against destination-relevant vibe centroids
  let vibeScore = 0
  for (const { centroid, weight } of vibeCentroids) {
    const sim = cosineSimilarity(postEmbedding, centroid)
    vibeScore = Math.max(vibeScore, sim * weight)
  }

  // ── Signal 2: Garment Fit (25%) ──
  const garments = (Array.isArray(vd.garments) ? vd.garments : []) as { type?: string; fabric?: string }[]
  const garmentTypes = garments.map((g) => (g.type || "").toLowerCase())
  const fabrics = garments.map((g) => (g.fabric || "").toLowerCase())
  let garmentScore = 0.5 // neutral baseline

  for (const type of garmentTypes) {
    if (context.garmentBoost.some((b) => type.includes(b))) garmentScore += 0.12
    if (context.garmentPenalize.some((p) => type.includes(p))) garmentScore -= 0.18
  }
  // Also check fabric matches in boost/penalize (e.g., "silk", "linen", "wool")
  for (const fabric of fabrics) {
    if (context.garmentBoost.some((b) => fabric.includes(b))) garmentScore += 0.06
    if (context.garmentPenalize.some((p) => fabric.includes(p))) garmentScore -= 0.08
  }
  garmentScore = Math.max(0, Math.min(1, garmentScore))

  // ── Signal 3: Setting + Formality (20%) ──
  let contextScore = 0
  const postSetting = (vd.setting || "").toLowerCase()
  const postFormality = (vd.formality || "").toLowerCase()

  // Setting match: check if post setting matches any of the activity's preferred settings
  if (postSetting && context.settings.some((s) => postSetting.includes(s) || s.includes(postSetting))) {
    contextScore += 0.5
  }
  // Formality match
  if (postFormality && context.formalities.includes(postFormality)) {
    contextScore += 0.5
  }

  // ── Signal 4: Season (15%) ──
  const postSeason = (vd.season || "").toLowerCase()
  const seasonScore = postSeason === season ? 1.0 : 0.15

  // ── Signal 5: Shoppability (5%) ──
  let shopScore = 0
  if (post.products.length > 0) shopScore = 0.5
  if (post.products.length >= 3) shopScore = 0.8
  // Recency bonus: posts from last 2 years get extra
  const ageYears = (Date.now() - new Date(post.date).getTime()) / (365 * 24 * 60 * 60 * 1000)
  shopScore += Math.max(0, 0.2 * (1 - ageYears / 4))
  shopScore = Math.min(1, shopScore)

  return (
    vibeScore * 0.35 +
    garmentScore * 0.25 +
    contextScore * 0.20 +
    seasonScore * 0.15 +
    shopScore * 0.05
  )
}

// ═══════════════════════════════════════
// Main capsule generation
// ═══════════════════════════════════════

export async function generateCapsuleFromTrip(input: TripInput): Promise<CapsuleResult> {
  // 1. Load all posts with vision data + products
  const posts = await prisma.post.findMany({
    where: {
      outfitImageUrl: { not: null },
      visionData: { isNot: null },
    },
    include: {
      visionData: true,
      products: {
        where: { isAlternative: false, productImageUrl: { not: null } },
        orderBy: { sortOrder: "asc" },
        take: 5,
      },
      vibeAssignments: {
        take: 1,
        orderBy: { confidenceScore: "desc" },
        include: { vibe: { select: { name: true, slug: true } } },
      },
    },
  })

  // 2. Load vibe centroids for destination matching
  const vibes = await prisma.vibe.findMany({
    where: { approvedAt: { not: null } },
    select: { slug: true, name: true, centroid: true },
  })
  const vibeMap = new Map(vibes.map((v) => [v.slug, v]))

  // 3. Pre-load post embeddings
  const postEmbeddings = new Map<string, number[]>()
  for (const post of posts) {
    if (post.visionData) {
      const stored = post.visionData.embedding as number[] | null
      const emb = stored && stored.length > 0
        ? stored
        : computeEmbedding({
            season: post.visionData.season,
            formality: post.visionData.formality,
            mood: post.visionData.mood,
            palette: post.visionData.palette,
            vibeKeywords: post.visionData.vibeKeywords,
          })
      postEmbeddings.set(post.id, emb)
    }
  }

  // 4. Resolve destination vibes to centroids
  const destVibes = DESTINATION_VIBES[input.destinationType]
  if (!destVibes) {
    return { tripName: generateTripName(input), sections: [], packingList: [], vibeBreakdown: [], totalLooks: 0, totalPieces: 0 }
  }

  function getVibeCentroids(formality: "casual" | "polished" | "evening"): { centroid: number[]; weight: number }[] {
    const slugs = destVibes[formality]
    const centroids: { centroid: number[]; weight: number }[] = []
    for (let i = 0; i < slugs.length; i++) {
      const vibe = vibeMap.get(slugs[i])
      const centroid = vibe?.centroid as number[] | undefined
      if (centroid && centroid.length > 0) {
        // Primary vibes get weight 1.0, secondary get 0.8, tertiary get 0.6
        centroids.push({ centroid, weight: i === 0 ? 1.0 : i === 1 ? 0.85 : 0.7 })
      }
    }
    return centroids
  }

  // 5. Build the full score matrix (all posts × all activities)
  const activities = input.activities
    .map((key) => ACTIVITY_CONTEXTS[key])
    .filter(Boolean) as ActivityContext[]

  const targetCounts = new Map<string, number>()
  for (const ctx of activities) {
    targetCounts.set(ctx.key, ctx.looksPerSlot[input.duration as keyof typeof ctx.looksPerSlot] || 2)
  }

  type ScoreEntry = { postIdx: number; actKey: string; score: number }
  const matrix: ScoreEntry[] = []

  for (let pi = 0; pi < posts.length; pi++) {
    const post = posts[pi]
    const emb = postEmbeddings.get(post.id)
    if (!emb || !post.visionData) continue

    for (const ctx of activities) {
      const centroids = getVibeCentroids(ctx.vibeFormality)
      const score = scorePostForActivity(post, emb, ctx, centroids, input.season)
      matrix.push({ postIdx: pi, actKey: ctx.key, score })
    }
  }

  // 6. Two-pass allocation: sort by score, assign globally optimal matches
  matrix.sort((a, b) => b.score - a.score)

  const postUsed = new Set<number>()
  const activityFilled = new Map<string, number>()
  const assignments = new Map<string, { postIdx: number; score: number }[]>()

  for (const ctx of activities) {
    assignments.set(ctx.key, [])
  }

  for (const { postIdx, actKey, score } of matrix) {
    if (postUsed.has(postIdx)) continue
    const filled = activityFilled.get(actKey) || 0
    const target = targetCounts.get(actKey) || 0
    if (filled >= target) continue

    assignments.get(actKey)!.push({ postIdx, score })
    activityFilled.set(actKey, filled + 1)
    postUsed.add(postIdx)
  }

  // 7. Diversity enforcement: max 2 looks per primary garment category per section
  for (const [actKey, assigned] of assignments) {
    if (assigned.length <= 2) continue

    // Group by primary garment category
    const categoryGroups = new Map<string, { postIdx: number; score: number }[]>()
    for (const entry of assigned) {
      const post = posts[entry.postIdx]
      const garments = (Array.isArray(post.visionData?.garments) ? post.visionData.garments : []) as { type: string }[]
      const category = getPrimaryGarmentCategory(garments)
      if (!categoryGroups.has(category)) categoryGroups.set(category, [])
      categoryGroups.get(category)!.push(entry)
    }

    // Check for oversized categories
    const swapOut: number[] = [] // postIdx to remove
    for (const [, group] of categoryGroups) {
      if (group.length > 2) {
        // Keep top 2 by score, swap the rest
        group.sort((a, b) => b.score - a.score)
        for (let i = 2; i < group.length; i++) {
          swapOut.push(group[i].postIdx)
        }
      }
    }

    if (swapOut.length > 0) {
      // Find replacement posts from unused pool with different categories
      const usedCategories = new Set(
        assigned
          .filter((e) => !swapOut.includes(e.postIdx))
          .map((e) => {
            const garments = (posts[e.postIdx].visionData?.garments || []) as { type: string }[]
            return getPrimaryGarmentCategory(garments)
          })
      )

      // Get scores for this activity from the matrix
      const actScores = matrix
        .filter((m) => m.actKey === actKey && !postUsed.has(m.postIdx) || swapOut.includes(m.postIdx))
        .filter((m) => !postUsed.has(m.postIdx)) // truly unused
        .sort((a, b) => b.score - a.score)

      for (const swapIdx of swapOut) {
        // Find a replacement with a different category
        const replacement = actScores.find((m) => {
          const garments = (posts[m.postIdx].visionData?.garments || []) as { type: string }[]
          const cat = getPrimaryGarmentCategory(garments)
          return !usedCategories.has(cat) || cat === "unknown"
        })

        if (replacement) {
          // Swap
          const idx = assigned.findIndex((e) => e.postIdx === swapIdx)
          if (idx >= 0) {
            postUsed.delete(swapIdx)
            assigned[idx] = { postIdx: replacement.postIdx, score: replacement.score }
            postUsed.add(replacement.postIdx)
            const garments = (posts[replacement.postIdx].visionData?.garments || []) as { type: string }[]
            usedCategories.add(getPrimaryGarmentCategory(garments))
          }
        }
      }
    }
  }

  // 8. Build sections from assignments
  const sections: CapsuleSection[] = []

  for (const ctx of activities) {
    const assigned = assignments.get(ctx.key) || []
    if (assigned.length === 0) continue

    const looks: CapsuleLook[] = assigned.map(({ postIdx, score }) => {
      const post = posts[postIdx]
      const vibe = post.vibeAssignments[0]?.vibe
      return {
        postId: post.id,
        slug: post.slug,
        displayTitle: post.displayTitle,
        outfitImageUrl: post.outfitImageUrl!,
        vibeName: vibe?.name || "",
        vibeSlug: vibe?.slug || "",
        score: Math.round(score * 100),
        products: post.products.map((p) => ({
          id: p.id,
          brand: p.brand,
          itemName: p.itemName,
          productImageUrl: p.productImageUrl,
          affiliateUrl: p.affiliateUrl,
          garmentType: p.garmentType,
        })),
      }
    })

    sections.push({
      activity: ctx.key,
      label: ctx.label,
      icon: ctx.icon,
      looks,
    })
  }

  // 9. Build packing list (deduplicated products)
  const allProducts = sections.flatMap((s) => s.looks.flatMap((l) => l.products))
  const seenProducts = new Map<string, typeof allProducts[0] & { usedInLooks: number }>()
  for (const p of allProducts) {
    if (seenProducts.has(p.id)) {
      seenProducts.get(p.id)!.usedInLooks++
    } else {
      seenProducts.set(p.id, { ...p, usedInLooks: 1 })
    }
  }
  const packingList = Array.from(seenProducts.values())
    .sort((a, b) => b.usedInLooks - a.usedInLooks)

  // 10. Vibe breakdown
  const vibeCounts: Record<string, { name: string; slug: string; count: number }> = {}
  for (const section of sections) {
    for (const look of section.looks) {
      if (look.vibeSlug) {
        if (!vibeCounts[look.vibeSlug]) {
          vibeCounts[look.vibeSlug] = { name: look.vibeName, slug: look.vibeSlug, count: 0 }
        }
        vibeCounts[look.vibeSlug].count++
      }
    }
  }
  const vibeBreakdown = Object.values(vibeCounts).sort((a, b) => b.count - a.count)

  const totalLooks = sections.reduce((sum, s) => sum + s.looks.length, 0)

  return {
    tripName: generateTripName(input),
    sections,
    packingList,
    vibeBreakdown,
    totalLooks,
    totalPieces: packingList.length,
  }
}
