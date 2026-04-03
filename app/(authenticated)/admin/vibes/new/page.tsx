import { prisma } from "@/lib/db/prisma"
import Image from "next/image"
import { CreateVibeForm } from "./create-vibe-form"

export default async function NewVibePage() {
  // Load all posts for the picker
  const posts = await prisma.post.findMany({
    select: { id: true, title: true, slug: true, outfitImageUrl: true, date: true },
    orderBy: { date: "desc" },
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Editorial Vibe</h1>
      <CreateVibeForm posts={posts} />
    </div>
  )
}
