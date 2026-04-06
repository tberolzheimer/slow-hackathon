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

/**
 * Verify that the current user owns the capsule.
 * Guest capsules (userId is null, guestId is set) are handled client-side
 * via localStorage and skip server-side auth.
 */
async function verifyCapsuleOwnership(capsuleId: string) {
  const capsule = await prisma.capsule.findUnique({ where: { id: capsuleId } })
  if (!capsule) return { error: "Capsule not found" as const, capsule: null }

  // Guest capsule — no server-side auth (handled client-side via localStorage guestId)
  if (!capsule.userId && capsule.guestId) {
    return { error: null, capsule }
  }

  // Logged-in user capsule — verify ownership
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated" as const, capsule: null }
  if (capsule.userId !== session.user.id) return { error: "Not authorized" as const, capsule: null }

  return { error: null, capsule }
}

export async function addLookToCapsule(capsuleId: string, lookSlug: string) {
  const { error, capsule } = await verifyCapsuleOwnership(capsuleId)
  if (error || !capsule) return { error: error || "Capsule not found" }

  const looks = Array.isArray(capsule.looks) ? (capsule.looks as string[]) : []
  if (looks.includes(lookSlug)) return { id: capsule.id }

  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { looks: [...looks, lookSlug] },
  })

  return { id: capsule.id }
}

export async function removeLookFromCapsule(capsuleId: string, lookSlug: string) {
  const { error, capsule } = await verifyCapsuleOwnership(capsuleId)
  if (error || !capsule) return { error: error || "Capsule not found" }

  const looks = Array.isArray(capsule.looks) ? (capsule.looks as string[]) : []

  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { looks: looks.filter((s) => s !== lookSlug) },
  })

  return { id: capsule.id }
}

export async function renameCapsule(capsuleId: string, name: string) {
  const { error } = await verifyCapsuleOwnership(capsuleId)
  if (error) return { error }

  await prisma.capsule.update({
    where: { id: capsuleId },
    data: { name },
  })
  return { id: capsuleId }
}

export async function deleteCapsule(capsuleId: string) {
  const { error } = await verifyCapsuleOwnership(capsuleId)
  if (error) return { error }

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
