import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"

const prisma = new PrismaClient()
const anthropic = new Anthropic()
const RATE_LIMIT_MS = 1000

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log("  VibeShop Vibe Copy Rewriter")
  console.log("  Rewriting taglines + intros to match JB brand voice")
  console.log("═══════════════════════════════════════════════════\n")

  // Load all vibes with their posts' VisionData
  const vibes = await prisma.vibe.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      vibeAssignments: {
        include: {
          post: {
            include: { visionData: true },
          },
        },
      },
    },
  })

  console.log(`Found ${vibes.length} vibes to rewrite\n`)

  const usedTaglines: string[] = []

  for (let i = 0; i < vibes.length; i++) {
    const vibe = vibes[i]

    // Gather stats from this vibe's posts' VisionData
    const moodCounts: Record<string, number> = {}
    const seasonCounts: Record<string, number> = {}
    const settingCounts: Record<string, number> = {}
    const keywordCounts: Record<string, number> = {}

    for (const assignment of vibe.vibeAssignments) {
      const vd = assignment.post.visionData
      if (!vd) continue
      if (vd.mood) moodCounts[vd.mood] = (moodCounts[vd.mood] || 0) + 1
      if (vd.season) seasonCounts[vd.season] = (seasonCounts[vd.season] || 0) + 1
      if (vd.setting) settingCounts[vd.setting] = (settingCounts[vd.setting] || 0) + 1
      const kws = Array.isArray(vd.vibeKeywords) ? (vd.vibeKeywords as string[]) : []
      for (const kw of kws) keywordCounts[kw] = (keywordCounts[kw] || 0) + 1
    }

    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `${k} (${n})`)
    const topSeasons = Object.entries(seasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `${k} (${n})`)
    const topSettings = Object.entries(settingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `${k} (${n})`)
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k]) => k)

    const lookCount = vibe.vibeAssignments.length

    console.log(`───────────────────────────────────────────────────`)
    console.log(`[${i + 1}/${vibes.length}] ${vibe.name} (${lookCount} looks)`)
    console.log(`  OLD tagline:  ${vibe.tagline || "(none)"}`)
    console.log(`  OLD intro:    ${vibe.introText ? vibe.introText.slice(0, 120) + "..." : "(none)"}`)

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `You are writing taglines and intro copy for Julia Berolzheimer's fashion website VibeShop.

## Brand Voice Rules

TAGLINE rules:
- One sentence that puts you in the scene
- No product words (no "looks," "styles," "collection," "pieces")
- Max 10 words
- Good: "Sun on your shoulders, nowhere to be" / "The morning is yours and so is the garden" / "Red lipstick, cold air, somewhere downtown"
- Bad: "Relaxed summer looks for every day" / "Where comfort meets sophistication" / "Elevated essentials for the modern woman"
- Do NOT use "Where X meets Y" formula

INTRO rules:
- 2-3 sentences
- Start with a sensory detail or a scene — NOT a demographic ("This is for the woman who...")
- Third person about Julia (e.g., "Julia kept coming back to..." or "The trick is...")
- Good: "Saturday mornings at the vintage shop, Sunday coffee in the garden. The prints are bold, the layers are intentional. Julia kept coming back to pieces that feel found, not bought."
- Bad: "This is for the woman who treats the world as her canvas. A free-spirited collection that captures wanderlust and creativity."

BANNED words/phrases (do NOT use any of these): effortless, golden, wanderer, confidence, muse, radiant, energy, spirit, elevate, empower, timeless beauty, the modern woman, for every occasion, where X meets Y, "This is for the woman who"

PREFERRED phrases (use where natural): reach for, the trick is, works with, feels like, kept coming back to

## This Vibe

Name: ${vibe.name}
Look count: ${lookCount}
Top moods: ${topMoods.join(", ") || "unknown"}
Top seasons: ${topSeasons.join(", ") || "unknown"}
Top settings: ${topSettings.join(", ") || "unknown"}
Top keywords: ${topKeywords.join(", ") || "unknown"}

## Already-Used Taglines (avoid repetition)
${usedTaglines.length > 0 ? usedTaglines.map((t) => `- "${t}"`).join("\n") : "(none yet)"}

## Instructions

Write a new tagline and intro for the "${vibe.name}" vibe. Keep the vibe name exactly as-is. Make the tagline and intro feel distinct from all already-used taglines.

Return JSON only, no markdown fences:
{"tagline": "...", "introText": "..."}`,
          },
        ],
      })

      const textBlock = response.content.find((b) => b.type === "text")
      if (!textBlock || textBlock.type !== "text") {
        console.log(`  SKIP — no text in response`)
        continue
      }

      let jsonStr = textBlock.text.trim()
      // Strip markdown code fences if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) jsonStr = jsonMatch[1].trim()

      const { tagline, introText } = JSON.parse(jsonStr)

      // Update DB
      await prisma.vibe.update({
        where: { id: vibe.id },
        data: { tagline, introText },
      })

      usedTaglines.push(tagline)

      console.log(`  NEW tagline:  ${tagline}`)
      console.log(`  NEW intro:    ${introText}`)
    } catch (err) {
      console.error(`  ERROR: ${err}`)
    }

    // Rate limit: 1 request per second
    if (i < vibes.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  // Final summary
  console.log(`\n═══════════════════════════════════════════════════`)
  console.log(`  FINAL RESULTS — All ${vibes.length} vibes`)
  console.log(`═══════════════════════════════════════════════════\n`)

  const updated = await prisma.vibe.findMany({ orderBy: { sortOrder: "asc" } })
  for (const v of updated) {
    console.log(`${v.name}`)
    console.log(`  Tagline: ${v.tagline}`)
    console.log(`  Intro:   ${v.introText}`)
    console.log()
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
