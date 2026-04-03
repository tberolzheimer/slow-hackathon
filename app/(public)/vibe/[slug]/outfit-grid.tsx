"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeartButton } from "@/components/heart-button"

interface Post {
  id: string
  slug: string
  title: string
  displayTitle: string | null
  outfitImageUrl: string | null
  date: string
}

type SortMode = "newest" | "best"
const INITIAL_COUNT = 12

export function OutfitGrid({
  posts,
  productCount,
}: {
  posts: Post[]
  productCount: number
}) {
  const [showAll, setShowAll] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("newest")

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortMode === "newest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return 0 // "best" keeps original order (confidence score from server)
  })

  const visiblePosts = showAll ? sortedPosts : sortedPosts.slice(0, INITIAL_COUNT)
  const hasMore = sortedPosts.length > INITIAL_COUNT

  return (
    <div>
      {/* Sort toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSortMode("newest")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            sortMode === "newest"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Newest
        </button>
        <button
          onClick={() => setSortMode("best")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            sortMode === "best"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Best Match
        </button>
      </div>

      <div className="columns-2 sm:columns-3 gap-4">
        {visiblePosts.map((post, i) =>
          post.outfitImageUrl ? (
            <div key={post.id}>
              <div className="relative mb-4 break-inside-avoid rounded-lg overflow-hidden">
                <Link
                  href={`/look/${post.slug}`}
                  className="group block"
                >
                  <Image
                    src={post.outfitImageUrl}
                    alt={post.displayTitle || post.title}
                    width={400}
                    height={500}
                    className="w-full h-auto object-cover group-hover:brightness-90 transition-all duration-300"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-end">
                    <p className="p-3 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {post.displayTitle || post.title}
                    </p>
                  </div>
                </Link>
                <div className="absolute top-2 right-2 z-10">
                  <HeartButton itemType="look" itemId={post.slug} size="sm" />
                </div>
              </div>

              {/* Jump to products teaser after 6th item */}
              {i === 5 && !showAll && productCount > 0 && (
                <div className="mb-4 p-4 rounded-lg bg-muted/50 text-center">
                  <button
                    onClick={() => {
                      const el = document.getElementById("shop-the-vibe")
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 140
                        window.scrollTo({ top: y, behavior: "smooth" })
                      }
                    }}
                    className="text-sm text-primary hover:underline underline-offset-4"
                  >
                    This vibe has {productCount} shoppable pieces → Shop now
                  </button>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>

      {hasMore && !showAll && (
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
          >
            Show all {posts.length} looks
          </Button>
        </div>
      )}
    </div>
  )
}
