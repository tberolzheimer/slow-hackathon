---
active: true
iteration: 1
max_iterations: 20
completion_promise: "JBV-33 COMPLETE"
started_at: "2026-04-03T07:42:00Z"
---

## JBV-33: Klaviyo Integration — Welcome Flow + Vibe-Personalized Email

You are building VibéShop. Read `CLAUDE.md`. Klaviyo MCP is connected. The heart system is built (lib/actions/hearts.ts, createAccountFromEmail in lib/actions/auth.ts).

### Build in this order:

#### 1. Klaviyo sync module
**File:** `lib/klaviyo/sync.ts`

Functions:
- `syncProfileToKlaviyo(email, vibePreferences)` — creates/updates Klaviyo profile with custom properties
- `trackHeartEvent(email, eventName, eventData)` — tracks heart events in Klaviyo

Use the Klaviyo MCP tools: `klaviyo_create_profile`, `klaviyo_update_profile`, `klaviyo_subscribe_profile_to_marketing`

BUT since MCP tools aren't callable from server code, use the Klaviyo API directly via fetch. The API key is in env as `KLAVIYO_API_KEY` (or check what's available).

First, check what Klaviyo lists exist using the MCP: `klaviyo_get_lists`. Then check the account details: `klaviyo_get_account_details`.

API endpoints:
- POST https://a.klaviyo.com/api/profiles/ — create profile
- POST https://a.klaviyo.com/api/events/ — track event
- POST https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/ — subscribe to list

Custom properties to set on profile:
```
vibeshop_hearted_vibes: string[] (vibe names)
vibeshop_heart_count: number
vibeshop_top_vibe: string
vibeshop_preferred_season: string
vibeshop_sign_up_source: "vibeshop_hearts"
```

#### 2. Wire into createAccountFromEmail
**File:** `lib/actions/auth.ts`

After creating account + merging hearts:
- Compute the user's vibe preferences from their hearts (which vibes their hearted looks belong to)
- Call syncProfileToKlaviyo with email + preferences
- Subscribe to marketing list

#### 3. Wire into toggleHeart
**File:** `lib/actions/hearts.ts`

After toggling a heart (for logged-in users):
- Track a Klaviyo event: "Hearted Look", "Hearted Product", or "Hearted Vibe"
- Include metadata: item name, vibe name, brand, etc.

#### 4. Create welcome flow email templates
Use Klaviyo MCP to create email templates for the 5-email welcome series:

Email 1: "Your [N] saved looks are safe with us" — instant
Email 2: "We figured out your vibe" — day 2
Email 3: "Julia posted something you'll love" — day 4
Email 4: "The [Brand] [Item] everyone's saving" — day 7
Email 5: "New looks just dropped in [Vibe]" — day 14

Use `klaviyo_create_email_template` for each. HTML templates with VibéShop branding.

### Completion criteria
When ALL of the following are true, output `<promise>JBV-33 COMPLETE</promise>`:
- [ ] lib/klaviyo/sync.ts exists with syncProfileToKlaviyo and trackHeartEvent
- [ ] createAccountFromEmail calls syncProfileToKlaviyo after account creation
- [ ] toggleHeart tracks events to Klaviyo for logged-in users
- [ ] 5 email templates created in Klaviyo (or template creation code ready)
- [ ] KLAVIYO_API_KEY referenced from env
- [ ] TypeScript compiles with zero errors

Do NOT output the promise tag until every item is verified.
