---
active: true
iteration: 1
max_iterations: 10
completion_promise: "JBV-47 COMPLETE"
started_at: "2026-04-03T14:15:00Z"
---

## JBV-47: Vibe Page — Filter/Sort by Recency

Add a sort toggle on the vibe page outfit grid: "Newest" vs "Best Match".

### What to build

File: `app/(public)/vibe/[slug]/outfit-grid.tsx` (already a client component)

Add two pill buttons above the outfit grid:
- "Newest" — sorts by post date descending
- "Best Match" — sorts by confidence score (current default)

The OutfitGrid already receives `posts` as a prop. Need to also pass the post dates so client-side sorting works.

1. Update the Post interface in outfit-grid.tsx to include `date: string`
2. Update the vibe page to pass `date` in the post data
3. Add sort pills UI at the top of OutfitGrid
4. Default to "Newest" (people want to see what's new)

### Completion criteria
When ALL true, output `<promise>JBV-47 COMPLETE</promise>`:
- [ ] Sort toggle visible: "Newest" / "Best Match"
- [ ] "Newest" sorts by date descending
- [ ] "Best Match" sorts by original order (confidence)
- [ ] Default is "Newest"
- [ ] TypeScript zero errors
