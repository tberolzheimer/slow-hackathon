import Link from "next/link"
import { Search } from "lucide-react"
import { HeartPromptToast } from "@/components/heart-prompt-toast"
import { HeartNavBadge } from "@/components/heart-nav-badge"
import { ReturnVisitBanner } from "@/components/return-visit-banner"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground">
            VibeShop
          </Link>
          <div className="flex items-center gap-1">
            <HeartNavBadge />
            <Link
              href="/search"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Return visit banner */}
      <ReturnVisitBanner />

      {/* Main content */}
      <main>{children}</main>

      {/* Heart sign-up prompt toast */}
      <HeartPromptToast />

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
            <Link href="/search" className="hover:text-foreground transition-colors">Search</Link>
            <span className="text-border">·</span>
            <Link href="/season/spring" className="hover:text-foreground transition-colors">Spring</Link>
            <Link href="/season/summer" className="hover:text-foreground transition-colors">Summer</Link>
            <Link href="/season/fall" className="hover:text-foreground transition-colors">Fall</Link>
            <Link href="/season/winter" className="hover:text-foreground transition-colors">Winter</Link>
            <span className="text-border">·</span>
            <Link href="/style/spring-outfit-ideas" className="hover:text-foreground transition-colors">Style Guides</Link>
            <span className="text-border">·</span>
            <Link href="/saves" className="hover:text-foreground transition-colors">My Saves</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Curated by{" "}
            <a
              href="https://juliaberolzheimer.com"
              target="_blank"
              rel="noopener"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Julia Berolzheimer
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
