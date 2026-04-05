"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import {
  Heart,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  FolderPlus,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { HeartButton } from "@/components/heart-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getGuestHearts, clearGuestHearts } from "@/lib/hearts/guest-hearts"
import {
  getGuestCapsules,
  createGuestCapsule,
  renameGuestCapsule,
  deleteGuestCapsule,
  addLookToGuestCapsule,
  removeLookFromGuestCapsule,
  type GuestCapsule,
} from "@/lib/hearts/guest-capsules"
import { getUserHearts } from "@/lib/actions/hearts"
import {
  getUserCapsules,
  createCapsule,
  renameCapsule,
  deleteCapsule,
  addLookToCapsule,
  removeLookFromCapsule,
} from "@/lib/actions/capsule"
import { createAccountFromEmail } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"

type FilterType = "all" | "look" | "product" | "vibe"

interface SavedItem {
  itemType: string
  itemId: string
  createdAt: string
  title?: string
  imageUrl?: string
  href?: string
  brand?: string
  subtitle?: string
}

interface CapsuleData {
  id: string
  name: string
  looks: string[]
}

interface SuggestedLook {
  postId: string
  slug: string
  displayTitle: string
  outfitImageUrl: string | null
  similarity: number
}

export function SavesContent() {
  const { data: session } = useSession()
  const [items, setItems] = useState<SavedItem[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)
  const [capsules, setCapsules] = useState<CapsuleData[]>([])
  const [expandedCapsule, setExpandedCapsule] = useState<string | null>(null)
  const [showCreateCapsule, setShowCreateCapsule] = useState(false)
  const [newCapsuleName, setNewCapsuleName] = useState("")

  const isLoggedIn = !!session?.user

  // Load hearts
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

  // Load capsules
  useEffect(() => {
    async function loadCapsules() {
      if (isLoggedIn) {
        const dbCapsules = await getUserCapsules()
        setCapsules(
          dbCapsules.map((c) => ({
            id: c.id,
            name: c.name,
            looks: Array.isArray(c.looks) ? (c.looks as string[]) : [],
          }))
        )
      } else {
        const guestCaps = getGuestCapsules()
        setCapsules(
          guestCaps.map((c) => ({
            id: c.id,
            name: c.name,
            looks: c.looks,
          }))
        )
      }
    }
    loadCapsules()
  }, [isLoggedIn])

  const handleCreateCapsule = useCallback(async () => {
    const name = newCapsuleName.trim()
    if (!name) return

    if (isLoggedIn) {
      const result = await createCapsule(name, [])
      if (result && "id" in result) {
        setCapsules((prev) => [
          { id: result.id as string, name, looks: [] },
          ...prev,
        ])
      }
    } else {
      const capsule = createGuestCapsule(name)
      setCapsules((prev) => [
        { id: capsule.id, name: capsule.name, looks: capsule.looks },
        ...prev,
      ])
    }

    setNewCapsuleName("")
    setShowCreateCapsule(false)
  }, [newCapsuleName, isLoggedIn])

  const handleRenameCapsule = useCallback(
    async (capsuleId: string, name: string) => {
      if (isLoggedIn) {
        await renameCapsule(capsuleId, name)
      } else {
        renameGuestCapsule(capsuleId, name)
      }
      setCapsules((prev) =>
        prev.map((c) => (c.id === capsuleId ? { ...c, name } : c))
      )
    },
    [isLoggedIn]
  )

  const handleDeleteCapsule = useCallback(
    async (capsuleId: string) => {
      if (isLoggedIn) {
        await deleteCapsule(capsuleId)
      } else {
        deleteGuestCapsule(capsuleId)
      }
      setCapsules((prev) => prev.filter((c) => c.id !== capsuleId))
      if (expandedCapsule === capsuleId) setExpandedCapsule(null)
    },
    [isLoggedIn, expandedCapsule]
  )

  const handleAddLookToCapsule = useCallback(
    async (capsuleId: string, lookSlug: string) => {
      if (isLoggedIn) {
        await addLookToCapsule(capsuleId, lookSlug)
      } else {
        addLookToGuestCapsule(capsuleId, lookSlug)
      }
      setCapsules((prev) =>
        prev.map((c) =>
          c.id === capsuleId && !c.looks.includes(lookSlug)
            ? { ...c, looks: [...c.looks, lookSlug] }
            : c
        )
      )
    },
    [isLoggedIn]
  )

  const handleRemoveLookFromCapsule = useCallback(
    async (capsuleId: string, lookSlug: string) => {
      if (isLoggedIn) {
        await removeLookFromCapsule(capsuleId, lookSlug)
      } else {
        removeLookFromGuestCapsule(capsuleId, lookSlug)
      }
      setCapsules((prev) =>
        prev.map((c) =>
          c.id === capsuleId
            ? { ...c, looks: c.looks.filter((s) => s !== lookSlug) }
            : c
        )
      )
    },
    [isLoggedIn]
  )

  const filtered =
    filter === "all" ? items : items.filter((i) => i.itemType === filter)

  const counts = {
    all: items.length,
    look: items.filter((i) => i.itemType === "look").length,
    product: items.filter((i) => i.itemType === "product").length,
    vibe: items.filter((i) => i.itemType === "vibe").length,
  }

  // Get look items for capsule thumbnails
  const lookItems = items.filter((i) => i.itemType === "look")

  if (loading) {
    return (
      <div className="text-center py-16 text-muted-foreground">Loading...</div>
    )
  }

  if (items.length === 0 && capsules.length === 0) {
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
      {!session?.user && items.length > 0 && (
        <EmailCapture heartCount={items.length} hearts={items} />
      )}

      {/* Capsules section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg tracking-tight">My Capsules</h2>
          {!showCreateCapsule && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateCapsule(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create a Capsule
            </Button>
          )}
        </div>

        {/* Create capsule input */}
        {showCreateCapsule && (
          <div className="flex gap-2 mb-4 max-w-sm">
            <Input
              placeholder="Capsule name..."
              value={newCapsuleName}
              onChange={(e) => setNewCapsuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCapsule()
                if (e.key === "Escape") {
                  setShowCreateCapsule(false)
                  setNewCapsuleName("")
                }
              }}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreateCapsule} disabled={!newCapsuleName.trim()}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCreateCapsule(false)
                setNewCapsuleName("")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Capsule cards */}
        {capsules.length === 0 && !showCreateCapsule ? (
          <button
            onClick={() => setShowCreateCapsule(true)}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
          >
            <FolderPlus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Create your first capsule to group looks together
            </p>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {capsules.map((capsule) => (
              <CapsuleCard
                key={capsule.id}
                capsule={capsule}
                lookItems={lookItems}
                isExpanded={expandedCapsule === capsule.id}
                onToggleExpand={() =>
                  setExpandedCapsule(
                    expandedCapsule === capsule.id ? null : capsule.id
                  )
                }
                onRename={handleRenameCapsule}
                onDelete={handleDeleteCapsule}
                onRemoveLook={handleRemoveLookFromCapsule}
                onAddLook={handleAddLookToCapsule}
              />
            ))}
          </div>
        )}

        {/* Expanded capsule detail + suggestions */}
        {expandedCapsule && (
          <ExpandedCapsuleView
            capsule={capsules.find((c) => c.id === expandedCapsule)!}
            lookItems={lookItems}
            onRemoveLook={handleRemoveLookFromCapsule}
            onAddLook={handleAddLookToCapsule}
          />
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <h2 className="font-display text-lg tracking-tight mr-4">My Looks</h2>
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
          <SavedItemCard
            key={`${item.itemType}-${item.itemId}`}
            item={item}
            capsules={capsules}
            onAddToCapsule={handleAddLookToCapsule}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Capsule Card ────────────────────────────────────────────────────────────

function CapsuleCard({
  capsule,
  lookItems,
  isExpanded,
  onToggleExpand,
  onRename,
  onDelete,
  onRemoveLook,
  onAddLook,
}: {
  capsule: CapsuleData
  lookItems: SavedItem[]
  isExpanded: boolean
  onToggleExpand: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onRemoveLook: (capsuleId: string, lookSlug: string) => void
  onAddLook: (capsuleId: string, lookSlug: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(capsule.name)

  // Get thumbnail images (up to 4) from saved looks
  const thumbLooks = capsule.looks
    .slice(0, 4)
    .map((slug) => lookItems.find((i) => i.itemId === slug))
    .filter(Boolean) as SavedItem[]

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all cursor-pointer",
        isExpanded
          ? "ring-2 ring-primary border-primary"
          : "hover:border-primary/40"
      )}
      onClick={onToggleExpand}
    >
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 aspect-square">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative bg-muted">
            {thumbLooks[i]?.imageUrl ? (
              <Image
                src={thumbLooks[i].imageUrl!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 25vw, 15vw"
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>
        ))}
      </div>

      {/* Card info */}
      <div className="p-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(capsule.id, editName.trim() || capsule.name)
                    setEditing(false)
                  }
                  if (e.key === "Escape") {
                    setEditName(capsule.name)
                    setEditing(false)
                  }
                }}
                className="h-7 text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  onRename(capsule.id, editName.trim() || capsule.name)
                  setEditing(false)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium truncate">{capsule.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {capsule.looks.length} {capsule.looks.length === 1 ? "look" : "looks"}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => {
              setEditName(capsule.name)
              setEditing(true)
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(capsule.id)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform cursor-pointer",
              isExpanded && "rotate-180"
            )}
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Expanded Capsule View with Suggestions ──────────────────────────────────

