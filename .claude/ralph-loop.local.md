---
active: true
iteration: 1
max_iterations: 15
completion_promise: "JBV-56 COMPLETE"
started_at: "2026-04-03T18:13:00Z"
---

## JBV-56: Sign-Up Flow Polish

### 1. Inline email in heart toast
File: `components/heart-prompt-toast.tsx`
- Add email input + "Save My Hearts" button directly in the toast
- No page navigation — capture email right there
- On submit: call createAccountFromEmail, clear guest hearts, dismiss toast
- Show brief "Saved!" confirmation in the toast before dismissing

### 2. Heart badge initialization
File: `components/heart-nav-badge.tsx`
- Initialize count from localStorage immediately: `useState(() => getGuestHeartCount())`
- Instead of starting at 0 and waiting for useEffect

### 3. Toast auto-dismiss 20s
File: `components/heart-prompt-toast.tsx`
- Change setTimeout from 10000 to 20000

### 4. Style Match Klaviyo sync
File: `app/(public)/match/style-match.tsx`
- After email capture in Style Match, call syncProfileToKlaviyo with:
  - stylematch_top_vibe
  - stylematch_similarity
  - stylematch_liked_looks

### 5. Magic link prep (wire up, needs RESEND_API_KEY to activate)
- Install resend: `npm install resend`
- Add Email provider to auth.ts config
- Create email template for magic link
- Guarded by RESEND_API_KEY existence — falls back to password if not set

### Completion criteria
When ALL true, output `<promise>JBV-56 COMPLETE</promise>`:
- [ ] Toast has inline email input
- [ ] Heart badge initializes immediately
- [ ] Toast auto-dismiss is 20s
- [ ] Style Match syncs to Klaviyo
- [ ] TypeScript zero errors
