"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createVibe, assignPostsToVibe } from "@/lib/actions/admin"

interface Post {
  id: string
  title: string
  slug: string
  outfitImageUrl: string | null
  date: Date
}

export function CreateVibeForm({ posts }: { posts: Post[] }) {
  const [name, setName] = useState("")
  const [tagline, setTagline] = useState("")
  const [introText, setIntroText] = useState("")
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filteredPosts = filter
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(filter.toLowerCase()) ||
          p.slug.toLowerCase().includes(filter.toLowerCase())
      )
    : posts

  function togglePost(postId: string) {
    setSelectedPostIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  function handleSubmit() {
    if (!name.trim()) return
    startTransition(async () => {
      const vibeId = await createVibe({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        introText: introText.trim() || undefined,
        type: "editorial",
      })
      if (selectedPostIds.size > 0) {
        await assignPostsToVibe(vibeId, Array.from(selectedPostIds))
      }
      router.push("/admin/vibes")
    })
  }

  return (
    <div className="space-y-8">
      {/* Vibe Details */}
      <Card>
        <CardHeader>
          <CardTitle>Vibe Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Greece Summer 2025"
            />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g., Salt air and sun-warmed linen"
            />
          </div>
          <div>
            <Label htmlFor="intro">
              Intro Text{" "}
              <span className="text-muted-foreground font-normal">
                — describe the woman, not the clothes
              </span>
            </Label>
            <textarea
              id="intro"
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="This is for the woman who..."
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Post Picker */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Select Looks{" "}
              <Badge variant="secondary" className="ml-2">
                {selectedPostIds.size} selected
              </Badge>
            </CardTitle>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by title..."
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[500px] overflow-y-auto">
            {filteredPosts.map((post) => {
              const isSelected = selectedPostIds.has(post.id)
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => togglePost(post.id)}
                  className={`relative aspect-[3/4] rounded overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  {post.outfitImageUrl ? (
                    <Image
                      src={post.outfitImageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
          {isPending ? "Creating..." : "Create Vibe"}
        </Button>
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
