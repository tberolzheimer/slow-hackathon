"use client"

import { Button } from "@/components/ui/button"
import { approveVibe, unapproveVibe, deleteVibe } from "@/lib/actions/admin"
import { useTransition } from "react"

export function VibeActions({
  vibeId,
  isApproved,
}: {
  vibeId: string
  isApproved: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex gap-2">
      {isApproved ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => unapproveVibe(vibeId))}
        >
          Unapprove
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => approveVibe(vibeId))}
        >
          Approve
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("Delete this vibe?")) {
            startTransition(() => deleteVibe(vibeId))
          }
        }}
      >
        Delete
      </Button>
    </div>
  )
}
