"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

import { toggleHeart as toggleHeartAction } from "@/lib/actions/hearts"
import {
  addGuestHeart,
  isGuestHearted,
  removeGuestHeart,
} from "@/lib/hearts/guest-hearts"

type ItemType = "look" | "product" | "vibe"

export function useHeart(itemType: ItemType, itemId: string) {
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  const [hearted, setHearted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Initialize heart state
  useEffect(() => {
    if (isLoggedIn) {
      // For logged-in users, check server state
      // We use a lightweight fetch instead of importing isHearted directly
      // to avoid server action calls during render
      const checkHeart = async () => {
        try {
          const { isHearted } = await import("@/lib/actions/hearts")
          const result = await isHearted(itemType, itemId)
          setHearted(result)
        } catch {
          setHearted(false)
        }
        setLoading(false)
      }
      checkHeart()
    } else {
      // For guests, check localStorage
      setHearted(isGuestHearted(itemType, itemId))
      setLoading(false)
    }
  }, [isLoggedIn, itemType, itemId])

  const toggle = useCallback(async () => {
    const prev = hearted

    // Optimistic update
    setHearted(!prev)

    if (isLoggedIn) {
      try {
        const result = await toggleHeartAction(itemType, itemId)
        if ("error" in result) {
          // Revert on error
          setHearted(prev)
        } else {
          setHearted(result.hearted)
        }
      } catch {
        // Revert on error
        setHearted(prev)
      }
    } else {
      // Guest: update localStorage
      if (prev) {
        removeGuestHeart(itemType, itemId)
      } else {
        addGuestHeart(itemType, itemId)
      }
    }
  }, [hearted, isLoggedIn, itemType, itemId])

  return { hearted, toggle, loading }
}
