# RootRealm — MVP Product & Implementation Specification

> **Amendment note:** This specification supersedes the earlier "authentication-only"
> scope. GitHub activity ingestion is now a required Phase 1 MVP feature. Quest
> completion is driven by real GitHub activity (commits and merged pull requests),
> not by client-side completion buttons. The detailed technical design lives in
> [`GITHUB_ACTIVITY_PLAN.md`](./GITHUB_ACTIVITY_PLAN.md).

## 1. Project Overview

Build **RootRealm**, a lightweight RPG-inspired progression web app for developers.

Users sign in with their GitHub accounts, synchronize their real GitHub activity,
complete activity-based quests to earn XP and coins, level up as they accumulate XP,
and spend their coins on cosmetic items such as avatar borders.

The goal is a small, functional MVP with real backend logic, real activity
verification, and persistent data. This is not the full RootRealm vision.

**Priorities, in order:**
1. Correct and reliable functionality.
2. Simple, maintainable architecture.
3. Secure authentication, token handling, and data integrity.
4. A clean, usable interface.
5. Easy future expansion without unnecessary complexity.

## 2. Technology Stack

- **Framework:** Next.js with the App Router.
- **Language:** TypeScript.
- **Database:** Supabase Postgres.
- **Authentication:** Supabase Auth with GitHub OAuth.
- **GitHub data:** GitHub REST API (server-side only).
- **Styling:** Tailwind CSS.
- **Testing:** Vitest for business logic and integration tests; Playwright for essential end-to-end journeys.
- **Version control:** Git and GitHub.

Use current stable, compatible dependencies. Avoid adding libraries unless they solve
a concrete requirement.

## 3. Core MVP Features

### A. GitHub Authentication and Activity Integration

Users must be able to:

- Sign in using GitHub OAuth.
- Sign out securely.
- Maintain their authenticated session across page refreshes.
- Access their own profile, quest progress, coins, XP, and cosmetics.
- Have their account data associated with their authenticated Supabase user ID.

Create or retrieve the user's profile reliably after their first successful sign-in.

Never trust a user ID supplied by the browser to authorize access to account data.

**Activity integration (required):**

- Retrieve the user's real GitHub activity via the GitHub REST API. No web scraping.
- Supported activity types for this phase:
  1. **Qualifying commits** — commits authored by the authenticated GitHub user.
  2. **Merged pull requests** — pull requests authored by the user and actually merged.
- Start with a **user-triggered synchronization** flow ("Sync GitHub" action).
- Normalize retrieved activity into a consistent internal representation before storing.
- Evaluate quest eligibility on the server using stored, normalized activity.
- Persist activity, quest progress, completion records, and rewards in Supabase.
- Prevent duplicate XP/coin awards when synchronization is repeated or concurrent.
- Handle API failures, pagination, rate limits, and revoked tokens safely.

**Out of scope for activity:** background workers, scheduled sync, webhooks,
real-time updates, repository scraping, commit diff analysis, and automated code-quality
scoring.

**Permissions (v1):** Request only identity scopes — `read:user` and `user:email`.
Public repository activity is retrieved via the GitHub Search API without additional
scopes. **Private repository activity is not retrieved and does not count in v1.**
This limitation is documented for users. If private support is added later, a GitHub
App with granular, read-only repository permissions should be used instead of broad
OAuth scopes.

### B. Activity-Based Quest System

Create a quest system with three difficulty tiers: **Easy**, **Medium**, **Hard**.

Each quest must have:

- A unique ID.
- A title and short description.
- A difficulty tier.
- An **activity rule**: activity type (`commit` or `merged_pr`), required count,
  evaluation window (`NULL` for all-time milestones in the seeded catalog), merge-commit
  policy, and optional repository filter.
- An XP reward and a coin reward.
- An active or inactive status.

The Quests section must display:

- Available quests, difficulty, description, and rewards.
- The user's progress toward each quest (e.g., `3 / 10 commits`).
- Completion status.
- A clear **Sync GitHub** action and the last-synchronized time.

**Completion flow (server-authoritative):**

1. Validate the authenticated user from the session (never from client input).
2. Load the user's stored, normalized GitHub activity.
3. Evaluate each active quest's rule against that activity (count, window, type,
   merge policy, repo filter).
4. Persist progress in `quest_progress`.
5. For quests that meet their requirement and are not yet completed, atomically:
   record the completion, award the quest's configured XP and coins, and update the
   profile.
6. Return progress and newly completed quests for the interface to render.

**Integrity rules:**

- Rewards are calculated from trusted server-side quest data, never from client input.
- Duplicate clicks, repeated requests, repeated synchronization, and concurrent
  requests must not grant duplicate rewards.
