---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-32 COMPLETE"
started_at: "2026-04-03T07:37:00Z"
---

## JBV-32: Email-First Sign-Up — Hearts as Email Subscriber Driver

You are building VibéShop. Read `CLAUDE.md`. The heart system is already built (components/heart-button.tsx, lib/hearts/guest-hearts.ts, lib/hooks/use-heart.ts, lib/actions/hearts.ts).

### Build 3 things:

#### 1. Heart count badge in header nav
**File:** `components/heart-nav-badge.tsx` ("use client")

- Wraps the Heart icon in the header with a count badge
- For guests: reads count from localStorage via `getGuestHeartCount()`
- For logged-in: reads from DB (use a lightweight approach — could use the hook or a simple fetch)
- Shows count as a small red/primary circle with number, positioned top-right of the heart icon
- Only shows badge if count > 0
- Updates in real-time (poll localStorage every 2s for guests, or listen for storage events)

**Wire into:** `app/(public)/layout.tsx` — replace the static Heart icon link with this component

#### 2. Inline email capture on /saves page
**File:** Update `app/(public)/saves/saves-content.tsx`

Replace the current guest prompt section with a proper email capture:
- One email input field + "Save My Hearts" button
- Copy: "Enter your email to save these across all your devices."
- On submit: call a new server action `createAccountFromEmail(email, guestHearts[])`
- The server action creates a User with email (generate a random password), merges hearts, returns success
- Show confirmation: "Done! Your N saved items are now synced."
- Clear localStorage hearts after merge

**New server action:** `lib/actions/auth.ts` — add `createAccountFromEmail(email: string, hearts: GuestHeart[])`
- Creates User with email + random bcrypt password
- Calls mergeGuestHearts internally
- Signs the user in via signIn("credentials") or returns success for client-side redirect

#### 3. Return-visit banner
**File:** `components/return-visit-banner.tsx` ("use client")

- Shows for guests who have 1+ hearts from a previous visit (oldest heart > 1 hour old)
- Slides down from below the header
- Copy: "Welcome back! You have [N] saved looks. Sign up to keep them forever."
- CTA: "Save My Hearts" → /saves (where the email capture is)
- Dismiss X, stores dismissal in localStorage, don't show for 7 days
- NOT a modal, NOT blocking

**Wire into:** `app/(public)/layout.tsx` — add below header, above main

### Completion criteria
When ALL of the following are true, output `<promise>JBV-32 COMPLETE</promise>`:
- [ ] Heart count badge shows in header nav with correct count
- [ ] Badge updates when user hearts/unhearts items
- [ ] /saves page has inline email input for guests
- [ ] Email capture creates account + merges hearts
- [ ] Return-visit banner shows for returning guests with hearts
- [ ] Banner dismisses and respects 7-day cooldown
- [ ] All CTAs say "Save My Hearts" not "Sign Up"
- [ ] TypeScript compiles with zero errors

Do NOT output the promise tag until every item is verified.
