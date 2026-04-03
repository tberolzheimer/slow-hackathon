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

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "An account with this email already exists. Try signing in." }
  }

  // Generate a random password (user can set a real one later via reset flow)
  const randomPassword = crypto.randomUUID()
  const hashed = await bcrypt.hash(randomPassword, 10)

  const user = await prisma.user.create({
    data: { email, password: hashed },
  })

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

  // Sign in the user
  try {
    await signIn("credentials", {
      email,
      password: randomPassword,
      redirectTo: "/saves",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created but sign-in failed. Try signing in manually." }
    }
    throw error
  }

  return { merged }
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