function ExpandedCapsuleView({
  capsule,
  lookItems,
  onRemoveLook,
  onAddLook,
}: {
  capsule: CapsuleData
  lookItems: SavedItem[]
  onRemoveLook: (capsuleId: string, lookSlug: string) => void
  onAddLook: (capsuleId: string, lookSlug: string) => void
}) {
  const [suggestions, setSuggestions] = useState<SuggestedLook[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions when capsule looks change
  useEffect(() => {
    if (capsule.looks.length === 0) {
      setSuggestions([])
      return
    }

    let cancelled = false
    setLoadingSuggestions(true)

    fetch("/api/capsule-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookSlugs: capsule.looks }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setSuggestions(data)
        }
      })
      .catch(() => {
        // Silently fail — suggestions are not critical
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false)
      })

    return () => {
      cancelled = true
    }
  }, [capsule.looks])

  const capsuleLookItems = capsule.looks
    .map((slug) => lookItems.find((i) => i.itemId === slug))
    .filter(Boolean) as SavedItem[]

  return (
    <div className="mt-4 rounded-xl border bg-card p-4">
      <h3 className="font-display text-base tracking-tight mb-3">
        {capsule.name}
      </h3>

      {/* Looks in this capsule */}
      {capsuleLookItems.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {capsuleLookItems.map((item) => (
            <div key={item.itemId} className="relative group">
              <Link
                href={item.href || `/look/${item.itemId}`}
                className="block rounded-lg overflow-hidden bg-muted"
              >
                {item.imageUrl ? (
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={item.imageUrl}
                      alt={item.title || "Look"}
                      fill
                      className="object-cover group-hover:brightness-90 transition-all"
                      sizes="(max-width: 640px) 33vw, 16vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <Badge variant="secondary">look</Badge>
                  </div>
                )}
              </Link>
              <button
                onClick={() => onRemoveLook(capsule.id, item.itemId)}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from capsule"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-xs text-foreground truncate mt-1">
                {item.title || "Look"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">
          No looks in this capsule yet. Add looks from your saves below, or use suggestions.
        </p>
      )}

      {/* More Like This suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-display text-sm tracking-tight">More Like This</h4>
        </div>

        {loadingSuggestions ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex-none w-32 aspect-[3/4] rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1"
          >
            {suggestions.map((look) => (
              <SuggestionCard
                key={look.slug}
                look={look}
                capsuleId={capsule.id}
                onAddToCapsule={onAddLook}
              />
            ))}
          </div>
        ) : capsule.looks.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            No similar looks found. Try adding more looks to improve suggestions.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add looks to this capsule to get personalized suggestions.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Suggestion Card ─────────────────────────────────────────────────────────

function SuggestionCard({
  look,
  capsuleId,
  onAddToCapsule,
}: {
  look: SuggestedLook
  capsuleId: string
  onAddToCapsule: (capsuleId: string, lookSlug: string) => void
}) {
  return (
    <div className="flex-none w-32 group">
      <div className="relative rounded-lg overflow-hidden bg-muted">
        <Link href={`/look/${look.slug}`} className="block">
          {look.outfitImageUrl ? (
            <div className="relative aspect-[3/4]">
              <Image
                src={look.outfitImageUrl}
                alt={look.displayTitle}
                fill
                className="object-cover group-hover:brightness-90 transition-all"
                sizes="128px"
              />
            </div>
          ) : (
            <div className="aspect-[3/4] flex items-center justify-center">
              <Badge variant="secondary">look</Badge>
            </div>
          )}
        </Link>
        {/* Action buttons */}
        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <HeartButton itemType="look" itemId={look.slug} size="sm" />
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddToCapsule(capsuleId, look.slug)
            }}
            className="p-1 rounded-full bg-background/80 text-muted-foreground hover:text-primary transition-colors"
            title="Add to capsule"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-foreground truncate mt-1">{look.displayTitle}</p>
    </div>
  )
}

