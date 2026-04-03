---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-53 COMPLETE"
started_at: "2026-04-03T15:09:00Z"
---

## JBV-53: Internal Discovery — Surface Brand + Season Pages

Make programmatic SEO pages discoverable inside the experience.

### What to build

#### 1. Landing page: "Browse by Brand" + "Browse by Season" sections
File: `app/(public)/page.tsx`

Below the vibe grid and "How It Works", add:
- "Browse by Brand" — horizontal scroll of top brand names as pills/links
- "Browse by Season" — 4 season cards linking to /season/[slug]

#### 2. Look page: brand links + season tag
File: `app/(public)/look/[slug]/page.tsx`

- Product card brand names become links to `/brand/[slug]`
- Add a season badge near the date that links to `/season/[slug]`

#### 3. Vibe page: "Brands in this vibe" section
File: `app/(public)/vibe/[slug]/page.tsx`

After the product grid, add a "Brands in this vibe" section:
- Query distinct brands from the vibe's products
- Show as horizontal pill links to `/brand/[slug]`

#### 4. Footer: nav links
File: `app/(public)/layout.tsx`

Add to footer: "Brands · Seasons · Search · Saves" links

### Completion criteria
When ALL true, output `<promise>JBV-53 COMPLETE</promise>`:
- [ ] Landing page has "Browse by Brand" + "Browse by Season"
- [ ] Look page brand names link to brand pages
- [ ] Look page has season badge linking to season page
- [ ] Vibe page has "Brands in this vibe" section
- [ ] Footer has nav links
- [ ] TypeScript zero errors
