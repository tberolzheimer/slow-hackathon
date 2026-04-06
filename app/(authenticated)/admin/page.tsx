import { prisma } from "@/lib/db/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function AdminDashboardPage() {
  const [postCount, productCount, vibeCount, approvedVibes, heartCount, userCount, visionCount, lastLog, recentUsers] =
    await Promise.all([
      prisma.post.count(),
      prisma.product.count(),
      prisma.vibe.count(),
      prisma.vibe.count({ where: { approvedAt: { not: null } } }),
      prisma.heart.count(),
      prisma.user.count(),
      prisma.visionData.count(),
      prisma.ingestLog.findFirst({ orderBy: { startedAt: "desc" } }),
      prisma.user.findMany({
        orderBy: { id: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, role: true },
      }),
    ])

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Posts" value={postCount} />
        <StatCard title="Products" value={productCount} />
        <StatCard title="Vibes" value={`${approvedVibes}/${vibeCount}`} sub="approved" />
        <StatCard title="Hearts" value={heartCount} />
        <StatCard title="Users" value={userCount} />
        <StatCard title="Vision Analyzed" value={visionCount} />
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

      <h2 className="text-lg font-semibold mb-3">Recent Signups</h2>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : user.role === "editor" ? "secondary" : "outline"}>
                    {user.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}
