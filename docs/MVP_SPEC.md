# RootRealm — MVP Product & Implementation Specification

## 1. Project Overview

Build **RootRealm**, a lightweight RPG-inspired progression web app for developers.

Users sign in using their GitHub accounts, complete quests to earn XP and coins, level up as they accumulate XP, and spend their coins on cosmetic items such as avatar borders.

The goal is to create a small, functional MVP with real backend logic and persistent data. This is not the full RootRealm vision.

**Priorities, in order:**
1. Correct and reliable functionality.
2. Simple, maintainable architecture.
3. Secure authentication and data handling.
4. A clean, usable interface.
5. Easy future expansion without unnecessary complexity.

## 2. Technology Stack

Use the following stack:

- **Framework:** Next.js with the App Router.
- **Language:** TypeScript.
- **Database:** Supabase Postgres.
- **Authentication:** Supabase Auth with GitHub OAuth.
- **Styling:** Tailwind CSS.
- **Testing:** Vitest for business logic and Playwright for essential end-to-end journeys.
- **Version control:** Git and GitHub.

Use current stable, compatible dependencies. Avoid adding libraries unless they solve a concrete requirement.

## 3. Core MVP Features

### A. GitHub Authentication

Users must be able to:

- Sign in using GitHub OAuth.
- Sign out securely.
- Maintain their authenticated session across page refreshes.
- Access their own profile, quests, coins, XP, and cosmetics.
- Have their account data associated with their authenticated Supabase user ID.

Create or retrieve the user's profile reliably after their first successful sign-in.

Never trust a user ID supplied by the browser to authorize access to account data.

**Scope limitation:** GitHub OAuth is for authentication in this MVP. Do not implement repository activity scraping, webhook integrations, commit analysis, or automated coding-activity verification.

### B. Quest System

Create a quest system with three difficulty tiers:

- Easy
- Medium
- Hard

Each quest must have:

- A unique ID.
- A title.
- A short description.
- A difficulty tier.
- An XP reward.
- A coin reward.
- An active or inactive status.

The Quests section must display available quests with their difficulty, rewards, and completion status.

Users should be able to complete an available quest through a clear action in the interface.

When a quest is successfully completed:

1. Validate the authenticated user.
2. Verify that the quest exists and is active.
3. Verify that the user has not already completed the quest.
4. Record the completion in the database.
5. Award the quest's configured XP and coins.
6. Update the user's progression and displayed balance.
7. Return a result that the interface can render.

All rewards must be calculated from trusted server-side data, not values submitted by the client.

Duplicate clicks, repeated requests, or concurrent requests must not grant duplicate rewards.

For the initial MVP, quests are one-time completions. Use a small set of seeded example quests with configurable rewards. Difficulty tiers should generally award more XP and coins as difficulty increases.

Do not add daily resets, weekly quests, streaks, timers, or complicated quest chains.

### C. XP and Level System

Users earn XP from completed quests.

Implement a simple, deterministic level system in a single reusable progression module.

For the initial implementation, use this configurable rule:

- Level 1 starts at 0 XP.
- Every 100 total XP advances the user by one level.
- The profile displays the current level, total XP, XP earned toward the next level, and a progress bar.

For example, a user with 150 total XP is Level 2 with 50/100 XP toward Level 3.

Calculate level and progress consistently from the user's total XP. Do not implement skill points, attributes, prestige, ranks, or complex progression curves.

Test boundary conditions such as 0 XP, exactly 100 XP, 199 XP, and 200 XP.

### D. Coins and Cosmetic Shop

Users earn coins by completing quests and spend them in the Shop.

The initial catalog should contain a small selection of avatar-border cosmetics, such as:

- Basic border.
- Silver border.
- Gold border.
- Neon border.

These are sample cosmetic concepts, not a requirement for elaborate artwork. Simple CSS-rendered borders are sufficient for the MVP.

Each cosmetic must have:

- A unique ID.
- A name.
- A short description.
- A price in coins.
- A visual preview.
- An active or inactive status.

Users must be able to:

- Browse the cosmetic catalog.
- View the price of each item.
- Purchase an item they do not own.
- See an insufficient-funds message when they cannot afford an item.
- See which items they already own.
- Equip a purchased avatar border.
- Unequip their current border and return to the default appearance.

