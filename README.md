# RootRealm — MVP

A lightweight RPG-inspired progression web app for developers.

Sign in with GitHub, complete quests to earn XP and coins, level up, and spend
coins on avatar-border cosmetics.

## Stack

- Next.js (App Router) + TypeScript
- Supabase Postgres + Auth (GitHub OAuth)
- Tailwind CSS
- Vitest (unit) + Playwright (e2e)

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + site URL
# apply supabase/migrations and supabase/seed.sql (see docs/SETUP.md)
npm run dev
```

See **[docs/SETUP.md](docs/SETUP.md)** for full setup, OAuth configuration,
migrations, checks, and deployment.

## Sections

- **Profile** — avatar with equipped border, level, total XP, XP progress, coins, quests completed.
- **Shop** — browse avatar borders, purchase, equip, unequip.
- **Quests** — Easy / Medium / Hard quests with XP + coin rewards and completion state.

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

The agreed requirements live in [docs/MVP_SPEC.md](docs/MVP_SPEC.md).