- A quest is one-time completion. Once completed, further activity does not award it again.
- Ineligible activity (unmerged PRs, excluded merge commits, activity outside the
  quest window, wrong activity type) must not count.
- The manual `complete_quest` reward path is removed; clients cannot self-report completion.

Do not add daily resets, streaks, timers, quest chains, or skill trees.

### C. XP and Level System

Users earn XP from completed quests.

Implement a simple, deterministic level system in a single reusable progression module.

- Level 1 starts at 0 XP.
- Every 100 total XP advances one level.
- The profile displays current level, total XP, XP earned toward the next level, and
  a progress bar.

For example, 150 total XP is Level 2 with 50/100 XP toward Level 3.

Do not implement skill points, attributes, prestige, ranks, or complex curves.

Test boundaries: 0, 99, 100, 199, 200 XP.

### D. Coins and Cosmetic Shop

Users earn coins by completing quests and spend them in the Shop.

Initial catalog: a small selection of avatar-border cosmetics (Basic, Silver, Gold, Neon).
Simple CSS-rendered borders are sufficient.

Each cosmetic must have: unique ID, name, description, price in coins, visual preview,
and active/inactive status.

Users must be able to browse the catalog, see prices, purchase unowned items, see an
insufficient-funds message, see ownership, equip a purchased border, and unequip back
to default.

Purchasing must deduct the correct price and grant ownership atomically. Users must not
be able to purchase unaffordable items, pay twice due to duplicate requests, or equip
unowned items.

An equipped cosmetic must be reflected in the Profile section.

Do not implement real-money stores, loot boxes, trading, rarity, elaborate inventories,
or payment integrations.

## 4. Application Interface

Three primary authenticated sections: **Profile**, **Shop**, **Quests**.

### Profile
- GitHub avatar and username.
- Equipped avatar border (or default).
- Current level, total XP, XP progress toward next level.
- Current coin balance.
- Total quests completed.
- (Optional) GitHub sync status: last synced, needs re-authentication.

### Quests
- Available quests grouped/visually distinguished by Easy / Medium / Hard.
- Activity rule summary (e.g., "Merge 3 pull requests in the last 90 days").
- Progress toward the requirement and completion status.
- XP and coin rewards.
- A **Sync GitHub** button with loading, success, and error states.
- A re-authentication prompt when the GitHub token is missing, revoked, or scoped
  incorrectly.
- No manual "complete" button.

### Shop
- Current coin balance.
- Cosmetic previews, names, prices, ownership status.
- Purchase, equip, and unequip actions; insufficient-funds messaging.
- Update from the successful backend result.

### Shared
- Navigation bar for Profile, Shop, Quests.
- Login screen with GitHub sign-in.
- Clear loading, success, error, empty, and rate-limited states.
- Responsive layout; accessible labels and controls.
- Minimal, consistent styling. No elaborate RPG artwork or animations.

## 5. Database Design

Supabase Postgres is the source of truth. Existing tables (`profiles`, `quests`,
`quest_completions`, `cosmetics`, `user_cosmetics`) are retained with the following
amendments and additions.

### Modified: `quests`
Add activity rule fields:
- `activity_type` — `commit` | `merged_pr`.
- `requirement_count` — integer > 0.
- `window_days` — integer > 0 or `NULL` (`NULL` = all-time milestone; seeded quests use
  `NULL`).
- `exclude_merge_commits` — boolean, default true.
- `repo_filter` — text, nullable (null = any public repository).

### Modified: `quest_completions`
- Add `source` (`activity`), `evidence_count`, and `progress_at_completion` for audit.
- Keep the unique `(user_id, quest_id)` constraint.

### New: `github_connections`
- `user_id` PK → auth user.
- `github_login`, `github_user_id`, `scopes`, `needs_reauth`, `last_synced_at`,
  `initial_sync_completed_at`, `commits_history_complete`, `prs_history_complete`,
  `created_at`, `updated_at`.
- The `*_history_complete` flags track whether the initial all-time crawl exceeded the
  Search API cap. No token material; safe non-secret connection metadata only.

### New: `github_oauth_tokens`
- `user_id` PK → `github_connections`.
- `ciphertext` — application-encrypted GitHub token (AES-256-GCM) using
  `GITHUB_TOKEN_ENCRYPTION_KEY` (server-side env only).
- No client RLS policies; all privileges revoked from `anon` and `authenticated`.
  Only trusted server code (service role) reads or writes this table.

### New: `github_activity_events`
- `id`, `user_id`, `activity_type`, `external_id`, `repo_full_name`, `occurred_at`,
  `metadata` (jsonb), `created_at`.
