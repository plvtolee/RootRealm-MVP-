# RootRealm — MVP

A lightweight RPG-inspired progression web app for developers.

Sign in with GitHub, sync your public activity, complete real coding milestones to
earn XP and coins, level up, and spend coins on avatar-border cosmetics.

## Stack

- Next.js (App Router) + TypeScript
- Supabase Postgres + Auth (GitHub OAuth)
- Tailwind CSS
- Vitest (unit) + Playwright (e2e)

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase, site URL, and encryption key
# apply supabase/migrations and supabase/seed.sql (see docs/SETUP.md)
npm run dev
```

See **[docs/SETUP.md](docs/SETUP.md)** for full setup, OAuth configuration,
migrations, activity-sync behavior, checks, and deployment.

## Sections

- **Profile** — avatar with equipped border, level, total XP, XP progress, coins,
  quests completed, and GitHub sync status.
- **Shop** — browse avatar borders, purchase, equip, unequip.
- **Quests** — activity-driven milestones with progress, XP + coin rewards, and
  an explicit **Sync GitHub** action.

## How quests work

Quests are evaluated from real public GitHub activity, not manual completion:

- Commits authored by the signed-in user count toward commit milestones.
- Merged pull requests authored by the signed-in user count as a separate activity.
- Bot activity is ignored; merge commits are excluded from commit quests.
- Seeded quests are all-time milestones. The schema supports windowed quests.
- Evaluation is SQL-authoritative and awards each quest exactly once.
- If GitHub's 1,000-result search cap truncates history, affected quests show
  `indeterminate` instead of falsely completing.

Only identity scopes (`read:user user:email`) are requested. Private repository
activity is out of scope for this version.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests |

## Product spec

The agreed requirements live in [docs/MVP_SPEC.md](docs/MVP_SPEC.md). The activity
integration design is in [docs/GITHUB_ACTIVITY_PLAN.md](docs/GITHUB_ACTIVITY_PLAN.md).
