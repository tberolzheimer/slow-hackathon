const KLAVIYO_API_URL = "https://a.klaviyo.com/api"
const KLAVIYO_REVISION = "2024-10-15"
const VIBESHOP_EMAIL_LIST_ID = "UeFBMV" // Julia Berolzheimer "Email List" — single opt-in

function getApiKey() {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY || process.env.KLAVIYO_API_KEY
  if (!key) throw new Error("KLAVIYO_PRIVATE_API_KEY not set in env")
  return key
}

async function klaviyoFetch(path: string, body: unknown) {
  const res = await fetch(`${KLAVIYO_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Klaviyo-API-Key ${getApiKey()}`,
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Klaviyo API error (${res.status}):`, text)
  }

  return res
}

/**
 * Create or update a Klaviyo profile with VibeShop data.
 * Also subscribes them to the main email list.
 */
export async function syncProfileToKlaviyo(
  email: string,
  preferences: {
    heartedVibes?: string[]
    heartCount?: number
    topVibe?: string
    preferredSeason?: string
    preferredColors?: string[]
    signupSource?: string
  }
) {
  try {
    // Create/update profile
    await klaviyoFetch("/profile-import/", {
      data: {
        type: "profile",
        attributes: {
          email,
          properties: {
            vibeshop_sign_up_source: preferences.signupSource || "vibeshop",
            vibeshop_hearted_vibes: preferences.heartedVibes || [],
            vibeshop_heart_count: preferences.heartCount || 0,
            vibeshop_top_vibe: preferences.topVibe || "",
            vibeshop_preferred_season: preferences.preferredSeason || "",
            vibeshop_preferred_colors: preferences.preferredColors || [],
            vibeshop_sign_up_date: new Date().toISOString(),
          },
        },
      },
    })

    // Subscribe to email list
    await klaviyoFetch("/profile-subscription-bulk-create-jobs/", {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: { marketing: { consent: "SUBSCRIBED" } },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: { type: "list", id: VIBESHOP_EMAIL_LIST_ID },
          },
        },
      },
    })

    console.log(`Klaviyo: synced profile ${email}`)
  } catch (err) {
    console.error("Klaviyo sync error:", err)
    // Don't throw — Klaviyo sync is non-blocking
  }
}

/**
 * Track a heart event in Klaviyo for automation triggers.
 */
export async function trackHeartEvent(
  email: string,
  eventName: "Hearted Look" | "Hearted Product" | "Hearted Vibe",
  metadata: {
    itemName?: string
    vibeName?: string
    brand?: string
    season?: string
  }
) {
  try {
    await klaviyoFetch("/events/", {
      data: {
        type: "event",
        attributes: {
          metric: {
            data: { type: "metric", attributes: { name: eventName } },
          },
          profile: {
            data: { type: "profile", attributes: { email } },
          },
          properties: {
            item_name: metadata.itemName || "",
            vibe_name: metadata.vibeName || "",
            brand: metadata.brand || "",
            season: metadata.season || "",
            source: "vibeshop",
          },
          time: new Date().toISOString(),
        },
      },
    })
  } catch (err) {
    console.error("Klaviyo event tracking error:", err)
  }
}
