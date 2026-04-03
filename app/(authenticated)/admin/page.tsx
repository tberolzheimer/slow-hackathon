import { prisma } from "@/lib/db/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function AdminPage() {
  const [postCount, productCount, vibeCount, approvedVibes, visionCount, lastLog] =
    await Promise.all([
      prisma.post.count(),
      prisma.product.count(),
      prisma.vibe.count(),
      prisma.vibe.count({ where: { approvedAt: { not: null } } }),
      prisma.visionData.count(),
      prisma.ingestLog.findFirst({ orderBy: { startedAt: "desc" } }),
    ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">VibéShop Admin</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{postCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{productCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vision Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{visionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vibes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {approvedVibes}/{vibeCount}
            </p>
            <p className="text-xs text-muted-foreground">approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last Ingest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {lastLog
                ? `${lastLog.status} — ${lastLog.postsNew} new`
                : "Never run"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/admin/vibes">Manage Vibes</Link>
        </Button>
      </div>
    </div>
  )
}
