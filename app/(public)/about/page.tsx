import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About VibeShop — By Julia Berolzheimer",
  description:
    "VibeShop organizes Julia Berolzheimer's 835 Daily Looks by aesthetic feeling. Browse by vibe, not by date. Every piece identified, every product linked.",
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-6 text-center">
        About
      </p>
      <h1 className="font-display text-3xl sm:text-4xl text-foreground text-center mb-10">
        The story behind VibeShop
      </h1>

      <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
        <p>
          Julia Berolzheimer has styled over 835 outfits across 13 years of{" "}
          <a
            href="https://juliaberolzheimer.com/category/daily-look/"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Daily Looks
          </a>
          . Every one of them was organized by date. The problem is, nobody
          shops by date. You shop by feeling — by the version of yourself you
          want to be when you walk out the door.
        </p>

        <p>
          VibeShop reorganizes the entire archive by aesthetic feeling. Nineteen
          vibes, from{" "}
          <Link href="/vibe/morning-porch" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Morning Porch
          </Link>{" "}
          to{" "}
          <Link href="/vibe/november-power" className="underline underline-offset-4 hover:text-foreground transition-colors">
            November Power
          </Link>
          , each one a world you can step into. Every garment identified by
          color, fabric, and silhouette. Every product linked so you can shop
          exactly what Julia reached for.
        </p>

        <p>
          The way it works: each outfit photo is analyzed for mood, palette,
          season, and styling approach, then grouped into vibes that capture a
          feeling, not just a category. When you browse{" "}
          <Link href="/vibe/coastal-dreams" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Coastal Dreams
          </Link>
          , you&apos;re not just seeing &ldquo;summer outfits&rdquo; — you&apos;re
          stepping into salt air and bare feet and that specific version of
          yourself that only exists near the water.
        </p>

        <p>
          We built this because the Daily Looks archive is one of the deepest
          styling libraries on the internet — 835 real outfits, photographed as
          worn, with 4,800+ products identified across every look. It deserved
          a way to browse that matched how people actually think about getting
          dressed: not &ldquo;what did she wear on March 15th,&rdquo; but
          &ldquo;what do I reach for when I want to feel like that.&rdquo;
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 my-12 text-center">
        <div>
          <p className="font-display text-2xl text-foreground">835</p>
          <p className="text-xs text-muted-foreground">styled looks</p>
        </div>
        <div>
          <p className="font-display text-2xl text-foreground">19</p>
          <p className="text-xs text-muted-foreground">vibes</p>
        </div>
        <div>
          <p className="font-display text-2xl text-foreground">4,800+</p>
          <p className="text-xs text-muted-foreground">shoppable pieces</p>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
        <p>
          A few things you can do here:
        </p>
        <ul className="space-y-3 text-sm">
          <li>
            <Link href="/match" className="text-primary hover:underline">Take the Style Match</Link>
            {" "}— swipe through 20 looks to discover which of Julia&apos;s aesthetics are yours
          </li>
          <li>
            <Link href="/capsule" className="text-primary hover:underline">Plan a Travel Capsule</Link>
            {" "}— tell us your trip, we&apos;ll pull the perfect wardrobe from the archive
          </li>
          <li>
            <Link href="/most-worn" className="text-primary hover:underline">See Julia&apos;s Most Worn Pieces</Link>
            {" "}— the bags, shoes, and jewelry she keeps reaching for
          </li>
          <li>
            <Link href="/search" className="text-primary hover:underline">Search by anything</Link>
            {" "}— a brand, a garment type, an occasion, a feeling
          </li>
        </ul>
      </div>

      {/* Julia attribution */}
      <div className="mt-12 pt-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground mb-4">
          VibeShop is built on{" "}
          <a
            href="https://juliaberolzheimer.com"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Julia Berolzheimer&apos;s
          </a>{" "}
          Daily Looks archive — 13 years of polished maximalism, expression
          with clarity, and reaching for the piece that feels right.
        </p>
        <a
          href="https://juliaberolzheimer.com"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Visit juliaberolzheimer.com →
        </a>
      </div>
    </div>
  )
}
