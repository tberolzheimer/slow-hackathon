"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Product {
  id: string
  brand: string | null
  itemName: string | null
  affiliateUrl: string
  price: number | null
}

export function StickyShopBar({
  productCount,
  products,
}: {
  productCount: number
  products: Product[]
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Sticky bottom bar — mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3 safe-area-pb">
        <Button
          className="w-full h-12 text-base"
          onClick={() => setDrawerOpen(true)}
        >
          Shop This Look — {productCount} pieces
        </Button>
      </div>

      {/* Product drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="sticky top-0 bg-background px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-foreground">
                Shop This Look
              </h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 pb-8">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={product.affiliateUrl}
                  target="_blank"
                  rel="noopener sponsored"
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div>
                    {product.brand && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {product.brand}
                      </p>
                    )}
                    <p className="text-sm text-foreground">
                      {product.itemName || "View Product"}
                    </p>
                    {product.price && (
                      <p className="text-sm font-medium mt-0.5">
                        ${product.price.toFixed(0)}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    Shop
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from hiding behind sticky bar on mobile */}
      <div className="lg:hidden h-20" />
    </>
  )
}
