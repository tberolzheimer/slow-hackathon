import { NextRequest, NextResponse } from "next/server"
import { scoreProduct, scoreFromAttributes } from "@/lib/ai/taste-model"

export async function POST(req: NextRequest) {
  try {
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
