"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { HeartButton } from "@/components/heart-button"

export interface ProductGridItem {
  id: string
  affiliateUrl: string
  productImageUrl: string | null
  rawText: string
  brand: string | null
  itemName: string | null
}

type SortOption = "newest" | "brand-az" | "brand-za"

const PAGE_SIZE = 24

interface ProductGridProps {
  /** Full array of products (server-rendered). Client handles pagination + sort. */
  products: ProductGridItem[]
  /** Section title, e.g. "Shop Summer" */
  title?: string
  /** If true, products render at reduced opacity (used for past-season items) */
  muted?: boolean
  /** Hide the sort dropdown (useful for small lists) */
  hideSort?: boolean
}

export function ProductGrid({
  products,
  title,
  muted = false,
  hideSort = false,
}: ProductGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sorted = useMemo(() => {
    if (sortBy === "newest") return products // already in server order (newest first)
    const copy = [...products]
    if (sortBy === "brand-az") {
      copy.sort((a, b) => (a.brand ?? "").localeCompare(b.brand ?? ""))
    } else if (sortBy === "brand-za") {
      copy.sort((a, b) => (b.brand ?? "").localeCompare(a.brand ?? ""))
    }
    return copy
  }, [products, sortBy])

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  return (
    <div>
      {/* Header row: title + sort */}
      {(title || !hideSort) && (
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {title && (
              <h2 className="font-display text-2xl text-foreground">
                {title}
              </h2>
            )}
          </div>
          {!hideSort && products.length > 1 && (
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption)
                setVisibleCount(PAGE_SIZE)
              }}
              className="text-xs text-muted-foreground bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              aria-label="Sort products"
            >
              <option value="newest">Newest</option>
              <option value="brand-az">Brand A&rarr;Z</option>
              <option value="brand-za">Brand Z&rarr;A</option>
            </select>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground mb-4">
        Showing {visible.length} of {products.length} pieces
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
        {visible.map((product) => (
          <div
            key={product.id}
            className={muted ? "opacity-70 hover:opacity-100 transition-opacity" : ""}
          >
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener sponsored"
              className="group block"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-white mb-3">
                <Image
                  src={product.productImageUrl!}
                  alt={product.rawText || "Product"}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute top-2 right-2 z-10">
                  <HeartButton itemType="product" itemId={product.id} size="sm" />
                </div>
              </div>
              {product.brand && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {product.brand}
                </p>
              )}
              {product.itemName && (
                <p className="text-sm text-foreground truncate">{product.itemName}</p>
              )}
              <p className="text-xs text-primary mt-1 group-hover:underline">
                Shop This &rarr;
              </p>
            </a>
          </div>
        ))}
      </div>

      {/* Show More */}
      {hasMore && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Show More ({Math.min(PAGE_SIZE, sorted.length - visibleCount)} more)
          </Button>
        </div>
      )}
    </div>
  )
}
