import { NextRequest, NextResponse } from "next/server"
import { getSimilarLooks } from "@/lib/ai/capsule-suggestions"

export async function POST(req: NextRequest) {
  try {
    const { lookSlugs } = await req.json()

    if (!Array.isArray(lookSlugs) || lookSlugs.length === 0) {
      return NextResponse.json(
        { error: "lookSlugs must be a non-empty array" },
        { status: 400 }
      )
    }

    const suggestions = await getSimilarLooks(lookSlugs, 12)
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Capsule suggestions error:", error)
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    )
  }
}
