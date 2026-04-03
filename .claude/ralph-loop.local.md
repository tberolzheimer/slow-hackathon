---
active: true
iteration: 1
max_iterations: 10
completion_promise: "SWIPE CARD FIXED"
started_at: "2026-04-03T17:47:00Z"
---

## Fix: Style Match swipe card is full-width, cuts off Julia's head

### The bug
The swipe card image stretches full viewport width and uses object-cover which crops the photo. Julia's head is cut off. The card should be contained within a phone-sized frame so you see the full outfit.

### Fix
File: `app/(public)/match/style-match.tsx`

In Screen 2 (swipe), the card container uses `flex-1` which makes it fill the entire viewport height minus header. The image uses `fill` + `object-cover` which crops.

Change to:
- Constrain the card to `max-w-sm mx-auto` (phone-sized, centered)
- Use `aspect-[3/4]` for portrait orientation
- Keep `object-cover` but with the constrained container it won't over-crop
- The card should look like a phone screen / dating app card, not a full-bleed banner

### Completion criteria
When ALL true, output `<promise>SWIPE CARD FIXED</promise>`:
- [ ] Swipe card is contained (not full viewport width)
- [ ] Full outfit visible including head
- [ ] Card has portrait aspect ratio
- [ ] Buttons still visible below card
- [ ] Works on mobile and desktop
- [ ] TypeScript zero errors
