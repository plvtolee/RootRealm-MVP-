# RootRealm — GitHub Activity Integration Plan

Status: **Revised per approved decisions.** Public activity only, all-time milestone
quests, encrypted server-side token storage, and SQL-authoritative evaluation.
Documentation only — no application code has been written.
Companion to [`MVP_SPEC.md`](./MVP_SPEC.md).

This document specifies how RootRealm retrieves, normalizes, stores, and evaluates real
GitHub activity to drive activity-based quests. It covers permissions, API strategy,
schema, idempotency, rate limits, sync flow, seed quests, tests, and open decisions.

---

## 1. Goals and constraints

**Goals**
- Use the authenticated GitHub identity to read the user's own commits and merged PRs.
- Normalize activity into stable events; make ingestion idempotent.
- Evaluate quests server-side from stored activity; award each quest exactly once.
- Make repeated/concurrent sync safe and observable.
- Keep the MVP small and maintainable.

**Constraints**
- No scraping, webhooks, background workers, or scheduled jobs.
- Sync is user-triggered.
- Only commits and merged PRs.
- **Public activity only in v1.** No `repo` or `public_repo` scope is requested, so
  private-repository activity is not retrieved or counted.
- All-time milestone quests: `window_days = NULL` for the seeded catalog.

---

## 2. Supported activity and definitions

### Qualifying commit
A commit returned for the authenticated user where:
- The commit's author login equals the user's GitHub login (fallback: author email matches
  a verified account email, if login is unavailable).
- The commit belongs to a repository the user can access (public, or private with `repo`).
- Merge commits are **stored but flagged** (`parents_count > 1`), and excluded during
  evaluation when the quest sets `exclude_merge_commits = true`.
- Bot committers are excluded (`author.type === "Bot"`), unless later configured.

### Merged pull request
A pull request where:
- The PR author is the authenticated user.
- `merged_at` is non-null (merged, not merely closed).
- It belongs to an accessible repository.

### Event identity (idempotency keys)
- Commit: `external_id = <sha>` (globally unique per repo history; collisions are
  effectively impossible, but store `repo_full_name` too).
- PR: `external_id = <repo_full_name>#<number>` (stable across edits).
- Together with `user_id` and `activity_type`, these form the uniqueness key.

### Activity window
- The seeded quests are **all-time milestones**: `window_days = NULL`.
- There is no universal 90-day filter. Activity outside any window remains stored; for
  `NULL` windows all stored activity counts.
- The initial synchronization must retrieve enough historical activity to determine
  eligibility. Because the Search API caps a query at 1,000 results, truncated history is
  tracked explicitly (see §6.4) and never treated as authoritative when it could change a
  quest outcome.
- Future daily/weekly quests may set explicit positive `window_days`.

---

## 3. GitHub permissions (OAuth scopes)

**v1 supports public GitHub activity only.** Request only identity scopes:

| Purpose | Scope |
| --- | --- |
| Read profile / login / avatar | `read:user` |
| Read account email (for commit email fallback) | `user:email` |

**Do not request `repo` or `public_repo`.** Reading public repository activity through
the GitHub API does not require repository scopes. Consequently:

- Commits and merged PRs in **public** repositories are eligible.
- Activity in **private** repositories is not retrieved and does not count in v1.
- Organization-private repositories likewise do not count.

If private support is added later, prefer a **GitHub App** with granular, read-only
repository permissions over broad OAuth scopes. That is explicitly out of scope now.

Implementation notes:
- Pass only identity scopes at sign-in:
  `supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'read:user user:email', redirectTo: ... } })`.
- Capture `provider_token` during the OAuth callback and store it encrypted server-side
  (§3.1). It is needed for server-triggered, user-initiated sync after the page refreshes.
- Store granted scopes (`github_connections.scopes`) for diagnostics.
- If the stored token is missing, revoked, or lacks the required identity scopes, prompt
  re-authentication. GitHub OAuth does not support fine-grained incremental scopes.
- Never request write scopes; never log or return the token.

### 3.1 Token storage
- `github_oauth_tokens.ciphertext` holds the token encrypted with AES-256-GCM using
  `GITHUB_TOKEN_ENCRYPTION_KEY` (server-side env var only).
- The table has **no RLS policies** and all privileges are revoked from `anon` and
  `authenticated`; only trusted server code (service role) reads or writes it.
- Tokens and the encryption key must never reach the browser, API responses, or logs.
- Key rotation is out of scope for the MVP; `key_version` is stored for future rotation.

---

## 4. Proposed schema (DDL sketch)

> Planning artifact only. This becomes `supabase/migrations/002_activity.sql`.

