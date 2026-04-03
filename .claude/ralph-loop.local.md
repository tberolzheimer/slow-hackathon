---
active: true
iteration: 1
max_iterations: 10
completion_promise: "JBV-54 COMPLETE"
started_at: "2026-04-03T15:07:00Z"
---

## JBV-54: Re-generate vibe names

Write a script that renames each existing vibe by re-prompting Claude with better instructions. Don't re-cluster — just rename.

### Script: `scripts/rename-vibes.ts`

For each vibe:
1. Load the vibe + its top keywords, mood, season distribution
2. Send to Claude with this prompt: "Name this vibe in 2-3 words. Think like a playlist name or a photo album title, not a motivational poster. Simple. Visual. A moment or place, not an adjective + noun. Examples: 'Endless Summer', 'Sunday Garden', 'After Dark', 'Charleston Morning', 'Riviera Lunch'. AVOID: 'golden', 'wanderer', 'confidence', 'muse', 'radiant', 'energy'. Do NOT repeat any of these existing names: [list]. Return ONLY the name, nothing else."
3. Also generate a new tagline with similar tone
4. Update the vibe name, slug, and tagline

### Completion criteria
When ALL true, output `<promise>JBV-54 COMPLETE</promise>`:
- [ ] All 12 vibes renamed
- [ ] No collision suffixes
- [ ] No repeated words across vibes
- [ ] Names feel simple and visual like "Endless Summer"
- [ ] Slugs updated to match new names
- [ ] TypeScript zero errors