- Unique `(user_id, activity_type, external_id)` for idempotent ingestion.

### New: `quest_progress`
- `user_id`, `quest_id`, `progress`, `target`, `status`, `last_evaluated_at`.
- `status`: `in_progress` | `completed` | `indeterminate` (history truncated and
  requirement exceeds retrieved count).
- Unique `(user_id, quest_id)`.

### New: `github_sync_runs`
- `user_id`, `status` (`success` | `partial` | `rate_limited` | `failed`),
  timestamps, counts (commits, PRs, events inserted, quests completed), `truncated` flag,
  error message, and rate-limit metadata.

### Optional
A small ledger (e.g., `coin_transactions`) may be added if useful for auditing.
Do not build a large generalized RPG schema.

Exact DDL sketches are in `GITHUB_ACTIVITY_PLAN.md` §4.

## 6. Security and Data Integrity

- Configure Supabase Row Level Security on every table.
- Users may read only their own profile, progress, completions, connections, activity,
  and sync runs. Catalog tables (quests/cosmetics) are readable when active.
- No client write policies for profiles, activity, progress, completions, ownership,
  tokens, or equip state.
- GitHub tokens are stored only server-side, encrypted at rest with AES-256-GCM using
  `GITHUB_TOKEN_ENCRYPTION_KEY` (server-only env var); never exposed to the client,
  logs, responses, or committed files.
- Request only the GitHub scopes required: `read:user user:email`. Document that private
  repository activity does not count in v1.
- Never let clients choose XP, coins, rewards, activity counts, or ownership.
- Evaluate quest eligibility in a trusted server boundary (server action + trusted
  `SECURITY DEFINER` database functions).
- Use transactional operations so completion, reward, and balance updates are atomic.
- Enforce exactly-once rewards with unique constraints plus conditional inserts.
- Handle 401 (mark re-auth), 403/429 (rate limit with retry time in user's local
  timezone), and 5xx (retry later) safely.
- Validate and normalize GitHub API payloads; tolerate unexpected fields.
- Keep service-role key and token-encryption key in environment variables.
- Provide `.env.example` with placeholder names only.
- Do not log tokens, tokens in URLs, or sensitive API payloads.

## 7. Architecture and Code Quality

Suggested organization (additions in **bold**):

- `app/` — routes, pages, layouts, OAuth callback.
- `components/` — reusable UI.
- `lib/auth/` — session and profile bootstrap.
- **`lib/github/`** — API client, pagination, normalization, token encryption, errors.
- `lib/quests/` — quest queries, sync orchestration, rule types.
- `lib/progression/` — XP/level math.
- `lib/shop/` — purchase/ownership/equip.
- `lib/supabase/` — browser/server/admin clients.
- `supabase/migrations/` — schema and database functions.
- `supabase/seed.sql` — activity-based quests and cosmetics.
- `tests/` — unit and integration tests.
- `e2e/` — essential browser journeys.
- `docs/` — this spec and the activity integration plan.

Keep rule logic in one authoritative place. Do not duplicate reward or purchasing
rules across UI and server. Avoid speculative abstractions and features.

## 8. Testing and Acceptance Criteria

### Authentication
- GitHub OAuth sign-in works and requests the required scopes.
- Profile loads for the authenticated account; session survives refresh.
- Sign-out prevents access to protected data.

### Activity synchronization
- Sync retrieves commits and merged PRs via the GitHub Search API, following
  sequential pagination up to the configured page cap.
- Activity is normalized into stable internal events with stable external IDs.
- Repeated sync does not duplicate events (unique constraints on external IDs).
- Unmerged PRs and (by rule) merge commits are excluded from eligibility.
- Bot-authored commits are excluded from commit-count quests.
- API failures, rate limits, and revoked tokens produce clear, safe states.
- No duplicate rewards on repeated or concurrent sync.
- Pagination stops correctly at short pages and at the maximum page cap.
- Truncated history is tracked; when the requirement exceeds retrieved qualifying events,
  quest status becomes `indeterminate` — it is not completed and the UI explains the
  truncation.
- Rate-limit messages show the reset time in the user's local timezone.

### Quests and progression
- Quest progress reflects stored activity and the quest's rule (type, count, window,
  merge policy, repo filter).
- A quest completes exactly once when its requirement is met and history is not
  truncated.
- Completed quests never award again; progress survives refresh/new session.
- Invalid/inactive quests cannot complete.
- Level math is correct at 0/99/100/199/200 XP.

