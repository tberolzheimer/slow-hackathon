"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil } from "lucide-react"
import { updateProduct, deleteProduct } from "@/lib/actions/admin"

interface ProductEditDialogProps {
  product: {
    id: string
    brand: string | null
    itemName: string | null
    garmentType: string | null
    stockStatus: string
  }
}

export function ProductEditDialog({ product }: ProductEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState(product.brand || "")
  const [itemName, setItemName] = useState(product.itemName || "")
  const [garmentType, setGarmentType] = useState(product.garmentType || "")
  const [stockStatus, setStockStatus] = useState(product.stockStatus)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateProduct(product.id, {
        brand: brand.trim(),
        itemName: itemName.trim(),
        garmentType: garmentType.trim(),
        stockStatus,
      })
      setOpen(false)
    })
  }

  function handleDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return
    startTransition(async () => {
      await deleteProduct(product.id)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand name"
            />
          </div>

          <div>
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          <div>
            <Label htmlFor="garmentType">Garment Type</Label>
            <Input
              id="garmentType"
              value={garmentType}
              onChange={(e) => setGarmentType(e.target.value)}
              placeholder="e.g., dress, top, pants"
            />
          </div>

          <div>
            <Label>Stock Status</Label>
            <Select value={stockStatus} onValueChange={setStockStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold_out">Sold Out</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
