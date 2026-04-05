"use client"

export interface GuestHeart {
  itemType: "look" | "product" | "vibe"
  itemId: string
  createdAt: string
}

export interface GuestHearts {
  visitorId: string
  hearts: GuestHeart[]
  promptDismissedAt?: string
}

const STORAGE_KEY = "vibeshop-hearts"

function generateVisitorId(): string {
  return crypto.randomUUID()
}

function readStore(): GuestHearts {
  if (typeof window === "undefined") {
    return { visitorId: "", hearts: [] }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as GuestHearts
    }
  } catch {
    // Corrupted data — reset
  }

  const fresh: GuestHearts = {
    visitorId: generateVisitorId(),
    hearts: [],
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
  return fresh
}

function writeStore(store: GuestHearts) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getGuestHearts(): GuestHeart[] {
  return readStore().hearts
}

export function addGuestHeart(
  itemType: "look" | "product" | "vibe",
  itemId: string
): void {
  const store = readStore()

  const exists = store.hearts.some(
    (h) => h.itemType === itemType && h.itemId === itemId
  )
  if (exists) return

  store.hearts.push({
    itemType,
    itemId,
    createdAt: new Date().toISOString(),
  })
  writeStore(store)
}

export function removeGuestHeart(
  itemType: "look" | "product" | "vibe",
  itemId: string
): void {
  const store = readStore()
  store.hearts = store.hearts.filter(
    (h) => !(h.itemType === itemType && h.itemId === itemId)
  )
  writeStore(store)
}

export function getGuestHeartCount(): number {
  return readStore().hearts.length
}

export function isGuestHearted(
  itemType: "look" | "product" | "vibe",
  itemId: string
): boolean {
  return readStore().hearts.some(
    (h) => h.itemType === itemType && h.itemId === itemId
  )
}

export function clearGuestHearts(): void {
  const store = readStore()
  store.hearts = []
  writeStore(store)
}

export function shouldShowSignUpPrompt(): boolean {
  const store = readStore()

  if (store.hearts.length < 2) return false

  // Show every session — no cooldown period. If they haven't signed up,
  // they should see the prompt again. Only suppress if dismissed THIS session.
  if (store.promptDismissedAt) {
    const dismissed = new Date(store.promptDismissedAt)
    // Only suppress for 1 hour (same browsing session), not 7 days
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (dismissed > oneHourAgo) return false
  }

  return true
}

export function dismissSignUpPrompt(): void {
  const store = readStore()
  store.promptDismissedAt = new Date().toISOString()
  writeStore(store)
}
