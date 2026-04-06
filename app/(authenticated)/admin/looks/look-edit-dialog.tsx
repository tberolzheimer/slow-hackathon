"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { updatePost, updatePostVibe } from "@/lib/actions/admin"

interface LookEditDialogProps {
  post: {
    id: string
    title: string
    displayTitle: string | null
    stylingNotes: string | null
    currentVibeId: string | null
  }
  vibes: { id: string; name: string }[]
}

export function LookEditDialog({ post, vibes }: LookEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [displayTitle, setDisplayTitle] = useState(post.displayTitle || "")
  const [stylingNotes, setStylingNotes] = useState(post.stylingNotes || "")
  const [vibeId, setVibeId] = useState(post.currentVibeId || "none")
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updatePost(post.id, {
        displayTitle: displayTitle.trim(),
        stylingNotes: stylingNotes.trim(),
      })
      if (vibeId !== (post.currentVibeId || "none")) {
        await updatePostVibe(post.id, vibeId === "none" ? "" : vibeId)
      }
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Look</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{post.title}</p>

          <div>
            <Label htmlFor="displayTitle">Display Title</Label>
            <Input
              id="displayTitle"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              placeholder="AI-generated desire name"
            />
          </div>

          <div>
            <Label htmlFor="stylingNotes">Styling Notes</Label>
            <Textarea
              id="stylingNotes"
              value={stylingNotes}
              onChange={(e) => setStylingNotes(e.target.value)}
              placeholder="Notes about styling this look..."
              rows={4}
            />
          </div>

          <div>
            <Label>Primary Vibe</Label>
            <Select value={vibeId} onValueChange={setVibeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vibe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vibe</SelectItem>
                {vibes.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