```sql
-- 4.1 Quest rule fields
alter table public.quests
  add column activity_type text check (activity_type in ('commit','merged_pr')),
  add column requirement_count integer check (requirement_count > 0),
  -- NULL = all-time milestone (seeded quests); positive = rolling window in days
  add column window_days integer check (window_days is null or window_days > 0),
  add column exclude_merge_commits boolean not null default true,
  add column repo_filter text;  -- NULL = any public repo

-- 4.2 Completion audit fields
alter table public.quest_completions
  add column source text not null default 'activity'
    check (source in ('activity')),
  add column evidence_count integer,
  add column progress_at_completion integer;

-- 4.3 Connection metadata (no token)
create table public.github_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_login text not null,
  github_user_id bigint not null,
  scopes text[] not null default '{}',
  needs_reauth boolean not null default false,
  last_synced_at timestamptz,
  initial_sync_completed_at timestamptz,
  -- Whether the initial all-time crawl hit the Search API cap for each type.
  -- false = history is truncated; evaluation must not treat it as authoritative.
  commits_history_complete boolean not null default false,
  prs_history_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.4 Encrypted token (server-only)
create table public.github_oauth_tokens (
  user_id uuid primary key references public.github_connections(user_id) on delete cascade,
  ciphertext text not null,          -- base64(iv) + "." + base64(tag) + "." + base64(ct)
  key_version smallint not null default 1,
  updated_at timestamptz not null default now()
);

-- 4.5 Normalized activity
create table public.github_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('commit','merged_pr')),
  external_id text not null,
  repo_full_name text not null,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, activity_type, external_id)
);
create index gae_user_type_time_idx
  on public.github_activity_events (user_id, activity_type, occurred_at desc);

-- 4.6 Progress snapshot (drives UI; recomputed on sync)
create table public.quest_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  target integer not null check (target > 0),
  status text not null default 'in_progress'
    -- indeterminate = history was truncated and the requirement exceeds what was retrieved
    check (status in ('in_progress','completed','indeterminate')),
  last_evaluated_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

-- 4.7 Sync observability
create table public.github_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('success','partial','rate_limited','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  commits_found integer not null default 0,
  prs_found integer not null default 0,
  events_inserted integer not null default 0,
  quests_completed integer not null default 0,
  truncated boolean not null default false,
  error_message text,
  rate_limit_remaining integer,
  rate_limit_reset_at timestamptz
);
```

### RLS and privileges
- `github_connections`: `SELECT` own row only. No client writes.
- `github_oauth_tokens`: **no policies**; `revoke all` from `anon, authenticated`.
  Only the service role reads it.
- `github_activity_events`, `quest_progress`, `github_sync_runs`: `SELECT` own only.
  No client writes.
- `quests`, `quest_completions`, `cosmetics`, `user_cosmetics`: as today.
- Read-only grants for clients; all writes flow through trusted server code and
  `SECURITY DEFINER` functions.

### Functions (SQL-authoritative, atomic, secure)
Both functions are `SECURITY DEFINER`, derive the acting user from `auth.uid()`, and
reject calls when it is null. They use `set search_path = public, pg_temp`, fully
qualified object names, and `revoke execute ... from public, anon` with
`grant execute ... to authenticated`. No user id is accepted from the caller.

```sql
-- Record normalized events for the authenticated user. Idempotent.
-- Returns the number of rows actually inserted.
record_activity_events(p_events jsonb) returns integer
  -- insert ... on conflict (user_id, activity_type, external_id) do nothing
  -- validates payload shape; ignores unknown/malformed entries

-- Recompute progress and award eligible quests atomically.
evaluate_activity_quests() returns table (
  quest_id uuid, progress integer, target integer, status text,
  newly_completed boolean, xp_awarded integer, coins_awarded integer
)
  -- for each active activity quest:
  --   count qualifying stored events (type, window, merge flag, repo, bot flags)
  --   upsert quest_progress
  --   if requirement met and no completion: insert completion, update profile
  --   if history truncated and fetched count < requirement: status = 'indeterminate'
```

- `record_activity_events` and `evaluate_activity_quests` are invoked through the user's
  Supabase session client, so `auth.uid()` is the verified user.
- The encrypted token is read with the service role **only** (it is not exposed by RLS).
- Drop `complete_quest(uuid)` and its grant — manual completion is removed.

> Evaluation is SQL-authoritative so the award decision cannot be influenced by
> client-supplied counts and is atomic. TypeScript owns token handling, GitHub requests,
> pagination, normalization, and orchestration only.

---

## 5. Sync flow (user-triggered)

Server action `syncGithubActivity()`:

