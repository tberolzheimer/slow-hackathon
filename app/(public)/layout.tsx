import Link from "next/link"
import { Search, Heart } from "lucide-react"
import { HeartPromptToast } from "@/components/heart-prompt-toast"

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
            VibéShop
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/saves"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="My Saves"
            >
              <Heart className="h-5 w-5" />
            </Link>
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

      {/* Main content */}
      <main>{children}</main>

      {/* Heart sign-up prompt toast */}
      <HeartPromptToast />

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-center">
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
