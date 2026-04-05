"use server"

import { generateCapsuleFromTrip, type TripInput, type CapsuleResult } from "@/lib/ai/capsule-engine"

export async function generateCapsule(input: TripInput): Promise<CapsuleResult> {
  return generateCapsuleFromTrip(input)
}
