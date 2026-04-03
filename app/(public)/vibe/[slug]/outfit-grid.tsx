"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Post {
  id: string
  slug: string
  title: string
  displayTitle: string | null
  outfitImageUrl: string | null
}

const INITIAL_COUNT = 12

export function OutfitGrid({
  posts,
  productCount,
}: {
  posts: Post[]
  productCount: number
}) {
  const [showAll, setShowAll] = useState(false)
  const visiblePosts = showAll ? posts : posts.slice(0, INITIAL_COUNT)
  const hasMore = posts.length > INITIAL_COUNT

  return (
    <div>
      <div className="columns-2 sm:columns-3 gap-4">
        {visiblePosts.map((post, i) =>
          post.outfitImageUrl ? (
            <div key={post.id}>
              <Link
                href={`/look/${post.slug}`}
                className="group block mb-4 break-inside-avoid relative rounded-lg overflow-hidden"
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
