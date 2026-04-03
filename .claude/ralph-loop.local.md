---
active: true
iteration: 1
max_iterations: 10
completion_promise: "JBV-28 COMPLETE"
started_at: "2026-04-03T08:50:00Z"
---

## JBV-28: Product Recency — Surface Fresh Products, Flag Old Seasons

### What to build

#### 1. Sort products by recency
On vibe pages, sort the aggregated product grid by post date (newest first).
File: `app/(public)/vibe/[slug]/page.tsx`

#### 2. Split into "Shop Now" vs "Past Seasons"
On vibe pages, split the product grid:
- **"Shop Now"** — products from posts in the last 6 months
- **"Past Seasons"** — older products, shown in a collapsible section

Use the Post.date to determine recency. 6 months = 180 days.

#### 3. "Past Season" badge on old products
On look pages, products from posts older than 6 months get a subtle "Past Season" text/badge.
File: `app/(public)/look/[slug]/page.tsx`

#### 4. Sort look page products by recency
Already sorted by sortOrder — but on vibe pages where products aggregate, sort by post date.

### Completion criteria
When ALL true, output `<promise>JBV-28 COMPLETE</promise>`:
- [ ] Vibe page products sorted by post date (newest first)
- [ ] Vibe page splits products into "Shop Now" and "Past Seasons"
- [ ] Past Seasons section is collapsible (accordion or show/hide)
- [ ] Look page products from old posts show "Past Season" indicator
- [ ] TypeScript zero errors
