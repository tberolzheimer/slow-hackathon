import { prisma } from "@/lib/db/prisma"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LookEditDialog } from "./look-edit-dialog"

export default async function AdminLooksPage() {
  const posts = await prisma.post.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      title: true,
      displayTitle: true,
      date: true,
      slug: true,
      outfitImageUrl: true,
      _count: { select: { products: true } },
      vibeAssignments: {
        include: { vibe: { select: { id: true, name: true } } },
      },
      visionData: {
        select: { stylingNotes: true },
      },
    },
  })

  const vibes = await prisma.vibe.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Looks</h1>
        <Badge variant="secondary">{posts.length} looks</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vibe</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="w-16">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const primaryVibe = post.vibeAssignments[0]?.vibe
              return (
                <TableRow key={post.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {post.displayTitle || post.title}
                      </p>
                      {post.displayTitle && post.displayTitle !== post.title && (
                        <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                          {post.title}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.date.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {post.vibeAssignments.map((va) => (
                      <Badge key={va.vibe.id} variant="outline" className="mr-1">
                        {va.vibe.name}
                      </Badge>
                    ))}
                    {post.vibeAssignments.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{post._count.products}</TableCell>
                  <TableCell>
                    <LookEditDialog
                      post={{
                        id: post.id,
                        title: post.title,
                        displayTitle: post.displayTitle,
                        stylingNotes: post.visionData?.stylingNotes || null,
                        currentVibeId: primaryVibe?.id || null,
                      }}
                      vibes={vibes}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