1. `requireSession()` → verified `user.id` (never client input).
2. Load `github_connections` + decrypt token with the service role. If the token is
   missing, revoked, or `needs_reauth` → return `{ ok: false, reason: 'needs_reauth' }`.
3. Determine the query window:
   - **Initial sync:** all-time. No lower date bound; paginate from the most recent
     results until the result cap or exhaustion.
   - **Incremental sync:** `since = last_synced_at - 1 day` (overlap catches
     late-indexed events and clock skew).
4. Fetch commits and merged PRs **sequentially**, one page at a time, respecting
   `GITHUB_SYNC_MAX_PAGES` (default 10 → 1,000 results per type).
5. Normalize payloads → `ActivityEvent[]`; drop malformed entries; dedupe in memory by
   stable external id.
6. Call `record_activity_events(events)` (RPC, `auth.uid()`-derived).
7. Call `evaluate_activity_quests()` → progress, newly completed quests, and any
   `indeterminate` outcomes.
8. Update `github_connections` (`last_synced_at`, `initial_sync_completed_at`, and the
   `*_history_complete` flags); insert a `github_sync_runs` row with counts and status.
9. `revalidatePath('/quests')`, `revalidatePath('/profile')`.
10. Return a summary for the UI: events found/inserted, per-quest progress, newly
    completed quests, XP/coin deltas, new balances, truncation, and rate-limit reset.

### Truncation and indeterminate results
- If a Search query hits the page cap, mark that activity type's history as incomplete
  (`commits_history_complete = false` / `prs_history_complete = false`) and set
  `truncated = true` on the sync run.
- A quest is **completed** only when the stored qualifying count meets its requirement.
- If history is incomplete **and** the requirement exceeds the number of qualifying
  events retrieved, the quest status becomes `indeterminate`; it is **not** completed and
  the UI explains that history is truncated. (For the seeded catalog the largest
  requirement is 50 commits / 25 merged PRs, well below the 1,000 cap, so this is an edge
  case rather than normal behavior.)
- Truncated history is never silently treated as authoritative.

### UI states
- Idle → "Sync GitHub".
- Syncing → disabled button, spinner/label.
- Success → counts + list of progressed/completed quests.
- No new activity → neutral "You're up to date".
- Indeterminate → "History truncated; this milestone cannot be confirmed yet."
- Needs re-auth → banner with a sign-in button.
- Rate limited → message with the reset time rendered in the user's **local timezone**
  (from the epoch `x-ratelimit-reset`), e.g. "GitHub rate limit reached. Try again at
  3:42 PM." No background retry.
- Failure → generic error + retry, no partial corruption.

---

## 6. GitHub API strategy

All requests use the user's token, which carries only identity scopes. Only **public**
repository activity is returned; private repositories are out of scope for v1.

Requests are **sequential** (one page at a time) and share a page cap of
`GITHUB_SYNC_MAX_PAGES` (default 10 → 1,000 results per activity type).

### 6.1 Merged pull requests (Search API)
**Initial sync (all-time):**
```
GET /search/issues?q=is:pr is:merged author:<login>
    &sort=updated&order=desc&per_page=100&page=N
Accept: application/vnd.github+json
```
**Incremental sync:**
```
GET /search/issues?q=is:pr is:merged author:<login> merged:>=<lastSyncedAt - 1 day>
    &sort=updated&order=desc&per_page=100&page=N
```
- Confirms `pull_request.merged_at` before normalization.
- Search rate limit: 30 requests/min (authenticated); 1,000 results max per query.

### 6.2 Commits (Search API)
**Initial sync (all-time):**
```
GET /search/commits?q=author:<login>
    &sort=committer-date&order=desc&per_page=100&page=N
Accept: application/vnd.github+json
```
**Incremental sync:**
```
GET /search/commits?q=author:<login> committer-date:>=<lastSyncedAt - 1 day>
    &sort=committer-date&order=desc&per_page=100&page=N
```
- Use `author:<login>`; re-filter `author.login` client-side.
- Exclude bot authors (`author.type === "Bot"`).
- Merge commits are stored with `parents_count`; excluded at evaluation when
  `exclude_merge_commits = true`.
- Same search limits: 30/min, 1,000 results per query.

### 6.3 Pagination and truncated history
- Stop when a page returns fewer than `per_page` items.
- Hard cap at `GITHUB_SYNC_MAX_PAGES`; if reached, set `truncated = true` and mark the
  activity type's history incomplete on `github_connections`.
- Sequential page increments; validate that the response is an array and that pagination
  metadata is consistent. A malformed/partial page is a failure, not silent end-of-data.
