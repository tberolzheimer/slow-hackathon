---
active: true
iteration: 1
max_iterations: 20
completion_promise: "JBV-31 COMPLETE"
started_at: "2026-04-03T07:12:00Z"
---

## JBV-31: Heart/Save UI Layer

You are building VibéShop. Read `CLAUDE.md` and `docs/heart-save-spec.md` for full context.

### Backend already built:
- `prisma/schema.prisma` — Heart model (already pushed to DB)
- `lib/actions/hearts.ts` — 6 server actions
- `lib/hearts/guest-hearts.ts` — localStorage utilities
- `lib/hooks/use-heart.ts` — useHeart() React hook with optimistic UI

Read these files before building to understand the API contracts.

### Build these 5 things:

#### 1. HeartButton component
**File:** `components/heart-button.tsx` ("use client")

- Uses the `useHeart()` hook from `lib/hooks/use-heart.ts`
- Props: itemType ("look" | "product" | "vibe"), itemId, size ("sm" | "md" | "lg" default "md"), showCount? boolean, count? number
- Renders a heart icon from lucide-react (Heart)
- When hearted: filled, brand accent color (use `text-primary`), scale pulse animation
- When not hearted: outline, muted color
- Animation: scale 1.0 → 1.2 → 1.0 over 300ms on heart (CSS keyframe or transition)
- Sizes: sm=20px, md=24px, lg=32px
- If showCount && count: show count next to heart

#### 2. HeartPromptToast component
**File:** `components/heart-prompt-toast.tsx` ("use client")

- Shows after 3rd guest heart
- Non-blocking bottom toast, slides up
- Copy: "[N] looks saved! Create a free account to keep them forever."
- CTA: "Save My Hearts" → /sign-up
- Dismiss X, stores dismissal timestamp in localStorage, don't show for 7 days
- Auto-dismiss after 10 seconds
- Mobile: full-width bottom. Desktop: right-aligned max-w-md
- Must sit ABOVE the sticky shop bar on look pages (z-index management)
- Read guest-hearts.ts to understand the localStorage structure

#### 3. /saves page
**Route:** `app/(public)/saves/page.tsx`
- Add `/saves` to publicRoutes in `proxy.ts`
- For logged-in users: fetch hearts from DB via getUserHearts
- For guests: read from localStorage (client component)
- Filter pills: All | Looks | Products | Vibes (with counts)
- Grid: responsive (1/2/3-4 cols)
- Each card: thumbnail, title, filled heart, metadata
- Product cards: + price + "Shop" link
- Look cards: + vibe badge + product count
- Empty state: "You haven't saved anything yet." + "Explore Vibes" CTA
- This will need a client component for the filter tabs and guest heart reading

#### 4. Wire HeartButton into existing pages

**Look page** (`app/(public)/look/[slug]/page.tsx`):
- Heart button next to the look title (size="lg")
- Heart button on each product card (size="sm", positioned absolute top-right of image)

**Vibe page** (`app/(public)/vibe/[slug]/outfit-grid.tsx`):
- Heart button on each outfit thumbnail (size="sm", positioned absolute top-right)

**Landing page** (`app/(public)/page.tsx`):
- Heart button on each vibe card (size="sm", positioned absolute top-right)

#### 5. Add HeartPromptToast to the public layout
**File:** `app/(public)/layout.tsx`
- Add HeartPromptToast at the bottom of the layout (it manages its own visibility)

### Completion criteria
When ALL of the following are true, output `<promise>JBV-31 COMPLETE</promise>`:
- [ ] HeartButton component exists and renders heart icon with fill/outline states
- [ ] HeartButton has scale pulse animation on heart action
- [ ] HeartButton wired into look page (title + product cards)
- [ ] HeartButton wired into vibe page outfit grid
- [ ] HeartButton wired into landing page vibe cards
- [ ] HeartPromptToast component exists
- [ ] HeartPromptToast added to public layout
- [ ] /saves page exists with filter tabs and grid
- [ ] /saves added to publicRoutes in proxy.ts
- [ ] TypeScript compiles with zero errors

Do NOT output the promise tag until every item is verified.
