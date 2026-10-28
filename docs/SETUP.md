# RootRealm MVP — Setup Guide

## Prerequisites

- Node.js 18.17+ (or 20+)
- npm
- A Supabase project (free tier is fine)
- A GitHub OAuth app
- Supabase CLI (for migrations and the seed)

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

The app requests only identity scopes: `read:user user:email`. It deliberately
does **not** request `repo` or `public_repo`. Public commit and merged-PR activity
is read through the GitHub Search API without repository scopes. Private
repository activity is out of scope for this version.

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

# Required for GitHub activity sync. Base64-encoded 32-byte key.
GITHUB_TOKEN_ENCRYPTION_KEY=<generate-below>

# Optional. Defaults to 10 (10 × 100 = the GitHub Search API 1,000-result cap).
GITHUB_SYNC_MAX_PAGES=10
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> `SUPABASE_SERVICE_ROLE_KEY` and `GITHUB_TOKEN_ENCRYPTION_KEY` are server-only.
> The service role is used for profile bootstrap and encrypted token storage.
> The encryption key never leaves the server.

## 5. Apply migrations and seed data

Link the Supabase CLI to your project, then push the schema and data migrations:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

`db push` applies:

- `001_initial_schema.sql` — profiles, quests/completions, cosmetics.
- `002_activity.sql` — activity tables, RLS, encrypted token storage, and the
  SQL-authoritative `record_activity_events` / `evaluate_activity_quests` functions.
- `003_activity_quests.sql` — the nine all-time activity quests (idempotent).
- `004_reconcile_legacy_completions.sql` — removes pre-activity manual
  completions, subtracts their rewards, and clears derived progress. The next
  sync rebuilds progress from real GitHub activity.

Apply the seed (cosmetics and a re-runnable copy of the quest catalog). Run
`supabase/seed.sql` in the Supabase SQL editor, or:

```bash
supabase db query --linked -f supabase/seed.sql
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

Open http://localhost:3000 and sign in with GitHub. After signing in, open
**Quests** and press **Sync GitHub** to import public commits and merged PRs.

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

## Activity sync behavior

- **User-triggered and on-load sync.** There are no webhooks, background workers, or
  scheduled jobs. The app syncs automatically when an authenticated page loads,
  at most once every 10 minutes. The **Sync GitHub** button forces an immediate
  sync regardless of the cooldown.
- **Public activity only.** The GitHub Search API is queried for commits authored
  by the user and merged PRs authored by the user.
- **Bots and merges.** Bot-authored activity is dropped. Merge commits are stored
  but excluded from commit quests. Merged PRs are counted separately.
- **All-time milestones.** Seeded quests use `window_days = NULL`, so milestones
  count the user's entire public history. The schema supports windowed quests.
- **Incremental sync.** After the first sync, the next query starts one day before
  the last successful sync to absorb late-arriving activity. Events are deduplicated
  by `(user_id, activity_type, external_id)`.
- **Search cap.** GitHub Search returns at most 1,000 results per query. With
  `GITHUB_SYNC_MAX_PAGES=10` and 100 results per page, the app fetches exactly that
  cap. Hitting the cap marks the affected history incomplete; progress can be
  `indeterminate`, but it never falsely completes a quest.
- **Rate limits.** GitHub Search allows 30 authenticated requests per minute. On a
  rate limit the UI shows the reset time in the user's local timezone. There are no
  automatic retries; the user can try again later.
- **Truncated history.** `quest_progress.status = 'indeterminate'` is used when a
  milestone cannot be confirmed because history is incomplete. It is never treated
  as completed.

## Data model & integrity

- `profiles` — one row per auth user; XP, coins, equipped border.
- `quests` / `quest_completions` — one-time quests; unique `(user_id, quest_id)`.
- `cosmetics` / `user_cosmetics` — shop catalog and ownership; unique
  `(user_id, cosmetic_id)`.
- `github_connections` — public GitHub identity, sync status, and history flags.
- `github_oauth_tokens` — AES-256-GCM ciphertext; no client grants or RLS policies.
- `github_activity_events` — normalized, deduplicated commits and merged PRs.
- `quest_progress` — per-user progress snapshot (`in_progress`, `completed`,
  `indeterminate`).
- `github_sync_runs` — one audit row per user-triggered sync.

Rewards are evaluated in SQL. `record_activity_events` and
`evaluate_activity_quests` are `SECURITY DEFINER`, derive the acting user from
`auth.uid()`, and are callable only by authenticated users. `evaluate_activity_quests`
recomputes progress and awards each quest at most once using the unique
`(user_id, quest_id)` constraint. The manual `complete_quest` function has been
removed. Shop purchases and equips still use `purchase_cosmetic` and
`equip_cosmetic`.

Clients can read their own rows via RLS but cannot write XP, coins, completions,
ownership, activity, progress, or equip state directly.

## Deployment

Deploy to Vercel (or any Node host). Set the same environment variables in the
host dashboard, including `GITHUB_TOKEN_ENCRYPTION_KEY` (use a different key per
environment), and add the production callback URL
`https://<your-domain>/auth/callback` to Supabase redirect URLs. Run
`supabase db push` against the production project before deploying.
