import type { GitHubRateLimit } from './types';

export type GitHubErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'server_error'
  | 'network_error'
  | 'invalid_response';

export interface GitHubApiErrorOptions {
  status?: number;
  resetAt?: Date | null;
  remaining?: number | null;
}

export class GitHubApiError extends Error {
  readonly code: GitHubErrorCode;
  readonly status?: number;
  readonly resetAt: Date | null;
  readonly remaining: number | null;

  constructor(code: GitHubErrorCode, message: string, options: GitHubApiErrorOptions = {}) {
    super(message);
    this.name = 'GitHubApiError';
    this.code = code;
    this.status = options.status;
    this.resetAt = options.resetAt ?? null;
    this.remaining = options.remaining ?? null;
  }
}

export function readRateLimit(headers: Headers): GitHubRateLimit {
  const remainingRaw = headers.get('x-ratelimit-remaining');
  const resetRaw = headers.get('x-ratelimit-reset');

  const remaining =
    remainingRaw !== null && remainingRaw !== '' && Number.isFinite(Number(remainingRaw))
      ? Number(remainingRaw)
      : null;

  const resetAt =
    resetRaw !== null && resetRaw !== '' && Number.isFinite(Number(resetRaw))
      ? new Date(Number(resetRaw) * 1000)
      : null;

  return { remaining, resetAt };
}

/**
 * Convert a non-OK GitHub response into a typed error.
 * Distinguishes primary/secondary rate limits from ordinary forbidden errors.
 */
export function errorFromResponse(
  status: number,
  headers: Headers,
  bodyText: string
): GitHubApiError {
  const rateLimit = readRateLimit(headers);
  const retryAfterRaw = headers.get('retry-after');
  const retryAfterSeconds =
    retryAfterRaw !== null && Number.isFinite(Number(retryAfterRaw))
      ? Number(retryAfterRaw)
      : null;

  const retryAt =
    retryAfterSeconds !== null ? new Date(Date.now() + retryAfterSeconds * 1000) : null;

  if (status === 401) {
    return new GitHubApiError('unauthorized', 'GitHub token is invalid or revoked.', {
      status,
      resetAt: rateLimit.resetAt,
      remaining: rateLimit.remaining,
    });
  }

  if (status === 403 || status === 429) {
    const body = bodyText.toLowerCase();
    const isRateLimit =
      status === 429 ||
      rateLimit.remaining === 0 ||
      retryAfterSeconds !== null ||
      body.includes('rate limit') ||
      body.includes('abuse detection');

    if (isRateLimit) {
      return new GitHubApiError('rate_limited', 'GitHub rate limit reached.', {
        status,
        resetAt: retryAt ?? rateLimit.resetAt,
        remaining: rateLimit.remaining,
      });
    }

    return new GitHubApiError('forbidden', 'GitHub rejected the request.', {
      status,
      resetAt: rateLimit.resetAt,
      remaining: rateLimit.remaining,
    });
  }

  if (status >= 500) {
    return new GitHubApiError('server_error', 'GitHub is temporarily unavailable.', {
      status,
      resetAt: rateLimit.resetAt,
      remaining: rateLimit.remaining,
    });
  }

  return new GitHubApiError('invalid_response', `Unexpected GitHub response (${status}).`, {
    status,
    resetAt: rateLimit.resetAt,
    remaining: rateLimit.remaining,
  });
}

export function toGitHubApiError(error: unknown): GitHubApiError {
  if (error instanceof GitHubApiError) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Unknown GitHub error';
  return new GitHubApiError('network_error', message);
}
