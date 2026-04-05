"use client"

export interface GuestCapsule {
  id: string
  name: string
  looks: string[] // look slugs
  createdAt: string
}

const STORAGE_KEY = "vibeshop-capsules"

function readCapsules(): GuestCapsule[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as GuestCapsule[]
    }
  } catch {
    // Corrupted data — reset
  }
  return []
}

function writeCapsules(capsules: GuestCapsule[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules))
}

export function getGuestCapsules(): GuestCapsule[] {
  return readCapsules()
}

export function createGuestCapsule(name: string): GuestCapsule {
  const capsules = readCapsules()
  const capsule: GuestCapsule = {
    id: crypto.randomUUID(),
    name,
    looks: [],
    createdAt: new Date().toISOString(),
  }
  capsules.push(capsule)
  writeCapsules(capsules)
  return capsule
}

export function renameGuestCapsule(id: string, name: string) {
  const capsules = readCapsules()
  const capsule = capsules.find((c) => c.id === id)
  if (capsule) {
    capsule.name = name
    writeCapsules(capsules)
  }
}

export function deleteGuestCapsule(id: string) {
  const capsules = readCapsules().filter((c) => c.id !== id)
  writeCapsules(capsules)
}

export function addLookToGuestCapsule(capsuleId: string, lookSlug: string) {
  const capsules = readCapsules()
  const capsule = capsules.find((c) => c.id === capsuleId)
  if (capsule && !capsule.looks.includes(lookSlug)) {
    capsule.looks.push(lookSlug)
    writeCapsules(capsules)
  }
}

export function removeLookFromGuestCapsule(capsuleId: string, lookSlug: string) {
  const capsules = readCapsules()
  const capsule = capsules.find((c) => c.id === capsuleId)
  if (capsule) {
    capsule.looks = capsule.looks.filter((s) => s !== lookSlug)
    writeCapsules(capsules)
  }
}
