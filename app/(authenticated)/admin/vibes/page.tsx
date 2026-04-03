import { prisma } from "@/lib/db/prisma"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VibeActions } from "./vibe-actions"

export default async function AdminVibesPage() {
  const vibes = await prisma.vibe.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      vibeAssignments: {
        take: 4,
        orderBy: { confidenceScore: "desc" },
        include: {
          post: { select: { outfitImageUrl: true, title: true } },
        },
      },
      _count: { select: { vibeAssignments: true } },
    },
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Manage Vibes</h1>
          <Badge variant="secondary">{vibes.length} vibes</Badge>
        </div>
        <Button asChild>
          <Link href="/admin/vibes/new">Create Vibe</Link>
        </Button>
      </div>

      <div className="space-y-6">
        {vibes.map((vibe) => {
          const images = vibe.vibeAssignments
            .map((a) => a.post.outfitImageUrl)
            .filter(Boolean) as string[]

          return (
            <Card key={vibe.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{vibe.name}</CardTitle>
                    {vibe.tagline && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {vibe.tagline}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant={vibe.approvedAt ? "default" : "secondary"}>
                        {vibe.approvedAt ? "Approved" : "Draft"}
                      </Badge>
                      <Badge variant="outline">
                        {vibe.type}
                      </Badge>
                      <Badge variant="secondary">
                        {vibe._count.vibeAssignments} looks
                      </Badge>
                    </div>
                  </div>
                  <VibeActions vibeId={vibe.id} isApproved={!!vibe.approvedAt} />
                </div>
              </CardHeader>
              <CardContent>
                {vibe.introText && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {vibe.introText}
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((src, i) => (
                    <div
                      key={i}
                      className="relative w-20 h-28 flex-shrink-0 rounded overflow-hidden"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
