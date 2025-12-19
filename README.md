<<<<<<< HEAD
# FlexLog
Calorie/Fitness Tracker
=======
# FlexLog (Scaffold)

Dark-theme calorie tracker with flexible **Meal Groups** + a workout split tracker.
Built as a **free-stack** scaffold: Next.js App Router + Tailwind + Framer Motion + optional Supabase.

## Quick start

```bash
npm i
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Features included in this scaffold

- Onboarding: goal + TDEE + macro targets (Mifflin-St Jeor).
- Daily log with month calendar and unlimited “Meal Groups” (animated expand/collapse).
- Food search:
  - `/api/foods/search?q=...` → USDA FoodData Central (generic foods)
  - `/api/foods/barcode?code=...` → Open Food Facts (packaged foods)
  - Manual custom food fallback
- Workout split page:
  - Create workout days (optional weekday mapping)
  - Add exercises with sets/reps and optional weight tracking + per-date history
- Guest mode (default): stored in localStorage.
- Supabase tables + RLS policy SQL included in `supabase/migrations/0001_init.sql` (optional to enable later).

## Supabase setup (optional)

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/0001_init.sql` (SQL editor).
3. Add env vars to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used only for optional caching)

> This scaffold currently runs fully in guest mode even without Supabase.

## Supabase guest snapshots + auth

If `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are present, the app exposes a simple `/auth` page where users can create an account or sign in (email + password). Add `SUPABASE_SERVICE_ROLE_KEY` as well to enable the automatic guest snapshot backup (`guest_snapshots` table). Run the SQL in `supabase/migrations/0001_init.sql`, then watch Supabase collect both auth users (via Supabase Auth) and anonymous snapshots whenever you edit meals or workouts. Data is still read from localStorage for now, but each change is mirrored to Supabase so you can later sync per-user data.

## Deploy (Vercel free tier)

- Push to GitHub
- Import into Vercel
- Add env vars (same as above)

## Notes

- External API calls are made server-side via Next.js route handlers to avoid exposing keys.
- If USDA search returns 0 results, make sure `USDA_FDC_API_KEY` is set in `.env.local` and restart `npm run dev`.
- Barcode scanning supports:
  - Manual UPC/EAN entry (always)
  - Camera + photo scan using the browser `BarcodeDetector` API when available (works best in Chromium browsers, and on HTTPS/localhost).
- If external food APIs fail or keys are missing, the UI still supports manual foods.
>>>>>>> b0e00f2c (Initial commit)