// ─── Saved Item Card with "Add to Capsule" ───────────────────────────────────

function SavedItemCard({
  item,
  capsules,
  onAddToCapsule,
}: {
  item: SavedItem
  capsules: CapsuleData[]
  onAddToCapsule: (capsuleId: string, lookSlug: string) => void
}) {
  const href =
    item.href ||
    (item.itemType === "look"
      ? `/look/${item.itemId}`
      : item.itemType === "vibe"
        ? `/vibe/${item.itemId}`
        : "#")

  const isLook = item.itemType === "look"
  const isProduct = item.itemType === "product"

  return (
    <div className="relative group">
      <Link href={href} className="block rounded-lg overflow-hidden bg-muted">
        {item.imageUrl ? (
          <div className={`relative ${isProduct ? "aspect-square bg-white" : "aspect-[3/4]"}`}>
            <Image
              src={item.imageUrl}
              alt={item.title || "Saved item"}
              fill
              className={`${isProduct ? "object-contain p-2" : "object-cover"} group-hover:brightness-90 transition-all`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        ) : (
          <div className={`${isProduct ? "aspect-square" : "aspect-[3/4]"} flex items-center justify-center`}>
            <Badge variant="secondary">{item.itemType}</Badge>
          </div>
        )}
      </Link>
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <HeartButton
          itemType={item.itemType as "look" | "product" | "vibe"}
          itemId={item.itemId}
          size="sm"
        />
      </div>
      {/* "Add to Capsule" button for looks */}
      {isLook && capsules.length > 0 && (
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full bg-background/80 text-muted-foreground hover:text-primary transition-colors">
                <FolderPlus className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {capsules.map((capsule) => {
                const alreadyIn = capsule.looks.includes(item.itemId)
                return (
                  <DropdownMenuItem
                    key={capsule.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!alreadyIn) {
                        onAddToCapsule(capsule.id, item.itemId)
                      }
                    }}
                    disabled={alreadyIn}
                    className={cn(alreadyIn && "opacity-50")}
                  >
                    {alreadyIn && <Check className="h-3.5 w-3.5 mr-1.5" />}
                    {capsule.name}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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

// ─── Email Capture ───────────────────────────────────────────────────────────

function EmailCapture({
  heartCount,
  hearts,
}: {
  heartCount: number
  hearts: SavedItem[]
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
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
          Done! Your {heartCount} saved items are now synced across all your
          devices.
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
