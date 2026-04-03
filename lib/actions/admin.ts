"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session
}

export async function approveVibe(vibeId: string) {
  await requireAuth()
  await prisma.vibe.update({
    where: { id: vibeId },
    data: { approvedAt: new Date() },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function unapproveVibe(vibeId: string) {
  await requireAuth()
  await prisma.vibe.update({
    where: { id: vibeId },
    data: { approvedAt: null },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function updateVibe(
  vibeId: string,
  data: { name?: string; tagline?: string; introText?: string }
) {
  await requireAuth()
  const updateData: Record<string, string> = {}
  if (data.name !== undefined) {
    updateData.name = data.name
    updateData.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }
  if (data.tagline !== undefined) updateData.tagline = data.tagline
  if (data.introText !== undefined) updateData.introText = data.introText

  await prisma.vibe.update({ where: { id: vibeId }, data: updateData })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function deleteVibe(vibeId: string) {
  await requireAuth()
  await prisma.vibeAssignment.deleteMany({ where: { vibeId } })
  await prisma.vibe.delete({ where: { id: vibeId } })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function approveAllVibes() {
  await requireAuth()
  await prisma.vibe.updateMany({
    where: { approvedAt: null },
    data: { approvedAt: new Date() },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function createVibe(data: {
  name: string
  tagline?: string
  introText?: string
  type: string
}) {
  await requireAuth()
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const vibe = await prisma.vibe.create({
    data: {
      name: data.name,
      slug,
      tagline: data.tagline || null,
      introText: data.introText || null,
      type: data.type,
      approvedAt: new Date(), // editorial vibes are approved on creation
    },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
  return vibe.id
}

export async function assignPostsToVibe(vibeId: string, postIds: string[]) {
  await requireAuth()
  for (const postId of postIds) {
    await prisma.vibeAssignment.upsert({
      where: { postId_vibeId: { postId, vibeId } },
      create: { postId, vibeId, confidenceScore: 1.0, assignedBy: "manual" },
      update: {},
    })
  }
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function removePostFromVibe(vibeId: string, postId: string) {
  await requireAuth()
  await prisma.vibeAssignment.delete({
    where: { postId_vibeId: { postId, vibeId } },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}
