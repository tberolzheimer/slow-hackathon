import { prisma } from "@/lib/db/prisma"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { VibeActions } from "./vibe-actions"
import { VibeEditDialog } from "./vibe-edit-dialog"

export default async function AdminVibesPage() {
  const vibes = await prisma.vibe.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { vibeAssignments: true } },
    },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Vibes</h1>
          <Badge variant="secondary">{vibes.length} vibes</Badge>
        </div>
        <Button asChild>
          <Link href="/admin/vibes/new">Create Vibe</Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tagline</TableHead>
              <TableHead>Looks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-16">Edit</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vibes.map((vibe) => (
              <TableRow key={vibe.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {vibe.accentColor && (
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: vibe.accentColor }}
                      />
                    )}
                    {vibe.name}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {vibe.tagline || "—"}
                </TableCell>
                <TableCell>{vibe._count.vibeAssignments}</TableCell>
                <TableCell>
                  <Badge variant={vibe.approvedAt ? "default" : "secondary"}>
                    {vibe.approvedAt ? "Approved" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{vibe.type}</Badge>
                </TableCell>
                <TableCell>
                  <VibeEditDialog
                    vibe={{
                      id: vibe.id,
                      name: vibe.name,
                      tagline: vibe.tagline,
                      introText: vibe.introText,
                      accentColor: vibe.accentColor,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <VibeActions vibeId={vibe.id} isApproved={!!vibe.approvedAt} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
