---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-57 COMPLETE"
started_at: "2026-04-03T18:27:00Z"
---

## JBV-57: Style Match v2 — Top 3 Archetypes, No Grading

File: `app/(public)/match/style-match.tsx`

### Changes

#### Screen 2 (Swipe):
- Remove vibe name from card overlay — just show display title
- After each swipe-right, auto-save the look to localStorage hearts via addGuestHeart("look", card.slug)
- Micro-reward: change from "You're gravitating toward [vibe]..." to something like "Nice eye!" or "Great pick!" — don't reveal the vibe yet
- Dispatch "hearts-changed" event after each auto-save so nav badge updates

#### Screen 3 (Reveal):
- Remove "X% Julia Match" score
- Change "YOUR STYLE DNA" to "Your Style Has 3 Sides"
- Show top 3 vibes as cards (not bars with percentages)
- Each card: vibe name + tagline
- No percentages visible
- Email gate copy: "You just built your style profile. Save it + see all your matched looks."
- CTA: "Save My Style" (not "Unlock")

#### Screen 4 (Profile):
- Remove similarity percentage
- Show top 3 archetypes as featured cards with descriptions
- "Your Matched Looks" grid stays
- "Shop Your Top Vibe" CTA stays
- Add: "You saved [N] looks to your favorites" message

#### Screen 5 (Share Card):
- Remove "70% Match" → replace with the 3 archetype names stacked
- "My Style: [Vibe 1] + [Vibe 2] + [Vibe 3]"
- Still aspirational and shareable

#### Hook screen:
- Change subtitle from "We'll build your Style DNA" to "Discover which of Julia's aesthetics are yours"

### Completion criteria
When ALL true, output `<promise>JBV-57 COMPLETE</promise>`:
- [ ] Swipe cards don't show vibe names
- [ ] Liked looks auto-saved to hearts (localStorage)
- [ ] No percentage/grade anywhere
- [ ] Results show top 3 archetypes
- [ ] Share card shows 3 archetype names
- [ ] Hook copy updated
- [ ] TypeScript zero errors
