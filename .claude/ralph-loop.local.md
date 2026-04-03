---
active: true
iteration: 1
max_iterations: 15
completion_promise: "STICKY HERO FIXED"
started_at: "2026-04-03T08:15:00Z"
---

## Fix: Mobile sticky hero is breaking scroll entirely

### The bug
On the mobile look/PDP page, the sticky hero image is preventing ALL scrolling. The page snaps back to the top after every swipe. Users cannot reach the products below. The page is non-functional on mobile.

### Root cause (likely)
The `StickyHero` component at `app/(public)/look/[slug]/sticky-hero.tsx` uses `sticky top-16` positioning on a container that either:
1. Has a height/overflow constraint that prevents the page from scrolling past it
2. The IntersectionObserver is causing layout thrashing as it toggles between states
3. The parent container doesn't have enough scrollable content below the sticky element
4. The sticky element's container might be `overflow: hidden` which breaks sticky

### Fix approach
The simplest approach that won't fight the scroll:
- DON'T use CSS sticky on mobile for the hero image
- Instead, use a simpler approach: the hero shows full-size initially, and once the user scrolls past it, show a small fixed thumbnail in the top-left corner
- Or even simpler: just let the hero scroll away naturally on mobile, and add a small floating thumbnail that appears after scroll
- The key constraint: NEVER prevent or interfere with normal page scrolling

### Files to fix
- `app/(public)/look/[slug]/sticky-hero.tsx` — the problematic component
- `app/(public)/look/[slug]/page.tsx` — how it's used in the layout

### Test criteria
After fixing, verify by checking the HTML output:
1. No `overflow: hidden` on any parent container on mobile
2. No `position: sticky` that could trap scroll on mobile
3. No `height: 100vh` constraints
4. The page body must be freely scrollable
5. The hero image must not fight or intercept scroll gestures

### Completion criteria
When ALL of the following are true, output `<promise>STICKY HERO FIXED</promise>`:
- [ ] Mobile page scrolls freely — no snap-back, no fighting
- [ ] Hero image is visible initially (full size)
- [ ] After scrolling past hero, a small thumbnail appears (fixed position, not sticky)
- [ ] Products are reachable via normal scrolling
- [ ] Desktop layout unchanged (sticky split still works)
- [ ] TypeScript compiles with zero errors

Do NOT output the promise tag until the scroll issue is definitively fixed.
