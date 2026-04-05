---
active: true
iteration: 2
max_iterations: 20
completion_promise: "JBV-70 COMPLETE"
started_at: "2026-04-05T00:42:00Z"
---

## JBV-70: QA Pass — Designer's Eye Audit

Go through every page, fix issues as found. Start with the style pages product relevance issue.

### Priority fix: Style page products should match the page topic
File: `app/(public)/style/[slug]/page.tsx`

Currently the product grid shows ALL products from matching posts. But if the page is about "spring wedding guest dresses", it should only show dress products, not shoes/bags/jewelry from those same outfits.

Fix: if `filters.garmentSearch` exists, also filter products by checking if `rawText` or `itemName` contains the search term.

### Then audit each page type for:
- Spacing/padding consistency
- Text hierarchy
- Copy consistency (VibeShop everywhere)
- Empty states
- Link targets (affiliate = new tab)
- Heart visibility
- Mobile responsive issues
- Meta titles

### Completion criteria
When ALL true, output `<promise>JBV-70 COMPLETE</promise>`:
- [ ] Style page products filtered by relevance (dresses page shows dresses only)
- [ ] All pages audited for visual/UX issues
- [ ] Issues found are fixed and committed
- [ ] TypeScript zero errors
