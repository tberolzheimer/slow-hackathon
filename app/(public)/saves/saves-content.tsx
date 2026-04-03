"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeartButton } from "@/components/heart-button"
import { Input } from "@/components/ui/input"
import { getGuestHearts } from "@/lib/hearts/guest-hearts"
import { clearGuestHearts } from "@/lib/hearts/guest-hearts"
import { getUserHearts } from "@/lib/actions/hearts"
import { createAccountFromEmail } from "@/lib/actions/auth"

type FilterType = "all" | "look" | "product" | "vibe"

interface SavedItem {
  itemType: string
  itemId: string
  createdAt: string
  // Fetched data
  title?: string
  imageUrl?: string
  href?: string
  brand?: string
  subtitle?: string
}

export function SavesContent() {
  const { data: session } = useSession()
  const [items, setItems] = useState<SavedItem[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHearts() {
      let hearts: { itemType: string; itemId: string; createdAt: string }[]

      if (session?.user) {
        const dbHearts = await getUserHearts()
        hearts = dbHearts.map((h) => ({
          itemType: h.itemType,
          itemId: h.itemId,
          createdAt: h.createdAt.toISOString(),
        }))
      } else {
        const guest = getGuestHearts()
        hearts = guest.map((h) => ({
          itemType: h.itemType,
          itemId: h.itemId,
          createdAt: h.createdAt,
        }))
      }

      // Fetch actual data for each hearted item
      if (hearts.length > 0) {
        try {
          const res = await fetch("/api/saves/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: hearts }),
          })
          if (res.ok) {
            const resolved = await res.json()
            setItems(resolved)
          } else {
            setItems(hearts)
          }
        } catch {
          setItems(hearts)
        }
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
      {/* Guest email capture */}
      {!session?.user && (
        <EmailCapture heartCount={items.length} hearts={items} />
      )}

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
  const href = item.href || (
    item.itemType === "look"
      ? `/look/${item.itemId}`
      : item.itemType === "vibe"
        ? `/vibe/${item.itemId}`
        : "#"
  )

  return (
    <div className="relative group">
      <Link href={href} className="block rounded-lg overflow-hidden bg-muted">
        {item.imageUrl ? (
          <div className="relative aspect-[3/4]">
            <Image
              src={item.imageUrl}
              alt={item.title || "Saved item"}
              fill
              className="object-cover group-hover:brightness-90 transition-all"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        ) : (
          <div className="aspect-[3/4] flex items-center justify-center">
            <Badge variant="secondary">{item.itemType}</Badge>
          </div>
        )}
      </Link>
      <div className="absolute top-2 right-2 z-10">
        <HeartButton
          itemType={item.itemType as "look" | "product" | "vibe"}
          itemId={item.itemId}
          size="sm"
        />
      </div>
      <div className="mt-2">
        {item.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {item.brand}
          </p>
        )}
        <p className="text-sm text-foreground truncate">
          {item.title || item.itemType}
        </p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        )}
      </div>
    </div>
  )
}

function EmailCapture({
  heartCount,
  hearts,
}: {
  heartCount: number
  hearts: SavedItem[]
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus("loading")
    try {
      const result = await createAccountFromEmail(
        email.trim(),
        hearts.map((h) => ({
          itemType: h.itemType,
          itemId: h.itemId,
          createdAt: h.createdAt,
        }))
      )
      if (result && "error" in result) {
        setErrorMsg(result.error || "Something went wrong")
        setStatus("error")
      } else {
        clearGuestHearts()
        setStatus("success")
      }
    } catch {
      // signIn redirect throws — this is expected success
      clearGuestHearts()
      setStatus("success")
    }
  }

  if (status === "success") {
    return (
      <div className="text-center mb-8 p-6 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-sm text-foreground font-medium">
          Done! Your {heartCount} saved items are now synced across all your devices.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center mb-8 p-6 rounded-xl bg-muted/50">
      <p className="text-sm text-foreground mb-1 font-medium">
        Don&apos;t lose out on your {heartCount} saves
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your email to keep them forever across all your devices.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          required
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save My Hearts"}
        </Button>
      </form>
      {status === "error" && (
        <p className="text-sm text-destructive mt-2">{errorMsg}</p>
      )}
    </div>
  )
}