- For an initial all-time sync, truncation means older history is unknown. Eligibility
  for a requirement **≤ retrieved count** is still determinable; requirements above the
  retrieved count become `indeterminate` (never completed).
- Incremental syncs add newer events; they do not repair a truncated initial history.

### 6.4 Rate limits and errors
- Read `x-ratelimit-remaining`, `x-ratelimit-reset`, and `retry-after`.
- 401 → mark `needs_reauth`, stop, return the re-auth state.
- 403/429 with rate limit → stop, record `rate_limited` + reset time, keep already
  ingested events, and show a retry message with the reset time converted to the user's
  local timezone. **No background retries or workers.**
- 5xx / network → `failed` (or `partial` if some pages succeeded); safe to retry on the
  next user-triggered sync.
- Honor `retry-after` for secondary rate limits; never hot-loop.
- Never expose tokens, token-bearing URLs, or raw API responses in errors or logs.

---

## 7. Normalization contract

```ts
type ActivityType = 'commit' | 'merged_pr';

interface ActivityEvent {
  activityType: ActivityType;
  externalId: string;       // sha | "<repo>#<number>"
  repoFullName: string;
  occurredAt: string;       // ISO8601 (commit author/committer date | merged_at)
  metadata: {
    title?: string;
    message?: string;
    url?: string;
    authorLogin?: string;
    parentsCount?: number;
    isMerge?: boolean;
    number?: number;
  };
}
```

Normalizers must:
- Validate required fields; skip malformed entries rather than throw the whole sync.
- Produce stable IDs.
- Use UTC ISO timestamps.
- Never include token material or unnecessary PII.

---

## 8. Seed quests (activity-based, all-time milestones)

All seeded quests are **all-time milestones**: `window_days = NULL`. Merge commits and
bot-authored commits are excluded from commit counts. Merged PRs are counted separately.

| # | Title | Difficulty | Activity | Count | XP | Coins |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First Commit | Easy | commit | 1 | 25 | 10 |
| 2 | First Merge | Easy | merged_pr | 1 | 30 | 15 |
| 3 | Getting Started | Easy | commit | 5 | 40 | 20 |
| 4 | Ten Commits | Medium | commit | 10 | 60 | 30 |
| 5 | PR Practitioner | Medium | merged_pr | 3 | 90 | 50 |
| 6 | Steady Builder | Medium | commit | 15 | 75 | 40 |
| 7 | Prolific Committer | Hard | commit | 50 | 180 | 100 |
| 8 | Merge Master | Hard | merged_pr | 10 | 150 | 90 |
| 9 | Shipping Machine | Hard | merged_pr | 25 | 200 | 120 |

Notes:
- Overlapping commit quests (1/5/10/15/50) are intentional: each is a separate one-time
  reward, and completion is evaluated independently.
- Example rule text for the UI: "Merge 3 pull requests in the last 90 days."
- The previous manual/onboarding quests are removed from the seed.

---

## 9. Idempotency and concurrency

- Event ingestion: unique `(user_id, activity_type, external_id)` + `on conflict do nothing`.
- Progress: `upsert` on `(user_id, quest_id)`; last write wins with the same computed value.
- Rewards: `quest_completions` unique `(user_id, quest_id)`; award insert uses
  `on conflict do nothing` and updates balances **only when a row was actually inserted**.
- Concurrent syncs: both may ingest/duplicate-detect safely; only one completion insert
  succeeds, so rewards are granted once.
- Transaction boundaries: insertion + balance update for a quest occur in one function
  call/transaction.

---

## 10. Resolved decisions

These are approved and are reflected throughout this document.

1. **OAuth scope — public activity only.** Request only `read:user user:email`. Do not
   request `repo` or `public_repo`. Private-repository activity does not count in v1 and
   is documented as a limitation. Future private support should use a GitHub App with
   granular, read-only repository permissions.
2. **Token storage — encrypted server-side DB.** Persist the GitHub token encrypted with
   AES-256-GCM under `GITHUB_TOKEN_ENCRYPTION_KEY`. Token records are inaccessible to
   clients (no RLS policies, privileges revoked); tokens/key never reach the browser,
   responses, or logs. Key rotation is out of scope.
3. **Activity window — all-time milestones.** Seeded quests use `window_days = NULL`.
   There is no universal 90-day filter. The initial sync retrieves all available history
   up to the search cap; truncated history is tracked and never treated as authoritative.
4. **Evaluation — SQL-authoritative and atomic.** Recording activity, evaluating
   eligibility, recording completions, and awarding XP/coins happen in transactional
   `SECURITY DEFINER` functions with `auth.uid()` checks, hardened `search_path`, and
   revoked public/anon execute privileges. Idempotency is enforced by unique constraints.
