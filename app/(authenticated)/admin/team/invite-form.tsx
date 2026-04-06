"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { inviteTeamMember } from "@/lib/actions/admin"

export function InviteForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("editor")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!email.trim()) return
    setMessage("")
    startTransition(async () => {
      try {
        await inviteTeamMember(email.trim(), role)
        setMessage(`Invite sent to ${email}`)
        setEmail("")
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to send invite")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div>
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="team@example.com"
        />
      </div>
      <div>
        <Label>Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSubmit} disabled={isPending || !email.trim()}>
        {isPending ? "Sending..." : "Send Invite"}
      </Button>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )
}
