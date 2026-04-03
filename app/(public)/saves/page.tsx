import type { Metadata } from "next"
import Link from "next/link"
import { SavesContent } from "./saves-content"

export const metadata: Metadata = {
  title: "My Saves — VibeShop",
  description: "Your saved looks, products, and vibes.",
}

export default function SavesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Continue Browsing
      </Link>
      <h1 className="font-display text-3xl text-foreground text-center mb-8 mt-6">
        My Saves
      </h1>
      <SavesContent />
    </div>
  )
}
