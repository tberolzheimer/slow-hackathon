---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-37 COMPLETE"
started_at: "2026-04-03T08:40:00Z"
---

## JBV-37: "Styled in X Looks" Product Badges

When a product appears across multiple Daily Looks, show a badge and create a click-through page.

### What to build

#### 1. Query cross-outfit products
Products are matched by `brand + itemName` combo. Create a server function that counts how many distinct posts each product appears in.

File: `lib/actions/products.ts`
```
getProductLookCount(brand: string, itemName: string) → number
getProductOutfits(brand: string, itemName: string) → Post[]
```

#### 2. Badge on product cards
On look page product cards, if the same brand+itemName appears in 2+ posts, show a small badge:
"Styled in 5 looks"

File: `app/(public)/look/[slug]/page.tsx`
- Query the look count for each product
- Show badge as a small pill below the product info

#### 3. Product outfit page
New route: `app/(public)/product/[slug]/page.tsx`
- Slug format: `chanel-jacket`, `hermes-bag` (brand-itemName slugified)
- Shows all outfit photos featuring this product
- Header: "Julia styled this piece X ways"
- Each outfit clickable to the look page
- Vibe tags on each outfit
- SEO: generateMetadata with "How Julia styles the Chanel Jacket"

#### 4. Make badge clickable
The "Styled in X looks" badge links to `/product/[slug]`

### Completion criteria
When ALL true, output `<promise>JBV-37 COMPLETE</promise>`:
- [ ] Products in 2+ looks show "Styled in X looks" badge on look page
- [ ] Badge links to /product/[slug] page
- [ ] Product outfit page shows all looks featuring that product
- [ ] Page has SEO metadata
- [ ] /product added to publicRoutes in proxy.ts
- [ ] TypeScript zero errors
