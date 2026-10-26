# RootRealm MVP — Setup Guide

## Prerequisites

- Node.js 18.17+ (or 20+)
- npm
- A Supabase project (free tier is fine)
- A GitHub OAuth app
- Supabase CLI (for running migrations locally or against your project)

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Create a project at https://supabase.com.
2. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)

## 3. Configure GitHub OAuth

1. Create a GitHub OAuth App (Settings → Developer settings → OAuth Apps).
2. Set the **Authorization callback URL** to your Supabase callback:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase, go to **Authentication → Providers → GitHub**, enable it, and paste
   the GitHub client ID and secret.
4. In **Authentication → URL Configuration**, add your app URLs:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

## 4. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` is used only server-side for profile bootstrap.
> It is never imported into client code (guarded by `server-only`).

## 5. Apply migrations and seed data

Link the Supabase CLI to your project, then push the schema:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Apply the seed data (sample quests and cosmetics). You can run `supabase/seed.sql`
in the Supabase SQL editor, or:

```bash
supabase db execute --file supabase/seed.sql
```

If you prefer a fully local stack:

```bash
supabase start
supabase db reset   # applies migrations + seed.sql
```

## 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000 and sign in with GitHub.

## 7. Checks

```bash
npm run type-check   # TypeScript
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run build        # Production build
npm run e2e          # Playwright (unauthenticated journeys run without Supabase env)
```

Authenticated Playwright journeys require a configured Supabase project and a
test GitHub account; run them against a deployed/preview environment using
`PLAYWRIGHT_BASE_URL`.

## Data model & integrity

- `profiles` — one row per auth user; XP, coins, equipped border.
- `quests` / `quest_completions` — one-time quests; unique `(user_id, quest_id)`.
- `cosmetics` / `user_cosmetics` — shop catalog and ownership; unique `(user_id, cosmetic_id)`.

Rewards and purchases go through `SECURITY DEFINER` Postgres functions
(`complete_quest`, `purchase_cosmetic`, `equip_cosmetic`) that derive the acting
user from `auth.uid()`. Clients can read their own rows via RLS but cannot write
XP, coins, completion, ownership, or equip state directly.

## Deployment

Deploy to Vercel (or any Node host). Set the same environment variables in the
host dashboard, and add the production callback URL
`https://<your-domain>/auth/callback` to Supabase redirect URLs.
