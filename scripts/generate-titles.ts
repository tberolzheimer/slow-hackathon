import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"

const prisma = new PrismaClient()
const anthropic = new Anthropic()
const RATE_LIMIT_MS = 300 // Faster since these are tiny prompts

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("VibeShop Display Title Generator")
  console.log("═══════════════════════════════════════\n")

  // Re-generate ALL titles (not just null ones) to remove location hallucinations
  const posts = await prisma.post.findMany({
    where: {
      visionData: { isNot: null },
    },
    include: {
      visionData: true,
      products: {
        where: { isAlternative: false },
        take: 3,
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: 500,
  })

  console.log(`Found ${posts.length} posts needing titles\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const vd = post.visionData
    if (!vd) continue

    try {
      const garments = Array.isArray(vd.garments)
        ? (vd.garments as { type: string; colorName: string }[])
            .map((g) => `${g.colorName} ${g.type}`)
            .join(", ")
        : ""

      const brands = post.products
        .map((p) => p.brand)
        .filter(Boolean)
        .join(", ")

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: `Generate a short evocative title (3-6 words) for this outfit. Name the feeling or moment, not just the garments. Like a magazine headline.

IMPORTANT: Do NOT include specific city, country, or location names (e.g., Positano, Paris, Charleston, Tuscany, Amalfi). The AI cannot reliably identify locations from photos. Use generic setting words instead (garden, poolside, coastal, city, cobblestone, porch).

Garments: ${garments}
Brands: ${brands}
Mood: ${vd.mood}
Season: ${vd.season}
Setting: ${vd.setting}

Return ONLY the title, nothing else. No quotes.`,
          },
        ],
      })

      const text = response.content.find((b) => b.type === "text")
      if (text && text.type === "text") {
        const title = text.text.trim().replace(/^["']|["']$/g, "")
        await prisma.post.update({
          where: { id: post.id },
          data: { displayTitle: title },
        })
        console.log(`[${i + 1}/${posts.length}] ${post.title} → "${title}"`)
        success++
      }
    } catch (err) {
      console.error(`[${i + 1}/${posts.length}] Failed: ${err}`)
      failed++
    }

    if (i < posts.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
    }
  }

  console.log(`\nDone! ${success} titles generated, ${failed} failed`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
