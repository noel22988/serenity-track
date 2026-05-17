# Serenity Track

A calm, mobile-first weight & wellness companion built for someone undergoing medical weight treatment. Deliberately gentle — no calorie deficits, no shame language, no red warnings.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Recharts**.

## Features

- Email/password auth (Supabase Auth)
- Daily weight logging (kg/lb), with sparkline and full trend chart
- Food logging — searchable seeded database (~60 foods), favorites, custom foods, multi-add
- Exercise logging (informational only, no calorie subtraction)
- Daily wellness — mood, energy, symptoms (treatment-aware), journal, hydration
- Today dashboard with one-tap mood and hydration
- Trends with 7/30/90-day weight chart and weekly summary
- CSV export of all your data
- Dark mode, mobile-first responsive, mature accessible design
- Row-level security on every table — your data is yours

## Setup (≈10 minutes)

### 1. Supabase

Create a new Supabase project at https://supabase.com.

In the SQL Editor, open `supabase/migrations/0001_init.sql` from this repo, paste the entire contents, and run. This creates:
- Tables: `profiles`, `weight_entries`, `foods`, `food_logs`, `exercise_logs`, `wellness_entries`
- Row-level-security policies (per-user isolation)
- A trigger that auto-creates a `profiles` row on signup
- ~60 seed foods

Under **Authentication → Providers**, leave Email enabled. (If you want email-confirmation off during development, toggle "Confirm email" off — Authentication → Sign In / Up.)

Grab your project URL and anon key from **Project Settings → API**.

### 2. Local dev

```bash
cp .env.example .env.local
# Edit .env.local — paste your Supabase URL and anon key

npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Create an account, then you're in.

### 3. Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create serenity-track --private --source=. --push
```

Then on https://vercel.com, click **Add New → Project**, import the repo, and add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Deploy.

Finally, back in Supabase under **Authentication → URL Configuration**:
- **Site URL**: your Vercel domain (e.g. `https://serenity-track.vercel.app`)
- **Redirect URLs**: add `https://serenity-track.vercel.app/auth/callback`

## Project structure

```
app/
├── (auth)/login & signup     # Public auth pages
├── (app)/                    # Authenticated app shell with bottom tab bar
│   ├── page.tsx              # Today (dashboard)
│   ├── trends/
│   ├── wellness/
│   ├── settings/
│   └── log/
│       ├── weight/
│       ├── food/
│       ├── exercise/
│       └── mood/
├── auth/callback             # Supabase OAuth/email-confirm callback
├── globals.css
└── layout.tsx

components/
├── ui/                       # Card, Button (reusable primitives)
├── cards/                    # Dashboard cards
├── tab-bar.tsx               # Bottom nav
└── theme-provider.tsx

lib/
├── supabase/                 # Browser, server, middleware clients
├── types.ts
└── utils.ts

supabase/migrations/          # SQL migrations
```

## Design principles in the code

- **No red anywhere** — `--warn` is soft amber. Deltas are shown but never highlighted negatively.
- **Sage palette + warm cream surface** — calming, dignified, not "medical".
- **No calorie deficit math** — exercise is logged but never subtracted from food. Both are informational.
- **Treatment-aware symptom list** — includes "injection-site reaction", "nausea", "fatigue" (relevant to GLP-1 and similar treatments).
- **Compassionate copy** — "You showed up today" instead of "Streak: 1". Empty states are invitations, not failures.
- **Single-page logging flows** — fewest taps possible. Mood is one tap on the dashboard.

## Adding push notifications later

This MVP uses local browser scheduling only (none implemented yet). For real push:
1. Add a `reminders` table (schema provided in the spec doc)
2. Use the Web Push API or wrap with a thin React Native shell later

## License

MIT — yours to adapt.
