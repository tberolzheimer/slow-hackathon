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
import { Pencil } from "lucide-react"
import { updateVibe } from "@/lib/actions/admin"

interface VibeEditDialogProps {
  vibe: {
    id: string
    name: string
    tagline: string | null
    introText: string | null
    accentColor: string | null
  }
}

export function VibeEditDialog({ vibe }: VibeEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(vibe.name)
  const [tagline, setTagline] = useState(vibe.tagline || "")
  const [introText, setIntroText] = useState(vibe.introText || "")
  const [accentColor, setAccentColor] = useState(vibe.accentColor || "")
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      await updateVibe(vibe.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        introText: introText.trim(),
        accentColor: accentColor.trim(),
      })
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
          <DialogTitle>Edit Vibe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="vibe-name">Name</Label>
            <Input
              id="vibe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="vibe-tagline">Tagline</Label>
            <Input
              id="vibe-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short description"
            />
          </div>

          <div>
            <Label htmlFor="vibe-intro">Intro Text</Label>
            <Textarea
              id="vibe-intro"
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="This is for the woman who..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="vibe-color">Accent Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="vibe-color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#f5e6d3"
                className="flex-1"
              />
              {accentColor && (
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
