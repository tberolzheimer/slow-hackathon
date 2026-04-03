---
active: true
iteration: 1
max_iterations: 20
completion_promise: "JBV-25 COMPLETE"
started_at: "2026-04-03T14:30:00Z"
---

## JBV-25: Programmatic SEO Pages — Brand, Style, Color, Season

Build auto-generated pages from VisionData. Start with brand and season pages (most straightforward), then add style/color/combo pages.

### Phase 1: Brand Pages (`/brand/[slug]`)

**Route:** `app/(public)/brand/[slug]/page.tsx`

1. Query all distinct brands from Product.brand where the brand has 3+ non-alternative products
2. For each brand: show all looks featuring that brand's products + all products from that brand
3. generateStaticParams for all brands with 3+ products
4. generateMetadata: "Julia's [Brand] Outfits — VibéShop"
5. Add `/brand` to publicRoutes in proxy.ts

**Page layout:**
- Header: brand name (Playfair Display) + "X looks featuring [Brand]"
- Outfit grid: all posts containing this brand's products
- Product grid: all products from this brand (deduplicated)
- Internal links to related brands

### Phase 2: Season Pages (`/season/[slug]`)

**Route:** `app/(public)/season/[slug]/page.tsx`

1. Query all posts by VisionData.season or Post.season
2. 4 pages: spring, summer, fall, winter
3. Show outfits + products for that season
4. generateStaticParams: ["spring", "summer", "fall", "winter"]

### Phase 3: Add to sitemap
Update `app/sitemap.ts` to include brand and season pages.

### Completion criteria
When ALL true, output `<promise>JBV-25 COMPLETE</promise>`:
- [ ] Brand pages render for brands with 3+ products
- [ ] Season pages render for spring/summer/fall/winter
- [ ] generateStaticParams + generateMetadata on both
- [ ] /brand and /season in publicRoutes
- [ ] Sitemap includes brand and season pages
- [ ] TypeScript zero errors
