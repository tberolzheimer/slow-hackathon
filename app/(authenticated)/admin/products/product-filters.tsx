"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ProductFiltersProps {
  brands: { name: string; count: number }[]
  currentBrand: string
  currentStockStatus: string
}

export function ProductFilters({ brands, currentBrand, currentStockStatus }: ProductFiltersProps) {
  const router = useRouter()
  const [brandInput, setBrandInput] = useState(currentBrand)

  function applyFilters(overrides: { brand?: string; stockStatus?: string }) {
    const brand = overrides.brand ?? brandInput
    const stock = overrides.stockStatus ?? currentStockStatus
    const params = new URLSearchParams()
    if (brand) params.set("brand", brand)
    if (stock) params.set("stockStatus", stock)
    router.push(`/admin/products?${params.toString()}`)
  }

  function clearFilters() {
    setBrandInput("")
    router.push("/admin/products")
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px] max-w-[300px]">
        <label className="text-xs text-muted-foreground mb-1 block">Brand</label>
        <div className="flex gap-1">
          <Input
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            placeholder="Filter by brand..."
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ brand: brandInput })
            }}
          />
          <Button size="sm" variant="secondary" onClick={() => applyFilters({ brand: brandInput })}>
            Go
          </Button>
        </div>
      </div>

      <div className="min-w-[160px]">
        <label className="text-xs text-muted-foreground mb-1 block">Stock Status</label>
        <Select
          value={currentStockStatus || "all"}
          onValueChange={(val) => applyFilters({ stockStatus: val === "all" ? "" : val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold_out">Sold Out</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(currentBrand || currentStockStatus) && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
