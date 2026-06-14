# Fairway Ledger — Issues & Backlog

Known issues, deferred work, and current limitations. Most important near the top.
Update as things change — move fixed items down to **Resolved**, or delete them.

---

## Open

### Build stamp can white-screen the app if its value is missing
- **What:** The footer reads `__BUILD_SHA__` / `__BUILD_TIME__`, which are injected by
  `vite.config.js` at build time. If that value is ever absent, the reference is
  undefined and the **entire app renders blank**, not just the footer.
- **Seen:** 2026-06-14 — `App.jsx` deployed a few minutes before `vite.config.js`;
  the live site was white during the gap and healed once `vite.config.js` deployed.
- **Fix (one file):** guard the reference in `App.jsx`, e.g.
  `typeof __BUILD_SHA__ === "undefined" ? "dev" : __BUILD_SHA__`, so a missing value
  shows a fallback instead of crashing.
- **Workaround until fixed:** when a change touches both `App.jsx` and `vite.config.js`,
  commit `vite.config.js` (the provider) **first**, then `App.jsx` (the consumer).
- Severity: low likelihood, high impact.

### Auth is not enforced — the site is public
- **What:** The live site is open to anyone who has the URL. Fine for testing,
  not for real league data (names + scores).
- **Fix:** Turn on **Cloudflare Access** (Zero Trust → Access → self-hosted app over
  the Pages URL, with an email policy). The Functions already read the
  `Cf-Access-Authenticated-User-Email` header.
- **Do this before sharing the URL with the league.**

### No per-player login
- **What:** Anyone can post scores for any player; there's no identity, so John
  enters everyone's scores.
- **Fix:** Map the Access email → golfer (`golfers.email`) and gate writes so each
  golfer posts only their own scores. Turns this into a true multi-user product.
- **Depends on:** Auth enforced (above).

---

## Known limitations (by design, for now)

- **9-hole rounds** are not supported — the 2024 WHS expected-score conversion isn't
  implemented. 18-hole rounds only.
- **Playing Conditions Calculation (PCC)** is a manual field (−1…+3), not auto-computed.
  The real calculation needs the full field's scores for that day, which a self-hosted
  tool doesn't have.
- **Exceptional Score Reduction (ESR)** is not implemented — a differential 7.0+ below
  the Index does not retroactively adjust the scoring record.
- **Course-data coverage** depends on golfcourseapi.com; smaller or local courses may be
  missing or have incomplete tees. Manual entry is the fallback.

---

## Upgrade ideas (bigger bets)

### Full multi-user / multi-tenant version
- **What:** Turn the single shared dataset into a real multi-user app:
  - **Public self-signup** — anyone can create and manage their own account.
  - **Own your data** — each user edits only their own players/scores.
  - **Private by default** — a user's entries are invisible to others unless they
    tick a checkbox to let others **view** (never edit) them.
  - **Leagues as a tenancy layer** — create/join a league; members see that league's
    data **and only that league's**. Join via invite/code; admin vs member roles.
  - Visibility model becomes layered: a row is visible if it's **mine**, OR
    **opted-shared**, OR **in a league I belong to**. That overlap is the tricky part.
- **Effort:** A real step up — several× the current build. Cost concentrates in
  **(a) authentication** and **(b) the layered visibility/authorization logic**;
  the **league = multi-tenancy** piece is the biggest single chunk. Privacy bugs here
  are the worst kind (wrong query → someone sees data they shouldn't), so this carries
  a real testing/correctness burden.
- **Carries over unchanged:** the WHS engine (`whs.js`), the React shell, the deploy
  pipeline, and the git workflow. **Gets rebuilt:** the data model and the **entire API
  layer** (now identity- and permission-aware), plus new signup / login / account /
  league-management screens.
- **The fork to decide first (it's not a feature — it's where auth + data live):**
  - **Stay Cloudflare-native (D1):** hand-write all auth + permission logic. $0 forever
    at this scale (no inactivity pause; Access free ≤50 users; D1 free limits are huge),
    but you build and own the security yourself.
  - **Move to Supabase:** built-in Auth + Row-Level Security enforce "own + shared +
    same-league" at the database — which is exactly the hardest, most privacy-sensitive
    part. ~$25/mo Pro to stay always-on + backed up (free tier pauses after 7 days idle
    and has no backups). Storage/DB volume never drives the bill either way — golf data
    is tiny.
  - **Leaning:** don't hand-roll auth. Use a managed provider (Supabase Auth, or a
    dedicated auth service in front of D1). The $25/mo mostly buys back engineering time
    on the riskiest code.
- **Relationship to existing items:** the two Open auth items above
  ("Auth is not enforced" → "No per-player login") are the first two rungs of this same
  ladder. This entry is the full climb.
- **Status:** idea only — no build started, no decision made. Revisit when ready.

---

## Housekeeping

- The `ship` script in the repo root is left over from the abandoned local-git workflow
  and is now unused — safe to delete whenever.

---

## Resolved

- _(none yet)_
