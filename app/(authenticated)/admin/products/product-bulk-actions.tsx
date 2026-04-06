"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { bulkUpdateProductStatus, bulkDeleteProducts } from "@/lib/actions/admin"

export function ProductBulkActions() {
  const [isPending, startTransition] = useTransition()

  function getSelectedIds(): string[] {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(".product-checkbox:checked")
    return Array.from(checkboxes).map((cb) => cb.dataset.id).filter(Boolean) as string[]
  }

  function handleBulkSoldOut() {
    const ids = getSelectedIds()
    if (ids.length === 0) return alert("Select products first")
    if (!confirm(`Mark ${ids.length} product(s) as sold out?`)) return
    startTransition(async () => {
      await bulkUpdateProductStatus(ids, "sold_out")
    })
  }

  function handleBulkDelete() {
    const ids = getSelectedIds()
    if (ids.length === 0) return alert("Select products first")
    if (!confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return
    startTransition(async () => {
      await bulkDeleteProducts(ids)
    })
  }

  function handleSelectAll() {
    const selectAll = document.querySelector<HTMLInputElement>(".product-select-all")
    const checkboxes = document.querySelectorAll<HTMLInputElement>(".product-checkbox")
    checkboxes.forEach((cb) => {
      cb.checked = selectAll?.checked ?? false
    })
  }

  // Attach select-all listener
  if (typeof window !== "undefined") {
    setTimeout(() => {
      const selectAll = document.querySelector<HTMLInputElement>(".product-select-all")
      if (selectAll) {
        selectAll.addEventListener("change", handleSelectAll)
      }
    }, 0)
  }

  return (
    <div className="flex gap-2 mt-4">
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={handleBulkSoldOut}
      >
        {isPending ? "..." : "Mark Sold Out"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleBulkDelete}
      >
        {isPending ? "..." : "Delete Selected"}
      </Button>
    </div>
  )
}
