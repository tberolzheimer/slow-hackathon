# Heart & Save Feature — Design Spec for VibeShop

## Overview

A heart/save system for vibeshop.juliaberolzheimer.com that lets users save looks and products they love, builds preference data for personalization, and gently converts anonymous browsers into account holders. Designed around the psychology of emotional fashion shopping — the heart IS the engagement, not just a path to purchase.

---

## 1. The Heart/Save UX Flow

### 1.1 Where Hearts Appear

Hearts appear in THREE places:

| Location | What gets hearted | Heart style |
|---|---|---|
| **Vibe Grid** (homepage) | A vibe category (e.g., "Coastal Morning") | Small heart icon, top-right corner of vibe card |
| **Look Page** (e.g., Daily Look No. 97) | The full look/outfit | Heart button next to the look title |
| **Product Cards** ("Get the Look" items) | Individual products | Small heart icon, top-right corner of product image |

### 1.2 Heart Interaction

- **Tap to heart**: fills the heart icon (outline → solid), subtle scale animation (1.0 → 1.2 → 1.0 over 300ms)
- **Tap again to unheart**: unfills with a brief fade
- **No confirmation dialog** — the action should feel instant and low-commitment
- **Color**: use a warm tone from the brand palette (not aggressive red — think soft rose or the brand's accent color)
- **Micro-feedback**: a very subtle haptic pulse on mobile (if supported), or a brief CSS animation on desktop

### 1.3 Guest vs. Logged-In Behavior

**Phase 1: Guest (no account)**
- Hearts are stored in **localStorage** on the device
- Data structure: `{ visitorId: uuid, hearts: [{ type: "look" | "product" | "vibe", id: string, timestamp: ISO }] }`
- The `visitorId` is generated on first visit and persisted in localStorage
- Hearts work immediately — no login gate, no popup, no friction
- Guest can heart unlimited items

**Phase 2: Soft Prompt (after 3+ hearts)**
- After the user hearts their 3rd item, show a non-blocking toast/banner at the bottom of the screen:
  - **Copy**: "Love these picks? Create a free account to save them across all your devices."
  - **CTA**: "Save My Hearts" (links to sign-up)
  - **Dismiss**: small X to close, don't show again for 7 days (store dismiss timestamp in localStorage)
- This toast should NOT interrupt the browsing flow — it slides up gently and sits at the bottom
- Do NOT show a modal. Do NOT block the page. The research shows 26% of shoppers abandon when forced to create accounts.

**Phase 3: Account Created**
- On sign-up, merge all localStorage hearts into the user's database record
- Clear localStorage hearts after merge
- From this point, all hearts are saved server-side and synced across devices
- Show a one-time confirmation: "We saved your [N] hearted items to your account!"

### 1.4 The "My Saves" Page

Logged-in users get a `/saves` page accessible from the nav or profile icon:

**Layout:**
- Three tabs or filter pills: **All** | **Looks** | **Products** | **Vibes**
- Default view: grid of hearted items, most recently saved first
- Each card shows: thumbnail image, name, heart icon (filled), and for products: price + "Shop" link
- Looks show: the hero outfit photo, look name/vibe label, number of products in the look
- Vibes show: the vibe card image and name

**Empty state** (no hearts yet):
- "You haven't saved anything yet. Browse vibes and tap the heart on looks you love."
- CTA button: "Explore Vibes" → links to homepage

---

## 2. Data Model (Prisma Schema)

```prisma
model Heart {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemType  String   // "look" | "product" | "vibe"
  itemId    String   // the ID of the look, product, or vibe
  createdAt DateTime @default(now())

  @@unique([userId, itemType, itemId]) // prevent duplicate hearts
  @@map("hearts")
}
```

Add to the User model:
```prisma
hearts Heart[]
```

### Guest Data (localStorage)

```typescript
interface GuestHearts {
  visitorId: string;          // UUID generated on first visit
  hearts: GuestHeart[];
  promptDismissedAt?: string; // ISO timestamp of when they dismissed the sign-up prompt
}

interface GuestHeart {
  itemType: "look" | "product" | "vibe";
  itemId: string;
  createdAt: string; // ISO timestamp
}
```

---

## 3. Server Actions

### 3.1 Toggle Heart (logged-in users)

```
File: lib/actions/hearts.ts

toggleHeart(itemType: string, itemId: string)
- Get session via auth()
- Check if heart exists for this user + itemType + itemId
- If exists: delete it (unheart), return { hearted: false }
- If not: create it (heart), return { hearted: true }

getUserHearts()
- Get session via auth()
- Return all hearts for this user, ordered by createdAt desc
- Include related look/product/vibe data for display

getHeartCounts()
- Returns aggregate counts: { looks: N, products: N, vibes: N, total: N }

isHearted(itemType: string, itemId: string)
- Returns boolean for whether the current user has hearted this item
```

### 3.2 Merge Guest Hearts (on account creation)

```
mergeGuestHearts(guestHearts: GuestHeart[])
- Get session via auth()
- For each guest heart, create a Heart record (skip duplicates via upsert)
- Return { merged: N, skipped: N }
```

### 3.3 Get Popular Hearts (for trending/social proof)

```
getPopularItems(itemType: string, limit: number)
- Count hearts grouped by itemId for the given itemType
- Return top N items ordered by heart count desc
- Useful for "Trending Looks" or "Most Loved" sections
```

---

## 4. What Data You Collect and How to Use It

### 4.1 Immediate Data from Hearts

Every heart tells you:

| Signal | What it means | How to use it |
|---|---|---|
| **Which vibes are hearted most** | Which aesthetic resonates with this user | Show their preferred vibes first on homepage |
| **Which looks are hearted** | What outfit styles they aspire to | Power "More looks you'll love" recommendations |
| **Which products are hearted** | What they might actually buy | Price drop / back-in-stock email triggers |
| **Heart timestamp** | When they engage | Understand engagement patterns (time of day, day of week) |
| **Heart-then-click** | Intent to purchase | Track which hearted items lead to affiliate clicks |

### 4.2 Aggregate Data (Across All Users)

| Metric | Query | Business use |
|---|---|---|
| **Most hearted looks** | Count hearts by look, last 7 days | "Trending This Week" section on homepage |
| **Most hearted products** | Count hearts by product, last 30 days | Surface best-sellers, inform brand partnerships |
| **Most hearted vibes** | Count hearts by vibe | Know which vibes to create more content for |
| **Hearts-to-clicks ratio** | Hearts vs affiliate link clicks per product | Understand which products convert vs just inspire |
| **Vibe affinity clusters** | Users who heart Vibe A also heart Vibe B | Recommend related vibes: "If you love Coastal Morning, try Sunday Brunch" |

### 4.3 Personalization Features (Build Over Time)

**Phase 1 (Launch):**
- "My Saves" page with all hearted items
- Heart counts on looks/products as social proof ("243 people saved this look")

**Phase 2 (Post-Launch):**
- "Trending This Week" — most hearted looks in last 7 days
- "Popular in [Vibe Name]" — most hearted products within a vibe
- Personalized homepage: reorder vibe grid based on user's heart history

**Phase 3 (Future):**
- "Because you loved [Look X]" — recommend similar looks based on vibe + product overlap
- Email: "A product you saved is back in stock" or "New looks in your favorite vibe"
- "Your Style Profile" — show the user which vibes they gravitate toward as a visual breakdown

---

## 5. Account Creation Flow

### 5.1 When to Prompt

| Trigger | Prompt type | Copy |
|---|---|---|
| **3rd heart (guest)** | Bottom toast, non-blocking | "Love these picks? Save them to your account." |
| **Tap "My Saves" (guest)** | Inline message on the saves page | "Create a free account to save looks across all your devices." |
| **Return visit with localStorage hearts** | Top banner, dismissible | "Welcome back! You have [N] saved looks. Sign up to keep them forever." |
| **NEVER** | Modal popup blocking the page | — |

### 5.2 Sign-Up Form

Keep it minimal. The existing Auth.js email/password flow works. The sign-up page should:

- **Headline**: "Save Your Style" (not "Create Account" — emotional framing)
- **Subhead**: "Keep your hearted looks and get notified when new vibes drop."
- **Fields**: Email, Password (that's it — no name, no phone, no address)
- **CTA button**: "Save My Hearts" (not "Sign Up" — action-oriented, references what they've already done)
- **Below the fold**: "Already have an account? Sign in"

### 5.3 Post-Sign-Up Experience

Immediately after account creation:
1. Merge localStorage hearts into database (call `mergeGuestHearts`)
2. Redirect to `/saves` page showing all their hearted items
3. Show a confirmation banner: "Done! Your [N] saved items are now synced across all your devices."
4. This is a "reward moment" — the user immediately sees value from creating the account

### 5.4 Sign-In with Existing Hearts

If a user signs in and has localStorage hearts that don't exist in their account:
- Silently merge them
- No prompt needed — just sync

---

## 6. UI Component Specifications

### 6.1 HeartButton Component

```
Props:
  - itemType: "look" | "product" | "vibe"
  - itemId: string
  - size: "sm" | "md" | "lg" (default: "md")
  - showCount: boolean (default: false)
  - count: number (optional, for social proof)

Behavior:
  - If user is logged in: call toggleHeart server action
  - If guest: update localStorage, check if 3+ hearts → show toast
  - Optimistic UI: update heart state immediately, revert on error

Sizes:
  - sm: 20x20px (for product cards in grid)
  - md: 24x24px (for look pages)
  - lg: 32x32px (for hero sections)

States:
  - Default: outline heart, muted color
  - Hearted: filled heart, brand accent color, subtle pulse animation on first fill
  - Hover (desktop): outline heart with slight fill preview
```

### 6.2 HeartPromptToast Component

```
Props:
  - heartCount: number
  - onDismiss: () => void
  - onSignUp: () => void

Behavior:
  - Slides up from bottom of screen
  - Sits above any sticky nav bar
  - Auto-dismisses after 10 seconds if not interacted with
  - Does not reappear for 7 days after dismissal
  - On mobile: full-width bar at bottom
  - On desktop: right-aligned toast, max-width 400px

Copy:
  "[heartCount] looks saved! Create a free account to keep them forever."
  [Save My Hearts] [X]
```

### 6.3 SavesPage Layout

```
Route: /saves (inside authenticated group)

Layout:
  - Filter pills at top: All | Looks (N) | Products (N) | Vibes (N)
  - Grid below: responsive (1 col mobile, 2 col tablet, 3-4 col desktop)
  - Each card: image thumbnail, title, heart icon (filled), and metadata
  - Product cards additionally show: price, "Shop" affiliate link
  - Look cards additionally show: vibe label badge, product count
  - Sort: most recently hearted first (default)
```

---

## 7. Implementation Priority

Build in this order:

1. **HeartButton component** + localStorage for guests (no backend needed)
2. **Prisma Heart model** + `toggleHeart` server action for logged-in users
3. **Heart state on Look Page** — add hearts to the look hero and product cards
4. **Sign-up prompt toast** — show after 3rd heart for guests
5. **mergeGuestHearts** — sync localStorage → database on sign-up/sign-in
6. **My Saves page** — `/saves` route with grid of hearted items
7. **Heart counts as social proof** — "243 people saved this look" on look pages
8. **Trending section** — "Most Loved This Week" on homepage using aggregate heart data

---

## 8. Key Design Principles (From the Research)

1. **The heart IS the engagement** — don't treat it as a funnel step toward purchase. The act of saving is emotionally complete on its own. Let it be that.

2. **Never gate the heart behind a login** — 26% of users abandon at forced account creation. Hearts must work instantly for everyone.

3. **The Zeigarnik Effect is your friend** — hearted items create "open loops" that pull users back to the site. An unsaved heart is an unfinished task in the user's mind.

4. **Hearts are preference data, not purchase intent** — most hearted items will never be purchased. That's fine. The data still tells you what vibes, styles, and products resonate.

5. **Account creation should feel like saving, not signing up** — frame it as "Save My Hearts" not "Create Account." The user is protecting something they already value, not filling out a form.

6. **Women 18-29 expect this feature** — Julia's core audience uses wishlists more than any other demographic. Not having hearts would feel like a missing feature, not a design choice.
