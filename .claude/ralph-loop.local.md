---
active: true
iteration: 1
max_iterations: 15
completion_promise: "BUGS FIXED"
started_at: "2026-04-03T14:12:00Z"
---

## Fix 3 Demo Bugs: JBV-43, JBV-44, JBV-45

### Bug 1: Heart count badge not incrementing (JBV-43)
File: `components/heart-nav-badge.tsx`

The HeartNavBadge polls every 2s via setInterval, but the guest heart count might not be updating because:
- The polling reads `getGuestHeartCount()` which reads localStorage
- But the HeartButton writes to localStorage via `addGuestHeart` in a different component
- The polling should work but might have a stale closure issue

Fix: dispatch a custom event from HeartButton when a heart changes, listen for it in HeartNavBadge.

Also check: `components/heart-button.tsx` — after toggling, dispatch `window.dispatchEvent(new Event("hearts-changed"))`. Then in HeartNavBadge, listen for that event in addition to the interval.

### Bug 2: "Styled in X looks" badge not clickable (JBV-44)
File: `app/(public)/look/[slug]/page.tsx`

The badge is currently a `<span>`. It was changed from `<Link>` because onClick can't be used in server components. But a plain `<a>` tag (not Next.js Link) works fine in server components without onClick.

Fix: change the `<span>` to an `<a href="/product/[slug]">` tag. No onClick needed — it's just a regular link.

### Bug 3: Brand search not returning looks (JBV-45)
File: `app/(public)/search/page.tsx`

The VisionData raw SQL query searches garments, mood, season, etc. but NOT brand names. When someone searches "Chanel", the VisionData query won't match because "Chanel" is in `Product.brand`, not in VisionData fields.

Fix: add a second query that finds posts containing products matching the brand search:
```sql
SELECT DISTINCT p.id, p.slug, p.title, p."displayTitle", p."outfitImageUrl", p.date
FROM posts p
JOIN products pr ON pr."postId" = p.id
WHERE pr.brand ILIKE $1 OR pr."itemName" ILIKE $1 OR pr."rawText" ILIKE $1
ORDER BY p.date DESC
LIMIT 20
```
Merge these results into the looks array (deduplicate by id).

### Completion criteria
When ALL true, output `<promise>BUGS FIXED</promise>`:
- [ ] Heart an item → nav badge count updates immediately
- [ ] "Styled in X looks" badge is a clickable link to /product/[slug]
- [ ] Search "Chanel" returns look photos (outfits featuring Chanel products)
- [ ] TypeScript zero errors
