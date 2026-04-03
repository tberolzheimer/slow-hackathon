---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-48 COMPLETE"
started_at: "2026-04-03T14:20:00Z"
---

## JBV-48: Performance — Speed Up Page Loads

### What to optimize

#### 1. Optimize Prisma queries — select only needed fields
The vibe page query includes full post data + all products. Use `select` instead of `include` to only fetch what's displayed.

Files: `app/(public)/vibe/[slug]/page.tsx`, `app/(public)/look/[slug]/page.tsx`, `app/(public)/page.tsx`

#### 2. Add database indexes
The search queries join vision_data and products tables. Add indexes for common query patterns:
- `products.brand` (already exists)
- `posts.date` (already exists)
- Composite index on `products(postId, isAlternative)` for filtered queries

File: `prisma/schema.prisma`

#### 3. Use generateStaticParams for pre-rendering
Vibe pages and popular look pages can be pre-rendered at build time:
- `generateStaticParams` on `/vibe/[slug]` — only 8-15 vibes
- `generateStaticParams` on `/look/[slug]` — at least recent 50 looks

Files: `app/(public)/vibe/[slug]/page.tsx`, `app/(public)/look/[slug]/page.tsx`

#### 4. Add revalidation (ISR)
Pages don't need to be re-rendered on every request. Add revalidation:
- Vibe pages: `revalidate = 3600` (1 hour)
- Look pages: `revalidate = 86400` (1 day — content doesn't change)
- Landing page: `revalidate = 1800` (30 min)
- Search: dynamic (no cache — needs fresh results)

#### 5. Reduce N+1 queries on look page
The look page does a separate `groupBy` query PER PRODUCT to get look counts. This is an N+1. Batch it into a single query.

File: `app/(public)/look/[slug]/page.tsx`

#### 6. Image optimization
Ensure all images use proper `sizes` attribute and `priority` on above-fold images.

### Completion criteria
When ALL true, output `<promise>JBV-48 COMPLETE</promise>`:
- [ ] Vibe page query optimized (select only needed fields)
- [ ] Look page N+1 query eliminated (batch look counts)
- [ ] generateStaticParams on vibe and look pages
- [ ] revalidate set on all pages
- [ ] TypeScript zero errors
