import type { Metadata } from "next"
import { CapsulePlanner } from "./capsule-planner"

export const metadata: Metadata = {
  title: "Travel Capsule Planner — Pack Like Julia | VibeShop",
  description:
    "Tell us about your trip and we'll build a curated capsule wardrobe from Julia Berolzheimer's 835-look archive. Every piece shoppable.",
}

export default function CapsulePage() {
  return <CapsulePlanner />
}
