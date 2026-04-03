---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-36 COMPLETE"
started_at: "2026-04-03T08:34:00Z"
---

## JBV-36: Retailer Extraction — Follow Affiliate URLs

Resolve affiliate URLs (go.shopmy.us, shopstyle.it) to actual retailer destinations.

### What to build

#### 1. Resolver script (`scripts/resolve-retailers.ts`)
- Fetch each product's affiliate URL with `redirect: "manual"`
- Read the `Location` header to get the redirect destination
- For go.shopmy.us/ap/ URLs: the `url` query param contains the encoded retailer URL — just decode it
- For go.shopmy.us/p-NNNNN URLs: need to follow the redirect
- For shopstyle.it URLs: need to follow the redirect
- Parse the retailer domain from the destination URL
- Map domains to friendly names: nordstrom.com → "Nordstrom", net-a-porter.com → "Net-a-Porter", etc.
- Update Product records: `retailerName`, `retailerUrl`
- Rate limit: 500ms between requests
- Batch process all products, skip any that already have retailerName set

#### 2. Add retailerDomain to Prisma schema
Add `retailerDomain String?` to the Product model. Run db:push.

#### 3. npm script
Add `"resolve-retailers": "tsx scripts/resolve-retailers.ts"` to package.json

#### 4. Update product cards to show retailer
In look page product cards, show "Shop at Nordstrom →" instead of just "Shop This →" when retailerName is available.
File: `app/(public)/look/[slug]/page.tsx`

### Known retailer domain mappings
```
nordstrom.com → Nordstrom
net-a-porter.com → Net-a-Porter
shopbop.com → Shopbop
revolve.com → Revolve
saksfifthavenue.com → Saks Fifth Avenue
bergdorfgoodman.com → Bergdorf Goodman
mytheresa.com → Mytheresa
matchesfashion.com → Matches
ssense.com → SSENSE
farfetch.com → Farfetch
amazon.com → Amazon
margauxny.com → Margaux
dfrfrnt.com → Dôen
tuckernuck.com → Tuckernuck
jcrew.com → J.Crew
mango.com → Mango
zara.com → Zara
```

### Completion criteria
When ALL true, output `<promise>JBV-36 COMPLETE</promise>`:
- [ ] Product model has retailerDomain field, db:push succeeds
- [ ] scripts/resolve-retailers.ts exists and can resolve ShopMy URLs
- [ ] npm script "resolve-retailers" added to package.json
- [ ] Product cards show "Shop at [Retailer] →" when retailerName available
- [ ] TypeScript zero errors
- [ ] Test: run resolver on 10 products, verify retailerName populated
