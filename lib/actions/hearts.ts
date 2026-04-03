"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

export async function toggleHeart(itemType: string, itemId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const existing = await prisma.heart.findUnique({
    where: {
      userId_itemType_itemId: {
        userId: session.user.id,
        itemType,
        itemId,
      },
    },
  })

  if (existing) {
    await prisma.heart.delete({ where: { id: existing.id } })
    return { hearted: false }
  }

  await prisma.heart.create({
    data: {
      userId: session.user.id,
      itemType,
      itemId,
    },
  })

  // Track heart event in Klaviyo (non-blocking)
  if (session.user.email) {
    try {
      const { trackHeartEvent } = await import("@/lib/klaviyo/sync")
      const eventName =
        itemType === "look"
          ? "Hearted Look"
          : itemType === "product"
            ? "Hearted Product"
            : "Hearted Vibe"
      trackHeartEvent(session.user.email, eventName, { itemName: itemId })
    } catch {
      // Non-blocking
    }
  }

  return { hearted: true }
}

export async function getUserHearts(itemType?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  return prisma.heart.findMany({
    where: {
      userId: session.user.id,
      ...(itemType ? { itemType } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function isHearted(itemType: string, itemId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return false
  }

  const heart = await prisma.heart.findUnique({
    where: {
      userId_itemType_itemId: {
        userId: session.user.id,
        itemType,
        itemId,
      },
    },
  })

  return !!heart
}

export async function getHeartCounts() {
  const session = await auth()
  if (!session?.user?.id) {
    return { looks: 0, products: 0, vibes: 0, total: 0 }
  }

  const counts = await prisma.heart.groupBy({
    by: ["itemType"],
    where: { userId: session.user.id },
    _count: true,
  })

  const result = { looks: 0, products: 0, vibes: 0, total: 0 }
  for (const group of counts) {
    if (group.itemType === "look") result.looks = group._count
    if (group.itemType === "product") result.products = group._count
    if (group.itemType === "vibe") result.vibes = group._count
    result.total += group._count
  }

  return result
}

export async function getPopularItems(itemType: string, limit: number = 10) {
  const items = await prisma.heart.groupBy({
    by: ["itemId"],
    where: { itemType },
    _count: true,
    orderBy: { _count: { itemId: "desc" } },
    take: limit,
  })

  return items.map((item) => ({
    itemId: item.itemId,
    heartCount: item._count,
  }))
}

export async function mergeGuestHearts(
  hearts: { itemType: string; itemId: string; createdAt: string }[]
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated", merged: 0, skipped: 0 }
  }

  let merged = 0
  let skipped = 0

  for (const heart of hearts) {
    try {
      await prisma.heart.upsert({
        where: {
          userId_itemType_itemId: {
            userId: session.user.id,
            itemType: heart.itemType,
            itemId: heart.itemId,
          },
        },
        create: {
          userId: session.user.id,
          itemType: heart.itemType,
          itemId: heart.itemId,
          createdAt: new Date(heart.createdAt),
        },
        update: {},
      })
      merged++
    } catch {
      skipped++
    }
  }

  return { merged, skipped }
}