### Quests and progression
- Quest progress reflects stored activity and the quest's rule.
- A quest completes exactly once when its requirement is met.
- Completed quests never award again; progress survives refresh/new session.
- Invalid/inactive quests cannot complete.
- Level math is correct at 0/99/100/199/200 XP.

### Shop
- Purchase deducts the correct price and grants ownership atomically.
- Insufficient funds blocked; duplicate purchases cannot corrupt balances.
- Unowned items cannot be equipped; equip/unequip updates Profile.
- State persists after refresh.

### Required test coverage
- Activity normalization (commits, merged PRs, malformed payloads).
- Eligibility rules (type, count, window, merge policy, repo filter).
- Pagination behavior (short page, max cap, rate-limit mid-stream).
- Duplicate-event handling.
- Duplicate reward prevention (repeated and concurrent sync).
- Token encryption round-trip and 401/403/429 error mapping.

### Quality checks
Run and report: unit tests, integration/database tests, type checks, lint, production
build, and essential e2e tests. Do not claim unexecuted checks passed.

## 9. Out of Scope

- Background workers, scheduled synchronization, webhooks, real-time updates.
- Commit diff analysis, code-quality scoring, scraping.
- Daily/weekly quests, streaks, timers, quest chains.
- Skill trees, achievements, badges, leaderboards, seasons, guilds, social features.
- Cosmetics beyond basic avatar borders; real-money payments.
- Admin dashboards, AI features, notifications.
- Large generalized RPG schema for future features.

## 10. Implementation Workflow

**Phase 0 — Revised plan (current):** spec updates, schema, architecture, phases,
acceptance criteria. No application code.

**Phase 1 — Project and database foundation:** add activity tables and quest rule
columns (`window_days` nullable), RLS, idempotency constraints, seed data with
all-time milestones (`window_days = NULL`); keep existing auth/shop foundation.

**Phase 2 — GitHub activity ingestion:** token storage/encryption (`GITHUB_TOKEN_ENCRYPTION_KEY`),
API client (Search API only), sequential pagination, rate-limit handling with local-time
reset message, normalization, idempotent event upsert; unit + integration tests.

**Phase 3 — Quest evaluation and rewards:** SQL-authoritative rule evaluation
(`evaluate_activity_quests`), progress persistence, atomic completion/award,
duplicate prevention; tests for eligibility, truncation, and indeterminate status.

**Phase 4 — Authentication and scopes:** request identity scopes (`read:user user:email`)
on sign-in; capture and persist token on callback; re-auth flow for missing/revoked
tokens; document that private activity does not count.

**Phase 5 — Shop backend:** purchase, ownership, equip/unequip (existing behavior).

**Phase 6 — Interface:** Profile, Shop, and activity-driven Quests with sync, progress,
loading/error/rate-limit/reauth/indeterminate states; remove manual completion UI.

**Phase 7 — Integration and release checks:** full journey, automated checks,
documentation of setup, scopes, migrations, and deployment.

Report changed files, checks, results, and defects at the end of each phase. Do not
expand scope.

## 11. Resolved Decisions (approved)

1. **OAuth scope — public activity only.** Request `read:user user:email`; do not
   request `repo` or `public_repo`. Private activity does not count in v1. Future
   private support should use a GitHub App with granular read-only permissions.
2. **Token storage — encrypted server-side DB.** Persist token encrypted with AES-256-GCM
   under `GITHUB_TOKEN_ENCRYPTION_KEY`; token records inaccessible to clients.
3. **Activity window — all-time milestones.** Seeded quests use `window_days = NULL`.
   No universal 90-day filter; truncated history tracked and never treated as authoritative.
4. **Evaluation — SQL-authoritative and atomic.** `record_activity_events` and
   `evaluate_activity_quests` are `SECURITY DEFINER` with `auth.uid()` checks,
   hardened `search_path`, revoked public/anon execute. Idempotency via unique constraints.
5. **Retrieval — GitHub Search API.** Sequential pagination, configured cap,
   incremental sync with one-day overlap, stable-ID dedupe, explicit truncation/rate-limit
   handling. No background retries or workers.
6. **Eligibility.** Commits attributed to the authenticated user, excluding bots and merge
   commits. Merged PRs authored by the authenticated user counted separately. Each seeded
   quest's rule is defined and tested.

Details are in `GITHUB_ACTIVITY_PLAN.md` §10.

## Final Definition of Done

A developer can sign in with GitHub, synchronize real GitHub activity, see eligible
quests progress and complete based on that activity, earn XP and coins exactly once per
quest, level up, buy a cosmetic, equip or remove an avatar border, and see the correct
persisted state after refreshing the application.

**Build this product first. Do not build the future version prematurely.**
