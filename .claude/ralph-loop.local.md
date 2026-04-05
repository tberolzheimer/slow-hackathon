---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-74 COMPLETE"
started_at: "2026-04-05T03:35:00Z"
---

## JBV-74: Fix Multi-Word Brand Parsing

File: `lib/ingest/parse-post-html.ts`

### Problem
The KNOWN_BRANDS list is missing many multi-word brands. "Sea NY" gets split as brand="Sea", item="NY Dress".

### Fix
1. Query DB for all distinct brands that are suspicious (1-3 letter words)
2. Expand KNOWN_BRANDS list with missing multi-word brands
3. The re-ingest (JBV-59) will reparse all products with the updated list

### Completion criteria
When ALL true, output `<promise>JBV-74 COMPLETE</promise>`:
- [ ] KNOWN_BRANDS list expanded with all multi-word brands found in the data
- [ ] Suspicious short brands identified and mapped correctly
- [ ] TypeScript zero errors
