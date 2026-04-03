import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"

const prisma = new PrismaClient()
const anthropic = new Anthropic()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Vibe Renamer")
  console.log("═══════════════════════════════════════\n")

  const vibes = await prisma.vibe.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      vibeAssignments: {
        take: 50,
        include: {
          post: {
            include: { visionData: true },
          },
        },
      },
    },
  })

  const usedNames: string[] = []

  for (const vibe of vibes) {
    // Gather keywords and stats from the vibe's posts
    const allKeywords: Record<string, number> = {}
    const seasons: Record<string, number> = {}
    const moods: Record<string, number> = {}
    const settings: Record<string, number> = {}

    for (const assignment of vibe.vibeAssignments) {
      const vd = assignment.post.visionData
      if (!vd) continue
      if (vd.season) seasons[vd.season] = (seasons[vd.season] || 0) + 1
      if (vd.mood) moods[vd.mood] = (moods[vd.mood] || 0) + 1
      if (vd.setting) settings[vd.setting] = (settings[vd.setting] || 0) + 1
      const kws = Array.isArray(vd.vibeKeywords) ? (vd.vibeKeywords as string[]) : []
      for (const kw of kws) allKeywords[kw] = (allKeywords[kw] || 0) + 1
    }

    const topKeywords = Object.entries(allKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k)

    const topMoods = Object.entries(moods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k)

    const topSeasons = Object.entries(seasons)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s}: ${n}`)
      .join(", ")

    const topSettings = Object.entries(settings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k)

    // Generate new name
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Name this fashion vibe in 2-3 words and write a tagline (max 10 words).

Think like a playlist name or a photo album title. Simple. Visual. A moment or a place, not an adjective + noun combo.

Good examples: "Endless Summer", "Sunday Garden", "After Dark", "Charleston Morning", "Riviera Lunch", "October Layers", "Market Day", "Somewhere Warm", "The Coat Edit", "White Shirt Energy"

BAD — do NOT use these words: golden, wanderer, wandering, confidence, confident, muse, radiant, energy, spirit, grace, society, optimist

Already used names (do NOT repeat): ${usedNames.join(", ")}

This vibe has ${vibe.vibeAssignments.length} outfits:
- Keywords: ${topKeywords.join(", ")}
- Moods: ${topMoods.join(", ")}
- Seasons: ${topSeasons}
- Settings: ${topSettings.join(", ")}

Return JSON only:
{"name": "2-3 word name", "tagline": "max 10 word tagline"}`,
        },
      ],
    })

    const text = response.content.find((b) => b.type === "text")
    if (!text || text.type !== "text") continue

    let jsonStr = text.text.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) jsonStr = jsonMatch[1].trim()

    try {
      const { name, tagline } = JSON.parse(jsonStr)
      const newSlug = slugify(name)

      // Check for slug collision
      const existing = await prisma.vibe.findUnique({ where: { slug: newSlug } })
      if (existing && existing.id !== vibe.id) {
        console.log(`  SKIP "${name}" — slug collision with ${existing.name}`)
        continue
      }

      await prisma.vibe.update({
        where: { id: vibe.id },
        data: { name, slug: newSlug, tagline },
      })

      usedNames.push(name)
      console.log(`  ${vibe.name} → "${name}" — ${tagline}`)
    } catch (err) {
      console.error(`  Failed to parse: ${jsonStr}`)
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log("\nDone! New vibes:")
  const updated = await prisma.vibe.findMany({ orderBy: { sortOrder: "asc" } })
  for (const v of updated) {
    console.log(`  ${v.name} (${v.slug}) — ${v.tagline}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
