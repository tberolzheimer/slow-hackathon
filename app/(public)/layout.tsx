import Link from "next/link"
import { Suspense } from "react"
import { Search } from "lucide-react"
import { HeartPromptToast } from "@/components/heart-prompt-toast"
import { HeartNavBadge } from "@/components/heart-nav-badge"
import { ReturnVisitBanner } from "@/components/return-visit-banner"
import { PostHogProvider } from "@/components/posthog-provider"

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
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground flex items-center gap-1.5">
            VibeShop
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-primary/70 border border-primary/30 rounded px-1 py-0.5 leading-none">
              Beta
            </span>
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
      <Suspense fallback={null}>
        <ReturnVisitBanner />
      </Suspense>

      {/* Main content */}
      <main>{children}</main>

      {/* Analytics */}
      <Suspense fallback={null}>
        <PostHogProvider />
      </Suspense>

      {/* Heart sign-up prompt toast */}
      <Suspense fallback={null}>
        <HeartPromptToast />
      </Suspense>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
          {/* Mobile: 2-column grid */}
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm text-muted-foreground mb-4 sm:hidden">
            <Link href="/search" className="hover:text-foreground transition-colors">Search</Link>
            <Link href="/saves" className="hover:text-foreground transition-colors">My Saves</Link>
            <Link href="/season/spring" className="hover:text-foreground transition-colors">Spring</Link>
            <Link href="/season/summer" className="hover:text-foreground transition-colors">Summer</Link>
            <Link href="/season/fall" className="hover:text-foreground transition-colors">Fall</Link>
            <Link href="/season/winter" className="hover:text-foreground transition-colors">Winter</Link>
            <Link href="/style/spring-outfit-ideas" className="hover:text-foreground transition-colors">Style Guides</Link>
            <Link href="/capsule" className="hover:text-foreground transition-colors">Travel Capsule</Link>
            <Link href="/most-worn" className="hover:text-foreground transition-colors">Most Worn</Link>
          </div>
          {/* Desktop: inline with dots */}
          <div className="hidden sm:flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
            <Link href="/search" className="hover:text-foreground transition-colors">Search</Link>
            <span className="text-border">·</span>
            <Link href="/season/spring" className="hover:text-foreground transition-colors">Spring</Link>
            <Link href="/season/summer" className="hover:text-foreground transition-colors">Summer</Link>
            <Link href="/season/fall" className="hover:text-foreground transition-colors">Fall</Link>
            <Link href="/season/winter" className="hover:text-foreground transition-colors">Winter</Link>
            <span className="text-border">·</span>
            <Link href="/style/spring-outfit-ideas" className="hover:text-foreground transition-colors">Style Guides</Link>
            <span className="text-border">·</span>
            <Link href="/capsule" className="hover:text-foreground transition-colors">Travel Capsule</Link>
            <span className="text-border">·</span>
            <Link href="/most-worn" className="hover:text-foreground transition-colors">Most Worn</Link>
            <span className="text-border">·</span>
            <Link href="/saves" className="hover:text-foreground transition-colors">My Saves</Link>
            <span className="text-border">·</span>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
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
