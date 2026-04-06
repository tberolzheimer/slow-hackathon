import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Palette, Image, ShoppingBag, Users } from "lucide-react"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vibes", label: "Vibes", icon: Palette },
  { href: "/admin/looks", label: "Looks", icon: Image },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/team", label: "Team", icon: Users },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/sign-in?callbackUrl=/admin")
  }

  const role = session.user.role
  if (role !== "admin" && role !== "editor") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold mb-4">403</h1>
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access the admin area.
          </p>
          <Link href="/" className="text-primary underline underline-offset-4">
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col gap-1 shrink-0">
        <Link href="/admin" className="font-semibold text-lg mb-4 px-3">
          Admin
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        <div className="mt-auto pt-4 border-t">
          <p className="text-xs text-muted-foreground px-3">
            {session.user.email}
          </p>
          <p className="text-xs text-muted-foreground px-3 capitalize">
            {role}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
