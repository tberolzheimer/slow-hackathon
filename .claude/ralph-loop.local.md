---
active: true
iteration: 1
max_iterations: 10
completion_promise: "JBV-42 COMPLETE"
started_at: "2026-04-03T08:28:00Z"
---

## JBV-42: Mobile PDP Polish — Full-Body Outfit + Product Padding

### Fix 1: Remove StickyHero, use plain image
- Delete `app/(public)/look/[slug]/sticky-hero.tsx`
- In `app/(public)/look/[slug]/page.tsx`, replace StickyHero with a plain Image
- Mobile: full-size image, natural aspect ratio, padding on sides (px-4)
- No sticky, no floating, no shrinking — just a beautiful full-body outfit photo that scrolls normally
- Desktop: keep the sticky split layout (lg:sticky lg:top-20)

### Fix 2: Product card padding
- In `app/(public)/look/[slug]/page.tsx`, add more internal padding to product cards
- Product images should have breathing room inside their cards (p-3 or p-4 around the image)
- Add margin between image and text content

### Completion criteria
When ALL true, output `<promise>JBV-42 COMPLETE</promise>`:
- [ ] StickyHero component removed
- [ ] Hero image shows full body with padding on mobile
- [ ] Normal scrolling on mobile — no tricks
- [ ] Product cards have more internal padding
- [ ] Desktop sticky split layout preserved
- [ ] TypeScript zero errors
