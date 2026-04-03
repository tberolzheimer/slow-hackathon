"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"
import { getGuestHearts, type GuestHeart } from "@/lib/hearts/guest-hearts"
import { getUserHearts } from "@/lib/actions/hearts"

type FilterType = "all" | "look" | "product" | "vibe"

interface SavedItem {
  itemType: string
  itemId: string
  createdAt: string
}

export function SavesContent() {
  const { data: session } = useSession()
  const [items, setItems] = useState<SavedItem[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHearts() {
      if (session?.user) {
        // Logged in: fetch from server
        const hearts = await getUserHearts()
        setItems(
          hearts.map((h) => ({
            itemType: h.itemType,
            itemId: h.itemId,
            createdAt: h.createdAt.toISOString(),
          }))
        )
      } else {
        // Guest: read localStorage
        const guest = getGuestHearts()
        setItems(
          guest.map((h) => ({
            itemType: h.itemType,
            itemId: h.itemId,
            createdAt: h.createdAt,
          }))
        )
      }
      setLoading(false)
    }
    loadHearts()
  }, [session])

  const filtered =
    filter === "all" ? items : items.filter((i) => i.itemType === filter)

  const counts = {
    all: items.length,
    look: items.filter((i) => i.itemType === "look").length,
    product: items.filter((i) => i.itemType === "product").length,
    vibe: items.filter((i) => i.itemType === "vibe").length,
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground mb-2">
          You haven&apos;t saved anything yet.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Browse vibes and tap the heart on looks you love.
        </p>
        <Button asChild>
          <Link href="/">Explore Vibes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(
          [
            ["all", "All"],
            ["look", "Looks"],
            ["product", "Products"],
            ["vibe", "Vibes"],
          ] as [FilterType, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map((item) => (
          <SavedItemCard key={`${item.itemType}-${item.itemId}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function SavedItemCard({ item }: { item: SavedItem }) {
  // For now, render a simple card linking to the item
  // In the future, we could fetch full item data for richer cards
  const href =
    item.itemType === "look"
      ? `/look/${item.itemId}`
      : item.itemType === "vibe"
        ? `/vibe/${item.itemId}`
        : "#"

  return (
    <div className="relative group">
      <Link href={href} className="block rounded-lg overflow-hidden bg-muted">
        <div className="aspect-[3/4] flex items-center justify-center">
          <div className="text-center p-4">
            <Badge variant="secondary" className="mb-2">
              {item.itemType}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Saved {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <HeartButton
          itemType={item.itemType as "look" | "product" | "vibe"}
          itemId={item.itemId}
          size="sm"
        />
      </div>
    </div>
  )
}
