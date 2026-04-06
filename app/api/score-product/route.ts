import { NextRequest, NextResponse } from "next/server"
import { scoreProduct, scoreFromAttributes } from "@/lib/ai/taste-model"

// Simple in-memory rate limiter: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip)
  }
}, 5 * 60_000)

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      )
    }

    const body = await req.json()

    // Option 1: Score from image URL (costs ~$0.013 — calls Vision AI)
    if (body.imageUrl) {
      const score = await scoreProduct(body.imageUrl)
      return NextResponse.json(score)
    }

    // Option 2: Score from pre-computed attributes (free — no API call)
    if (body.attributes) {
      const score = await scoreFromAttributes(body.attributes)
      return NextResponse.json(score)
    }

    return NextResponse.json(
      { error: "Provide either imageUrl or attributes" },
      { status: 400 }
    )
  } catch (err) {
    console.error("Score product error:", err)
    return NextResponse.json(
      { error: "Failed to score product" },
      { status: 500 }
    )
  }
}
