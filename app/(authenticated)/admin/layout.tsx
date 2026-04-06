import { auth } from "@/auth"
import Link from "next/link"
import { LayoutDashboard, Palette, Image, ShoppingBag, Users } from "lucide-react"
import { AdminSignIn } from "./admin-sign-in"

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

  // Not logged in — show Google sign-in
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center max-w-md px-4">
          <h1 className="font-display text-3xl mb-2">VibeShop Admin</h1>
          <p className="text-muted-foreground mb-8">
            Sign in with Google to access the admin dashboard.
          </p>
          <AdminSignIn />
        </div>
      </div>
    )
  }

  // Logged in but not admin/editor — show 403 with option to try different account
  const role = (session.user as any).role
  if (role !== "admin" && role !== "editor") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold mb-4">403</h1>
          <p className="text-muted-foreground mb-2">
            <span className="font-medium text-foreground">{session.user.email}</span> doesn&apos;t have admin access.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Ask an admin to invite you, or sign in with a different account.
          </p>
          <AdminSignIn label="Try a Different Account" />
          <div className="mt-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to VibeShop
            </Link>
          </div>
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
