---
active: true
iteration: 1
max_iterations: 10
completion_promise: "JBV-52 COMPLETE"
started_at: "2026-04-03T14:55:00Z"
---

## JBV-52: Add "back to" navigation on every page type

### Pages to update

1. **Vibe page** (`app/(public)/vibe/[slug]/page.tsx`) — Add "← All Vibes" link at top
2. **Brand page** (`app/(public)/brand/[slug]/page.tsx`) — Add "← All Vibes" link at top
3. **Season page** (`app/(public)/season/[slug]/page.tsx`) — Add "← All Vibes" link at top
4. **Product outfit page** (`app/(public)/product/[slug]/page.tsx`) — Add "← Back" link at top
5. **Search page** (`app/(public)/search/page.tsx`) — Add "← All Vibes" link at top
6. **Saves page** (`app/(public)/saves/page.tsx`) — Add "← Continue Browsing" link at top
7. **Look page** (`app/(public)/look/[slug]/page.tsx`) — Already has breadcrumb, verify it works

### Design pattern
Consistent across all pages:
```html
<div className="px-4 sm:px-6 pt-4 pb-2">
  <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
    ← All Vibes
  </Link>
</div>
```

Use named context where possible:
- Vibe page: "← All Vibes"
- Brand page: "← All Vibes"
- Season page: "← All Vibes"
- Product page: "← Back"
- Search: "← All Vibes"
- Saves: "← Continue Browsing"

### Completion criteria
When ALL true, output `<promise>JBV-52 COMPLETE</promise>`:
- [ ] Vibe page has back link
- [ ] Brand page has back link
- [ ] Season page has back link
- [ ] Product page has back link
- [ ] Search page has back link
- [ ] Saves page has back link
- [ ] Look page breadcrumb verified
- [ ] TypeScript zero errors
