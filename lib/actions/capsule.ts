"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { generateCapsuleFromTrip, type TripInput, type CapsuleResult } from "@/lib/ai/capsule-engine"

export async function generateCapsule(input: TripInput): Promise<CapsuleResult> {
  return generateCapsuleFromTrip(input)
}

export async function createCapsule(name: string, lookSlugs: string[], guestId?: string) {
  const session = await auth()
  const userId = session?.user?.id || null

  if (!userId && !guestId) {
    return { error: "Must be logged in or provide a guestId" }
  }

  const capsule = await prisma.capsule.create({
    data: {
      name,
      looks: lookSlugs,
      userId,
      guestId: userId ? null : guestId,
    },
  })

  return { id: capsule.id, name: capsule.name }
}

export async function addLookToCapsule(capsuleId: string, lookSlug: string) {
  const capsule = await prisma.capsule.findUnique({ where: { id: capsuleId } })
  if (!capsule) return { error: "Capsule not found" }

  const looks = Array.isArray(capsule.looks) ? (capsule.looks as string[]) : []
  if (looks.includes(lookSlug)) return { id: capsule.id }

  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { looks: [...looks, lookSlug] },
  })

  return { id: capsule.id }
}

export async function removeLookFromCapsule(capsuleId: string, lookSlug: string) {
  const capsule = await prisma.capsule.findUnique({ where: { id: capsuleId } })
  if (!capsule) return { error: "Capsule not found" }

  const looks = Array.isArray(capsule.looks) ? (capsule.looks as string[]) : []

  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { looks: looks.filter((s) => s !== lookSlug) },
  })

  return { id: capsule.id }
}

export async function renameCapsule(capsuleId: string, name: string) {
  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { name },
  })
  return { id: capsuleId }
}

export async function deleteCapsule(capsuleId: string) {
  await prisma.capsule.delete({ where: { id: capsuleId } })
  return { success: true }
}

export async function getUserCapsules() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.capsule.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
}