5. **Retrieval — GitHub Search API.** Sequential pagination, a configured result cap,
   incremental sync with a one-day overlap, stable-ID dedupe, and explicit handling of
   pagination failures, incomplete results, and rate limits. Rate-limit messages show the
   reset time in the user's local timezone. No background retries or workers.
6. **Eligibility.** Count commits attributed to the authenticated user, excluding
   bot-authored commits and merge commits. Count merged PRs authored by the authenticated
   user separately. Each seeded quest's rule is defined and tested.

### Confirmed product notes
- Overlapping milestone quests are intentional: e.g., 50 commits can satisfy several
  milestones, each rewarding once and each reward recorded idempotently.
- A clear rate-limit message with the retry time is acceptable.
- The existing nine-quest catalog is preserved (adapted to activity rules).
- MVP scope is unchanged: GitHub activity, quests, XP, levels, coins, avatar-border
  cosmetics, Supabase persistence, and Profile/Shop/Quests.

---

## 11. Test plan (to be implemented in later phases)

**Unit (Vitest, no DB)**
- Commit normalizer: valid, merge flag, missing fields, bot author, stable ID.
- PR normalizer: merged only, unmerged rejected, stable ID, missing fields.
- Timestamp/window helpers and `since` overlap calculation.
- Pagination loop: short page stops, max cap sets `truncated`, rate-limit mid-stream.
- Token encryption/decryption round-trip; tamper detection.
- Error mapping: 401 → needs_reauth, 403/429 → rate_limited, 5xx → failed.

**Integration (Vitest + local Supabase)**
- Event upsert dedupes on repeated ingestion.
- Eligibility: type, count threshold, window boundary, merge exclusion, repo filter.
- Progress upsert and status transitions.
- Award exactly once on repeated `evaluate_activity_quests`.
- Concurrent evaluation yields one completion and one balance delta.
- Profile balances and completions match awarded amounts.

**E2E (Playwright)**
- Sign in (test account) → sync → progress/completion visible.
- Insufficient/ineligible activity does not progress the wrong quest.
- Re-sync shows no duplicate rewards.
- Purchase + equip cosmetic; refresh retains state.
- Signed-out access is blocked.

---

## 12. Environment additions

```env
# Required for encrypted GitHub token storage
GITHUB_TOKEN_ENCRYPTION_KEY=<32-byte base64 key>

# Optional tuning
GITHUB_SYNC_MAX_PAGES=10
```
Note: `GITHUB_SYNC_LOOKBACK_DAYS` is no longer used; initial sync is all-time.
Add these to `.env.example` with placeholders (never real values) when implementation
starts.

---

## 13. Documentation of limitations (to publish)

- Only **public GitHub activity** counts in v1. The OAuth scopes requested are
  `read:user user:email`; no `repo` or `public_repo` scope is requested. Private
  repositories, organization-private repositories, and private commits/PRs are not
  retrieved or counted. Future private-repository support should use a GitHub App with
  granular, read-only repository permissions rather than broad OAuth scopes.
- The GitHub Search API caps results at 1,000 per query and is limited to 30 requests/
  minute. If a user's history exceeds the cap, the earliest activity is unknown and
  milestones above the retrieved count become `indeterminate` — they are not completed
  and the UI explains the truncation.
- Activity is only as fresh as the last user-triggered sync; there is no background
  sync, scheduled jobs, or webhooks in the MVP.
- GitHub OAuth tokens can be revoked by the user at any time; RootRealm then requires
  re-authentication.
- Only commits (authored by the user, excluding bots and merge commits) and merged PRs
  (authored by the user) count; issues, reviews, and discussions do not.
- The encryption key (`GITHUB_TOKEN_ENCRYPTION_KEY`) is a single version for the MVP;
  key rotation is not implemented.

---

## 14. What changes versus the current codebase

Planning summary (no code changed yet):
1. Remove the manual `complete_quest` RPC and its grant.
2. Add migration `002_activity.sql`: quest rule columns, completion audit fields, five
   new tables, RLS/privileges, `record_activity_events`, `evaluate_activity_quests`.
3. Add `lib/github/` (client, pagination, normalize, token crypto, errors) and update
   `lib/quests/` (sync orchestration, progress queries).
4. Update OAuth sign-in scopes and the callback to persist the token.
5. Replace the seed with the nine activity-based quests.
6. Update the Quests UI: remove manual completion, add sync/progress/reauth/rate-limit.
7. Update Profile with optional sync status; Shop unchanged.
8. Add unit + integration + e2e tests described in §11.
9. Update `.env.example`, `docs/SETUP.md`, and `README.md`.
