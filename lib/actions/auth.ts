"use server"

import { signIn } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    return { error: "An account with this email already exists" }
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name: name || null,
      email,
      password: hashed,
    },
  })

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/protected",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to sign in after registration" }
    }
    throw error
  }
}

export async function createAccountFromEmail(
  email: string,
  hearts: { itemType: string; itemId: string; createdAt: string }[]
) {
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email" }
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email },
    })
  }

  // Merge guest hearts
  let merged = 0
  for (const heart of hearts) {
    try {
      await prisma.heart.upsert({
        where: {
          userId_itemType_itemId: {
            userId: user.id,
            itemType: heart.itemType,
            itemId: heart.itemId,
          },
        },
        create: {
          userId: user.id,
          itemType: heart.itemType,
          itemId: heart.itemId,
          createdAt: new Date(heart.createdAt),
        },
        update: {},
      })
      merged++
    } catch {
      // Skip duplicates
    }
  }

  // Sync to Klaviyo (non-blocking)
  try {
    const { syncProfileToKlaviyo } = await import("@/lib/klaviyo/sync")
    // Compute vibe preferences from hearts
    const vibeHearts = hearts.filter((h) => h.itemType === "vibe").map((h) => h.itemId)
    // Get vibe names for look hearts
    const lookHearts = hearts.filter((h) => h.itemType === "look")
    const vibeNames: string[] = [...vibeHearts]
    if (lookHearts.length > 0) {
      const assignments = await prisma.vibeAssignment.findMany({
        where: { post: { slug: { in: lookHearts.map((h) => h.itemId) } } },
        include: { vibe: { select: { name: true } } },
      })
      vibeNames.push(...assignments.map((a) => a.vibe.name))
    }
    const uniqueVibes = [...new Set(vibeNames)]
    await syncProfileToKlaviyo(email, {
      heartedVibes: uniqueVibes,
      heartCount: hearts.length,
      topVibe: uniqueVibes[0] || "",
    })
  } catch (err) {
    console.error("Klaviyo sync failed (non-blocking):", err)
  }

  // Send magic link via Resend
  try {
    await signIn("resend", {
      email,
      redirectTo: "/saves",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // Magic link sent successfully — Auth.js throws a redirect
      return { merged, magicLinkSent: true }
    }
    throw error
  }

  return { merged, magicLinkSent: true }
}

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/protected",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" }
    }
    throw error
  }
}
