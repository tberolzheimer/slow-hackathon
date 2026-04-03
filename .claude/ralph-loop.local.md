---
active: true
iteration: 1
max_iterations: 25
completion_promise: "JBV-55 COMPLETE"
started_at: "2026-04-03T17:23:00Z"
---

## JBV-55: Style Match — Tinder-Style Swipe Quiz

Build the full Style Match experience at /match. This is a big feature — 5 screens, all client-side.

### Architecture
- `app/(public)/match/page.tsx` — server component loads 20 curated outfits, passes to client
- `app/(public)/match/style-match.tsx` — main client component managing all 5 screens
- Add `/match` to publicRoutes in proxy.ts

### Screen 1: Hook
- Full-bleed background image (use a great outfit photo)
- "How much of Julia's style is in your closet?"
- "Swipe through 20 of her looks. We'll build your Style DNA."
- [Start Swiping] button
- Clean, minimal, aspirational

### Screen 2: Swipe Cards
- Full-screen card stack with outfit photos
- Heart (✓) and X buttons below the card (simpler than swipe gesture for v1)
- Each card: outfit image fills the card, display title + vibe name at bottom with gradient
- Progress: "7 of 20" at top
- After card 5: show toast "You're gravitating toward [top vibe so far]..."
- Track: which cards were liked, which vibe each card belongs to

Card selection algorithm (in server component):
```
For each of 12 vibes, pick 2 random outfits with good images
Shuffle the 24 cards, take first 20
```

### Screen 3: Style DNA Teaser
After all 20 swipes, calculate:
- Count likes per vibe → percentages
- Top vibe = highest percentage
- Julia similarity = (total likes / 20) * 100
- Show top vibe with progress bar
- Show similarity score
- "Unlock Your Full Profile" → email gate

### Screen 4: Full Profile (after email)
- All vibes with bar chart
- Grid of liked looks (tappable links to /look/[slug])
- "Shop Your Vibe" link to /vibe/[top-vibe-slug]

### Screen 5: Share Card
- Generate a canvas-based card image
- 1080x1920 (Instagram Story size)
- Background: warm ivory (#FAF8F5)
- Text: "[Name]'s Style DNA" / "70% Match with Julia" / "Top Vibe: Endless Vacation"
- "Find yours → vibeshop.juliaberolzheimer.com/match"
- Download button + share buttons

### Klaviyo on email capture
Use the existing syncProfileToKlaviyo function with additional properties:
- stylematch_top_vibe
- stylematch_similarity
- stylematch_liked_looks

### Completion criteria
When ALL true, output `<promise>JBV-55 COMPLETE</promise>`:
- [ ] /match page loads with hook screen
- [ ] Start Swiping → shows card stack
- [ ] 20 cards with outfit photos, heart/X buttons
- [ ] Progress indicator
- [ ] Micro-reward after card 5
- [ ] Style DNA calculation works
- [ ] Teaser screen shows top vibe + similarity
- [ ] Email gate works
- [ ] Full profile shows vibe breakdown + liked looks grid
- [ ] Share card generates downloadable image
- [ ] /match in publicRoutes
- [ ] TypeScript zero errors
