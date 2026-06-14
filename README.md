# Fairway Ledger

Unofficial **World Handicap System (WHS)** tracking for a golfer or a league —
a GHIN-style app you host yourself on Cloudflare.

> **Not an official handicap.** Only an Authorized Golf Association (in the U.S.,
> your regional AGA under the USGA) can issue an *official* Handicap Index. This app
> computes a handicap using the WHS methodology for personal or league use; it cannot
> post to a USGA record or carry to other clubs.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite (static, served by Pages) |
| API | Cloudflare Pages Functions (`functions/api/[[path]].js`) |
| Database | Cloudflare D1 (serverless SQLite) |
| Auth (optional) | Cloudflare Access |
| Calc engine | `src/lib/whs.js` — pure, shared by browser and Worker |

Push to GitHub → Cloudflare Pages auto-builds and deploys on every commit.

---

## Deploy

You'll need a GitHub account and a Cloudflare account (both free tiers are fine).
The steps that touch your accounts are marked **[you]**.

### 1. Put the code on GitHub **[you]**
```bash
cd fairway-ledger
git init && git add . && git commit -m "Fairway Ledger v0.1"
# create an empty repo at github.com/<you>/fairway-ledger, then:
git remote add origin https://github.com/<you>/fairway-ledger.git
git push -u origin main
```

### 2. Create the D1 database **[you]**
```bash
npx wrangler login            # opens a browser to authorize your Cloudflare account
npx wrangler d1 create fairway-ledger
```
Copy the printed `database_id` into **`wrangler.toml`** (replace `PASTE_DATABASE_ID_HERE`),
commit, and push.

### 3. Run the migration **[you]**
```bash
npm run db:remote             # creates the tables in your D1 database
```

### 4. Connect Cloudflare Pages to the repo **[you]**
In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
pick your `fairway-ledger` repo, and set:
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### 5. Bind D1 to the Pages project **[you]**
Pages project → **Settings → Functions → D1 database bindings** → add a binding with
**Variable name `DB`** pointing at `fairway-ledger`. Redeploy.

That's it — the site is live at `https://fairway-ledger.pages.dev`. Open it and click
**Load demo data** to verify the database round-trip.

---

## Local development

`vite dev` serves only the frontend (no API). To run the full stack locally with the
D1 binding, build first and run it through Wrangler:

```bash
npm install
npm run test            # verify the WHS engine
npm run db:local        # create local D1 tables
npm run build
npm run preview         # wrangler pages dev dist  → http://localhost:8788
```

---

## Turning on auth (Cloudflare Access)

A real multi-user setup gates the site behind login. Cloudflare Access does this without
any password handling in the app:

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add a self-hosted app**,
   pointing at your Pages URL, with an email policy (allow your league's addresses).
2. Access then injects a verified `Cf-Access-Authenticated-User-Email` header on every
   request. The API already reads it (`userEmail()` in `functions/api/[[path]].js`) and
   stamps it on posted scores as `posted_by`.
3. To *enforce* it, add a guard at the top of `onRequest` that rejects writes without an
   email, and map emails to golfers via the `golfers.email` column.

---

## WHS rules implemented

- **Score Differential** = (113 / Slope) × (Adjusted Gross − Course Rating − PCC)
- **Handicap Index** = best 8 of the last 20 differentials, with the sliding table +
  adjustment for fewer than 20 scores; ceiling of 54.0
- **Low Handicap Index** (trailing 365 days) with **soft cap** (increase over +3.0 halved)
  and **hard cap** (no increase beyond +5.0)
- **Net Double Bogey** per-hole cap (par + 2 + strokes received; par + 5 before an Index
  is established), applied automatically on hole-by-hole entry
- **Course Handicap** = Index × (Slope / 113) + (Rating − Par)
- **Playing Handicap** = Course Handicap × allowance%

### Documented v1 gaps (intentionally not built yet)
- **9-hole rounds** via the 2024 expected-score conversion (the curve isn't public)
- **Automatic PCC** (needs the full field's scores; exposed as a manual −1…+3 field)
- **Exceptional Score Reduction** (a differential 7.0+ below the Index retroactively
  adjusting the record)

---

## Project structure
```
fairway-ledger/
  index.html              Vite entry
  src/
    main.jsx              React mount
    App.jsx               UI (Players, Courses, Post Score, Leagues)
    lib/whs.js            WHS calculation engine (pure)
    lib/api.js            fetch client for /api
  functions/api/
    [[path]].js           Pages Functions router (state + CRUD on D1)
  migrations/
    0001_init.sql         D1 schema
  wrangler.toml           Pages + D1 config
  test/whs.test.mjs       engine sanity test
```
