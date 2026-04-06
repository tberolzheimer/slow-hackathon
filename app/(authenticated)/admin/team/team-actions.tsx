"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { removeTeamMember, deleteInvite } from "@/lib/actions/admin"

export function TeamActions({
  memberId,
  memberEmail,
  inviteId,
  inviteEmail,
}: {
  memberId?: string
  memberEmail?: string
  inviteId?: string
  inviteEmail?: string
}) {
  const [isPending, startTransition] = useTransition()

  if (memberId) {
    return (
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Remove ${memberEmail || "this member"} from the team?`)) {
            startTransition(() => removeTeamMember(memberId))
          }
        }}
      >
        {isPending ? "..." : "Remove"}
      </Button>
    )
  }

  if (inviteId) {
    return (
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Delete invite for ${inviteEmail}?`)) {
            startTransition(() => deleteInvite(inviteId))
          }
        }}
      >
        {isPending ? "..." : "Delete"}
      </Button>
    )
  }

  return null
}