Purchasing must deduct the correct price and grant ownership atomically. Users must not be able to purchase an item they cannot afford, pay twice because of duplicate requests, or equip an item they do not own.

An equipped cosmetic must be reflected in the Profile section.

Do not implement a real-money store, loot boxes, trading, rarity systems, cosmetic inventories beyond what is required, or payment integrations.

## 4. Application Interface

Build a simple, responsive interface with exactly three primary application sections.

### Section 1: Profile

Display:

- GitHub avatar and username.
- Equipped avatar border, or the default avatar when none is equipped.
- Current level.
- Total XP.
- XP progress toward the next level.
- Current coin balance.
- Total quests completed.

The profile must display actual persisted user data. Do not use hardcoded mock statistics in the authenticated application.

### Section 2: Shop

Display:

- Current coin balance.
- Available cosmetics.
- Cosmetic previews.
- Item names and prices.
- Ownership status.
- Purchase, equip, and unequip actions where appropriate.

After purchasing or equipping an item, update the interface from the successful backend result.

### Section 3: Quests

Display:

- Available quests.
- Difficulty tier.
- Short description.
- XP and coin rewards.
- Completion status.
- An appropriate complete or completed action.

Make quests easy to scan and distinguish Easy, Medium, and Hard visually.

### Shared Interface Requirements

- A simple navigation bar for Profile, Shop, and Quests.
- A login screen with a GitHub sign-in action.
- Clear loading, success, error, and empty states.
- Responsive layouts for desktop and mobile.
- Accessible button labels and form controls.
- Minimal, consistent styling.
- Functional buttons and real data connections.

Use a neutral, flexible visual style. Avoid elaborate RPG artwork, complex animations, oversized dashboards, excessive cards, or decorative elements that make the interface harder to maintain.

## 5. Database Design

Use Supabase Postgres as the persistent source of truth.

Start with the following entities, adapting their exact fields where necessary.

### `profiles`

- `id` — references the authenticated Supabase user.
- `username`.
- `avatar_url`.
- `total_xp`.
- `coins`.
- `equipped_cosmetic_id`.
- `created_at`.
- `updated_at`.

### `quests`

- `id`.
- `title`.
- `description`.
- `difficulty`.
- `xp_reward`.
- `coin_reward`.
- `is_active`.
- `created_at`.

### `quest_completions`

- `id`.
- `user_id`.
- `quest_id`.
- `xp_awarded`.
- `coins_awarded`.
- `completed_at`.

Enforce a database uniqueness constraint on `(user_id, quest_id)` for one-time quests.

### `cosmetics`

- `id`.
- `name`.
- `description`.
- `cosmetic_type`.
- `preview_value` or equivalent safe styling metadata.
- `price`.
- `is_active`.
- `created_at`.

### `user_cosmetics`

- `user_id`.
- `cosmetic_id`.
- `purchased_at`.

Enforce uniqueness on `(user_id, cosmetic_id)` to prevent duplicate ownership records.

The data model may be extended with a small coin-transaction ledger if needed to make reward and purchase records auditable.

Keep the schema minimal. Do not create a large generalized RPG database for future features that are not part of this MVP.

## 6. Security and Data Integrity

Security and reward integrity are required even in an MVP.

- Enable and configure Supabase Row Level Security.
- Ensure users can only read or modify their permitted account data.
- Never let clients directly choose their own XP balance, coin balance, quest rewards, or cosmetic ownership.
- Validate all inputs on the server.
- Use trusted database-side functions or equivalent transactional operations for quest completion and cosmetic purchases.
- Ensure quest rewards are issued exactly once.
- Ensure coin deductions and cosmetic ownership updates occur atomically.
- Ensure users cannot equip unowned cosmetics.
- Keep Supabase service-role credentials exclusively on trusted server boundaries.
- Keep OAuth secrets and other credentials in environment variables.
- Do not expose secrets in client bundles, logs, or committed files.

Provide an `.env.example` containing placeholder variable names, never real credentials.

## 7. Architecture and Code Quality

Keep the codebase compact and separated by responsibility.

Suggested organization:

