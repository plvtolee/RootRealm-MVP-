import { errorFromResponse, GitHubApiError, readRateLimit, toGitHubApiError } from './errors';
import { normalizeCommit, normalizeMergedPr } from './normalize';
import type { ActivityEvent, GitHubRateLimit, GitHubUser, SearchResult } from './types';

const API_BASE = 'https://api.github.com';
const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PAGES = 10;

export interface GitHubRequestOptions {
  since?: Date | null;
  perPage?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'rootrealm-mvp',
  };
}

function resolveMaxPages(value: number | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  const envValue = Number(process.env.GITHUB_SYNC_MAX_PAGES);
  if (Number.isFinite(envValue) && envValue > 0) {
    return Math.floor(envValue);
  }
  return DEFAULT_MAX_PAGES;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return '';
  }
}

async function requestJson(
  url: string,
  token: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { headers: authHeaders(token) });
  } catch (error) {
    throw toGitHubApiError(error);
  }

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw errorFromResponse(response.status, response.headers, body);
  }

  try {
    return await response.json();
  } catch {
    throw new GitHubApiError('invalid_response', 'GitHub returned invalid JSON.');
  }
}

interface PaginateInput {
  token: string;
  login: string;
  endpoint: 'commits' | 'issues';
  buildQuery: (login: string, since: Date | null) => string;
  sort: string;
  order: 'desc' | 'asc';
  normalize: (item: unknown, login: string) => ActivityEvent | null;
  options: GitHubRequestOptions;
}

async function paginate(input: PaginateInput): Promise<SearchResult> {
  const {
    token,
    login,
    endpoint,
    buildQuery,
    sort,
    order,
    normalize,
    options,
  } = input;

  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const maxPages = resolveMaxPages(options.maxPages);
  const fetchImpl = options.fetchImpl ?? fetch;
  const since = options.since ?? null;

  const events: ActivityEvent[] = [];
  let truncated = false;
  let rateLimit: GitHubRateLimit = { remaining: null, resetAt: null };

  const query = buildQuery(login, since);

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(`${API_BASE}/search/${endpoint}`);
    url.searchParams.set('q', query);
    url.searchParams.set('sort', sort);
    url.searchParams.set('order', order);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));

    let response: Response;
    try {
      response = await fetchImpl(url.toString(), { headers: authHeaders(token) });
    } catch (error) {
      throw toGitHubApiError(error);
    }

    const pageRateLimit = readRateLimit(response.headers);
    rateLimit = {
      remaining: pageRateLimit.remaining ?? rateLimit.remaining,
      resetAt: pageRateLimit.resetAt ?? rateLimit.resetAt,
    };

    if (!response.ok) {
      const body = await readErrorBody(response);
      throw errorFromResponse(response.status, response.headers, body);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GitHubApiError('invalid_response', 'GitHub returned invalid JSON.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new GitHubApiError('invalid_response', 'GitHub returned an unexpected payload.');
    }

    const record = payload as {
      items?: unknown;
      incomplete_results?: unknown;
      total_count?: unknown;
    };

    if (!Array.isArray(record.items)) {
      throw new GitHubApiError('invalid_response', 'GitHub response is missing items.');
    }

    if (record.incomplete_results === true) {
      truncated = true;
    }

    for (const item of record.items) {
      const normalized = normalize(item, login);
      if (normalized) events.push(normalized);
    }

    if (record.items.length < perPage) {
      break;
    }

    if (page === maxPages) {
      truncated = true;
      break;
    }

    if (
      typeof record.total_count === 'number' &&
      Number.isFinite(record.total_count) &&
      record.total_count > page * perPage
    ) {
      // More results exist and we may still fetch them; keep going.
      continue;
    }
  }

  return { events, truncated, rateLimit };
}

export async function fetchGitHubUser(
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<GitHubUser> {
  const payload = await requestJson(`${API_BASE}/user`, token, fetchImpl);

  if (!payload || typeof payload !== 'object') {
    throw new GitHubApiError('invalid_response', 'GitHub returned an unexpected user payload.');
  }

  const record = payload as { login?: unknown; id?: unknown };
  if (typeof record.login !== 'string' || typeof record.id !== 'number') {
    throw new GitHubApiError('invalid_response', 'GitHub user payload is missing login/id.');
  }

  return { login: record.login, id: record.id };
}

/**
 * Merge a Date into a GitHub search qualifier. GitHub accepts ISO 8601.
 */
function sinceQualifier(prefix: string, since: Date | null): string {
  if (!since) return '';
  return ` ${prefix}:>=${since.toISOString()}`;
}

export async function searchCommits(
  token: string,
  login: string,
  options: GitHubRequestOptions = {}
): Promise<SearchResult> {
  return paginate({
    token,
    login,
    endpoint: 'commits',
    buildQuery: (user, since) => `author:${user}${sinceQualifier('committer-date', since)}`,
    sort: 'committer-date',
    order: 'desc',
    normalize: (item, user) => normalizeCommit(item as Parameters<typeof normalizeCommit>[0], user),
    options,
  });
}

export async function searchMergedPullRequests(
  token: string,
  login: string,
  options: GitHubRequestOptions = {}
): Promise<SearchResult> {
  return paginate({
    token,
    login,
    endpoint: 'issues',
    buildQuery: (user, since) =>
      `is:pr is:merged author:${user}${sinceQualifier('merged', since)}`,
    sort: 'updated',
    order: 'desc',
    normalize: (item, user) => normalizeMergedPr(item as Parameters<typeof normalizeMergedPr>[0], user),
    options,
  });
}
