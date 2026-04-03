import { NextRequest, NextResponse } from "next/server"
import { parsePostHtml } from "@/lib/ingest/parse-post-html"
import { prisma } from "@/lib/db/prisma"

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-wp-webhook-secret")
  if (secret !== process.env.WP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { post_url, post_type, action } = body

    // Only process daily_look publishes
    if (post_type !== "daily_look" || action !== "publish") {
      return NextResponse.json({ skipped: true })
    }

    if (!post_url) {
      return NextResponse.json({ error: "Missing post_url" }, { status: 400 })
    }

    // Fetch and parse the post
    const response = await fetch(post_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch post: ${response.status}` },
        { status: 502 }
      )
    }

    const html = await response.text()
    const parsed = parsePostHtml(html, post_url)

    // Upsert into database
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.upsert({
        where: { url: parsed.url },
        create: {
          title: parsed.title,
          slug: parsed.slug,
          url: parsed.url,
          date: parsed.date,
          outfitImageUrl: parsed.outfitImageUrl,
          rawHtml: parsed.rawHtml,
          wpPostId: parsed.wpPostId,
          ingestStatus: "scraped",
        },
        update: {
          title: parsed.title,
          outfitImageUrl: parsed.outfitImageUrl,
          rawHtml: parsed.rawHtml,
          wpPostId: parsed.wpPostId,
          ingestStatus: "scraped",
          ingestError: null,
        },
      })

      await tx.product.deleteMany({ where: { postId: post.id } })

      for (const p of parsed.products.filter((p) => !p.isAlternative)) {
        await tx.product.create({
          data: {
            postId: post.id,
            rawText: p.rawText,
            brand: p.brand,
            itemName: p.itemName,
            affiliateUrl: p.affiliateUrl,
            productImageUrl: p.productImageUrl,
            sortOrder: p.sortOrder,
            isAlternative: false,
          },
        })
      }
    })

    // Log the ingest
    await prisma.ingestLog.create({
      data: {
        runType: "webhook",
        status: "completed",
        postsFound: 1,
        postsNew: 1,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, slug: parsed.slug })
  } catch (err) {
    console.error("Webhook error:", err)
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    )
  }
}
