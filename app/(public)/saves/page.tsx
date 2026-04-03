import type { Metadata } from "next"
import { SavesContent } from "./saves-content"

export const metadata: Metadata = {
  title: "My Saves — VibéShop",
  description: "Your saved looks, products, and vibes.",
}

export default function SavesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16">
      <h1 className="font-display text-3xl text-foreground text-center mb-8">
        My Saves
      </h1>
      <SavesContent />
    </div>
  )
}