- `app/` — routes, pages, and application layouts.
- `components/` — reusable UI components.
- `lib/auth/` — authentication and session utilities.
- `lib/quests/` — quest validation and completion operations.
- `lib/progression/` — XP and level calculations.
- `lib/shop/` — purchasing, ownership, and equipping logic.
- `lib/supabase/` — Supabase client utilities.
- `supabase/migrations/` — schema and database functions.
- `supabase/seed.sql` or equivalent — sample quests and cosmetics.
- `tests/` — unit and integration tests.
- `e2e/` — essential browser journeys.
- `docs/MVP_SPEC.md` — the agreed product requirements.

This is a suggested structure, not a requirement to create every folder if it adds no value.

Keep business logic independent from UI components. Do not repeat XP formulas, reward validation, or purchasing rules in multiple locations.

Avoid unnecessary abstractions, generic frameworks, duplicate state, excessive files, and speculative features.

## 8. Testing and Acceptance Criteria

The MVP is not complete until the following journeys work.

### Authentication

- A user can sign in through GitHub OAuth.
- The correct profile is loaded for the authenticated account.
- The session persists after refreshing the page.
- Signing out prevents access to protected application data.

### Quests and Progression

- The user can view available quests.
- A successful completion records the quest and awards its configured XP and coins.
- A completed one-time quest cannot award rewards again.
- Invalid or inactive quests cannot be completed.
- Level and progress calculations work at boundary conditions.
- Progress survives page refreshes and new sessions.

### Shop

- A user with sufficient coins can purchase a cosmetic.
- The correct number of coins is deducted.
- The user receives ownership of the purchased item.
- Duplicate purchases cannot cause incorrect balances.
- A user without sufficient coins cannot buy an item.
- A user cannot equip an unowned item.
- Equipping and unequipping borders updates the Profile correctly.
- Coin balances and ownership persist after refresh.

### Quality Checks

Run the available:

- Unit tests.
- Relevant database or integration tests.
- Type checks.
- Lint checks.
- Production build.
- Essential end-to-end tests.

Report which checks actually ran and whether they passed. Do not claim unexecuted tests passed.

## 9. Out of Scope

Do not implement any of the following without explicit approval:

- Automated GitHub activity ingestion or verification.
- Webhooks or background workers.
- Daily or weekly quest scheduling.
- Skill trees or skill points.
- Achievements and badges.
- Leaderboards and seasons.
- Guilds, friends, social features, or messaging.
- Cosmetics beyond the basic shop and avatar-border functionality.
- Admin dashboards.
- Complex animations or visual effects.
- AI features.
- Notifications.
- Payments or premium subscriptions.

## 10. Implementation Workflow

Build in small, independently verifiable phases.

**Phase 0 — Finalize the specification**
- Confirm the requirements and assumptions.
- Propose the schema, reward configuration, and implementation order.
- Identify any unresolved decisions that affect architecture or functionality.
- Do not write application code yet.

**Phase 1 — Project and database foundation**
- Create the project structure.
- Configure Supabase clients and environment validation.
- Implement migrations, access policies, and seed data.
- Verify the schema and initial data.

**Phase 2 — Quest and progression logic**
- Implement and test quest completion, XP rewards, coin rewards, and level calculation.
- Prove that duplicate requests cannot award duplicate rewards.

**Phase 3 — Authentication**
- Implement GitHub OAuth, callbacks, session handling, and profile creation.
- Test sign-in, sign-out, refresh, and protected access.

**Phase 4 — Shop backend**
- Implement purchase, ownership, equip, and unequip operations.
- Test insufficient funds, duplicate requests, and invalid ownership.

**Phase 5 — Simple interface**
- Implement the Profile, Shop, and Quests sections.
- Connect the UI to the real database-backed operations.
- Include loading, error, and success states.

**Phase 6 — Integration and release checks**
- Verify the full user journey.
- Run automated checks and fix failures.
- Document local setup, environment variables, migrations, OAuth configuration, and deployment requirements.

At the end of each phase, report the changed files, checks performed, results, and remaining defects. Continue only when that phase meets its acceptance criteria.

Do not make unrelated changes or expand the scope.

## Final Definition of Done

RootRealm MVP is done when a developer can sign in with GitHub, view and complete quests, earn XP and coins exactly once per quest, level up, buy a cosmetic, equip or remove an avatar border, and see the correct saved state after refreshing the application.

**Build this product first. Do not build the future version prematurely.**