import type { ActivityEvent } from './types';

/**
 * Normalize GitHub Search API payloads into the internal event shape.
 *
 * Rules:
 * - Commits count only when attributed to the authenticated user.
 * - Bot-authored activity is dropped.
 * - Merge commits are kept but flagged (`isMerge`) so SQL evaluation can
 *   exclude them per quest.
 * - Merged PRs require a non-null `merged_at`.
 * - Malformed entries return null rather than throwing the whole sync.
 */

interface RawCommitItem {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { name?: string; email?: string; date?: string };
    committer?: { date?: string };
  };
  author?: { login?: string; type?: string } | null;
  parents?: Array<{ sha?: string }>;
  repository?: { full_name?: string };
}

interface RawIssueItem {
  number?: number;
  title?: string;
  html_url?: string;
  user?: { login?: string; type?: string } | null;
  repository_url?: string;
  repository?: { full_name?: string };
  pull_request?: { merged_at?: string | null };
}

function toIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function firstLine(message: string | undefined): string | undefined {
  if (!message) return undefined;
  const line = message.split('\n')[0]?.trim();
  return line && line.length > 0 ? line.slice(0, 200) : undefined;
}

export function parseRepoFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;

  const apiMatch = url.match(/\/repos\/([^/]+)\/([^/]+)\/?$/);
  if (apiMatch) {
    return `${apiMatch[1]}/${apiMatch[2]}`;
  }

  const htmlMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (htmlMatch) {
    return `${htmlMatch[1]}/${htmlMatch[2]}`;
  }

  return null;
}

export function normalizeCommit(item: RawCommitItem, githubLogin: string): ActivityEvent | null {
  if (!item.sha) return null;

  const authorLogin = item.author?.login;
  if (!authorLogin) return null;
  if (authorLogin.toLowerCase() !== githubLogin.toLowerCase()) return null;
  if (item.author?.type === 'Bot') return null;

  const occurredAt = toIso(item.commit?.committer?.date ?? item.commit?.author?.date);
  if (!occurredAt) return null;

  const repoFullName =
    item.repository?.full_name ?? parseRepoFromUrl(item.html_url) ?? null;
  if (!repoFullName) return null;

  const parentsCount = item.parents?.length ?? 0;

  return {
    activityType: 'commit',
    externalId: item.sha,
    repoFullName,
    occurredAt,
    metadata: {
      message: firstLine(item.commit?.message),
      url: item.html_url,
      authorLogin,
      parentsCount,
      isMerge: parentsCount > 1,
      isBot: false,
    },
  };
}

export function normalizeMergedPr(item: RawIssueItem, githubLogin: string): ActivityEvent | null {
  const mergedAt = item.pull_request?.merged_at;
  if (!mergedAt) return null;

  if (typeof item.number !== 'number' || !Number.isFinite(item.number)) return null;

  const authorLogin = item.user?.login;
  if (!authorLogin) return null;
  if (authorLogin.toLowerCase() !== githubLogin.toLowerCase()) return null;
  if (item.user?.type === 'Bot') return null;

  const occurredAt = toIso(mergedAt);
  if (!occurredAt) return null;

  const repoFullName =
    item.repository?.full_name ??
    parseRepoFromUrl(item.repository_url) ??
    parseRepoFromUrl(item.html_url);
  if (!repoFullName) return null;

  return {
    activityType: 'merged_pr',
    externalId: `${repoFullName}#${item.number}`,
    repoFullName,
    occurredAt,
    metadata: {
      title: item.title,
      url: item.html_url,
      authorLogin,
      number: item.number,
      isBot: false,
    },
  };
}
