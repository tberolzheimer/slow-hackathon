---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-27 COMPLETE"
started_at: "2026-04-03T06:40:00Z"
---

## JBV-27: Vibe Page UX — Jump to Products, Sticky Nav, Show More

You are building VibéShop. Read `CLAUDE.md`. 835 posts, 8 vibes (some with 80+ looks).

### Problem
Vibe pages are too long. 80 looks + product grid = wall of content. Users need to know products exist below, be able to jump there, and not feel overwhelmed by the outfit grid.

### What to build

**File:** `app/(public)/vibe/[slug]/page.tsx`

#### 1. Sticky section nav
Add a sticky mini-nav below the vibe header with anchor links:
- "The Looks" | "Shop the Vibe" (with product count)
- Small pills, stick below the site header on scroll
- Use `id` attributes on sections for anchor links
- Smooth scroll on click
- This is a client component (`"use client"`)

Create: `app/(public)/vibe/[slug]/section-nav.tsx`

#### 2. Show first 12 looks, then "Show all X looks" button
Don't render all 80 outfits at once. Show first 12 in the masonry grid, then a "Show all X looks" button that reveals the rest.
- Use client component with useState for expanded state
- The button text: "Show all 83 looks" or similar
- When expanded, show all looks
- Progressive disclosure, not pagination

Create: `app/(public)/vibe/[slug]/outfit-grid.tsx` (client component)

#### 3. Product count in section header
Change "Shop the Vibe" → "Shop the Vibe — 42 pieces"

#### 4. "Jump to products" teaser
After the first row of outfits (6 items), show a subtle link:
"This vibe has 42 shoppable pieces → Shop now"
Links to the #shop-the-vibe anchor

### Completion criteria
When ALL of the following are true, output `<promise>JBV-27 COMPLETE</promise>`:
- [ ] Sticky section nav visible on scroll (The Looks | Shop the Vibe — N pieces)
- [ ] Outfit grid shows first 12 looks with "Show all X looks" button
- [ ] Clicking "Show all" reveals remaining looks
- [ ] Product count shown in section header
- [ ] "Jump to products" teaser visible after first row of outfits
- [ ] Anchor links scroll smoothly to sections
- [ ] TypeScript compiles with zero errors

Do NOT output the promise tag until every item is verified.
