"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "admin" && role !== "editor") throw new Error("Forbidden")
  return session
}

// ─── Dashboard Stats ──────────────────────────────────────────────

export async function getAdminStats() {
  await requireAdmin()
  const [postCount, productCount, vibeCount, heartCount, userCount, recentUsers] =
    await Promise.all([
      prisma.post.count(),
      prisma.product.count(),
      prisma.vibe.count(),
      prisma.heart.count(),
      prisma.user.count(),
      prisma.user.findMany({
        orderBy: { id: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, role: true },
      }),
    ])
  return { postCount, productCount, vibeCount, heartCount, userCount, recentUsers }
}

// ─── Vibe Actions ─────────────────────────────────────────────────

export async function approveVibe(vibeId: string) {
  await requireAdmin()
  await prisma.vibe.update({
    where: { id: vibeId },
    data: { approvedAt: new Date() },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function unapproveVibe(vibeId: string) {
  await requireAdmin()
  await prisma.vibe.update({
    where: { id: vibeId },
    data: { approvedAt: null },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function updateVibe(
  vibeId: string,
  data: { name?: string; tagline?: string; introText?: string; accentColor?: string }
) {
  await requireAdmin()
  const updateData: Record<string, string | null> = {}
  if (data.name !== undefined) {
    updateData.name = data.name
    updateData.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }
  if (data.tagline !== undefined) updateData.tagline = data.tagline || null
  if (data.introText !== undefined) updateData.introText = data.introText || null
  if (data.accentColor !== undefined) updateData.accentColor = data.accentColor || null

  await prisma.vibe.update({ where: { id: vibeId }, data: updateData })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function deleteVibe(vibeId: string) {
  await requireAdmin()
  await prisma.vibeAssignment.deleteMany({ where: { vibeId } })
  await prisma.vibe.delete({ where: { id: vibeId } })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

export async function approveAllVibes() {
  await requireAdmin()
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
  await requireAdmin()
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
      approvedAt: new Date(),
    },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
  return vibe.id
}

export async function assignPostsToVibe(vibeId: string, postIds: string[]) {
  await requireAdmin()
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
  await requireAdmin()
  await prisma.vibeAssignment.delete({
    where: { postId_vibeId: { postId, vibeId } },
  })
  revalidatePath("/")
  revalidatePath("/admin/vibes")
}

// ─── Post/Look Actions ───────────────────────────────────────────

export async function updatePost(
  postId: string,
  data: { displayTitle?: string; stylingNotes?: string }
) {
  await requireAdmin()

  // Update post fields
  if (data.displayTitle !== undefined) {
    await prisma.post.update({
      where: { id: postId },
      data: { displayTitle: data.displayTitle || null },
    })
  }

  // Update styling notes on visionData
  if (data.stylingNotes !== undefined) {
    await prisma.visionData.updateMany({
      where: { postId },
      data: { stylingNotes: data.stylingNotes || null },
    })
  }

  revalidatePath("/")
  revalidatePath("/admin/looks")
}

export async function updatePostVibe(postId: string, vibeId: string) {
  await requireAdmin()
  // Remove existing assignments for this post
  await prisma.vibeAssignment.deleteMany({ where: { postId } })
  // Add new assignment
  if (vibeId) {
    await prisma.vibeAssignment.create({
      data: { postId, vibeId, confidenceScore: 1.0, assignedBy: "manual" },
    })
  }
  revalidatePath("/")
  revalidatePath("/admin/looks")
}

// ─── Product Actions ──────────────────────────────────────────────

export async function updateProduct(
  productId: string,
  data: { brand?: string; itemName?: string; garmentType?: string; stockStatus?: string }
) {
  await requireAdmin()
  const updateData: Record<string, string | null> = {}
  if (data.brand !== undefined) updateData.brand = data.brand || null
  if (data.itemName !== undefined) updateData.itemName = data.itemName || null
  if (data.garmentType !== undefined) updateData.garmentType = data.garmentType || null
  if (data.stockStatus !== undefined) updateData.stockStatus = data.stockStatus

  await prisma.product.update({ where: { id: productId }, data: updateData })
  revalidatePath("/")
  revalidatePath("/admin/products")
}

export async function deleteProduct(productId: string) {
  await requireAdmin()
  await prisma.product.delete({ where: { id: productId } })
  revalidatePath("/")
  revalidatePath("/admin/products")
}

export async function bulkUpdateProductStatus(productIds: string[], stockStatus: string) {
  await requireAdmin()
  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { stockStatus },
  })
  revalidatePath("/")
  revalidatePath("/admin/products")
}

export async function bulkDeleteProducts(productIds: string[]) {
  await requireAdmin()
  await prisma.product.deleteMany({
    where: { id: { in: productIds } },
  })
  revalidatePath("/")
  revalidatePath("/admin/products")
}

// ─── Team / Invite Actions ────────────────────────────────────────

export async function inviteTeamMember(email: string, role: string) {
  const session = await requireAdmin()
  // Only admins can invite (not editors)
  if (session.user.role !== "admin") throw new Error("Only admins can invite team members")

  const normalizedEmail = email.toLowerCase().trim()
  if (!normalizedEmail.includes("@")) throw new Error("Invalid email")

  // Check if already invited
  const existing = await prisma.adminInvite.findUnique({
    where: { email: normalizedEmail },
  })
  if (existing) {
    // Update the existing invite
    await prisma.adminInvite.update({
      where: { id: existing.id },
      data: { role, usedAt: null, invitedBy: session.user.id },
    })
  } else {
    await prisma.adminInvite.create({
      data: {
        email: normalizedEmail,
        role,
        invitedBy: session.user.id,
      },
    })
  }

  // Send invite email via Resend
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000"
      const inviteUrl = `${baseUrl}/admin/accept-invite`

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "VibeShop <hello@juliaberolzheimer.com>",
          to: [normalizedEmail],
          subject: `You're invited to the VibeShop admin team`,
          html: `
            <h2>You've been invited!</h2>
            <p>You've been invited to join the VibeShop admin team as an <strong>${role}</strong>.</p>
            <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Accept Invite</a></p>
            <p style="color:#666;font-size:14px;">Sign in with Google using this email address (${normalizedEmail}) to accept.</p>
          `,
        }),
      })
    }
  } catch (err) {
    console.error("Failed to send invite email:", err)
    // Don't throw — the invite record was created, email is non-critical
  }

  revalidatePath("/admin/team")
  return { success: true }
}

export async function getTeamMembers() {
  await requireAdmin()
  const [members, invites] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true, name: true, email: true, role: true, image: true },
      orderBy: { role: "asc" },
    }),
    prisma.adminInvite.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, usedAt: true, createdAt: true },
    }),
  ])
  return { members, invites }
}

export async function removeTeamMember(userId: string) {
  const session = await requireAdmin()
  if (session.user.role !== "admin") throw new Error("Only admins can remove team members")
  if (userId === session.user.id) throw new Error("Cannot remove yourself")

  await prisma.user.update({
    where: { id: userId },
    data: { role: "user" },
  })
  revalidatePath("/admin/team")
}

export async function deleteInvite(inviteId: string) {
  const session = await requireAdmin()
  if (session.user.role !== "admin") throw new Error("Only admins can delete invites")
  await prisma.adminInvite.delete({ where: { id: inviteId } })
  revalidatePath("/admin/team")
}
