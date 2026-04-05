import { prisma } from "@/lib/db/prisma"
import type { Metadata } from "next"
import { StyleMatch } from "./style-match"

export const metadata: Metadata = {
  title: "Style Match — Which of Julia's Aesthetics Are Yours? | VibeShop",
  description:
    "Swipe through 20 of Julia Berolzheimer's looks. We'll build your Style DNA and show you which vibes match your aesthetic.",
}

interface MatchCard {
  id: string
  slug: string
  displayTitle: string
  outfitImageUrl: string
  vibeName: string
  vibeSlug: string
}

export default async function MatchPage() {
  // Select 2 outfits from each vibe, weighted toward popular vibes
  const vibes = await prisma.vibe.findMany({
    where: { approvedAt: { not: null } },
    include: {
      vibeAssignments: {
        orderBy: { confidenceScore: "desc" },
        take: 10,
        include: {
          post: {
            select: {
              id: true,
              slug: true,
              displayTitle: true,
              title: true,
              outfitImageUrl: true,
            },
          },
        },
      },
    },
  })

  // Pick 2 random from each vibe
  const cards: MatchCard[] = []
  for (const vibe of vibes) {
    const postsWithImages = vibe.vibeAssignments
      .map((a) => a.post)
      .filter((p) => p.outfitImageUrl)

    // Shuffle and take 2
    const shuffled = postsWithImages.sort(() => Math.random() - 0.5)
    for (const post of shuffled.slice(0, 2)) {
      cards.push({
        id: post.id,
        slug: post.slug,
        displayTitle: post.displayTitle || post.title,
        outfitImageUrl: post.outfitImageUrl!,
        vibeName: vibe.name,
        vibeSlug: vibe.slug,
      })
    }
  }

  // Shuffle all cards and take 20
  const shuffledCards = cards.sort(() => Math.random() - 0.5).slice(0, 20)

  return <StyleMatch cards={shuffledCards} />
}
