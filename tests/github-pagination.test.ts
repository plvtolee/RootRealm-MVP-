import { describe, expect, it, vi } from 'vitest';
import { searchCommits, searchMergedPullRequests } from '@/lib/github/client';
import { GitHubApiError } from '@/lib/github/errors';

function response(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function commitItem(sha: string) {
  return {
    sha,
    html_url: `https://github.com/octocat/hello/commit/${sha}`,
    commit: {
      message: `commit ${sha}`,
      author: { date: '2024-01-01T00:00:00Z' },
      committer: { date: '2024-01-01T00:00:00Z' },
    },
    author: { login: 'octocat', type: 'User' },
    parents: [{ sha: 'parent' }],
    repository: { full_name: 'octocat/hello' },
  };
}

function prItem(number: number) {
  return {
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/octocat/hello/pull/${number}`,
    user: { login: 'octocat', type: 'User' },
    repository_url: 'https://api.github.com/repos/octocat/hello',
    pull_request: { merged_at: '2024-02-01T00:00:00Z' },
  };
}

function asFetch(mock: ReturnType<typeof vi.fn>) {
  return mock as unknown as typeof fetch;
}

function calledUrl(mock: ReturnType<typeof vi.fn>, index: number): URL {
  const call = mock.mock.calls[index] as [string];
  return new URL(call[0]);
}

describe('GitHub Search API pagination', () => {
  it('stops after a short page and builds the commit query', async () => {
    const mock = vi.fn(async () =>
      response({ total_count: 1, incomplete_results: false, items: [commitItem('a')] })
    );

    const result = await searchCommits('token', 'octocat', {
      fetchImpl: asFetch(mock),
      perPage: 100,
    });

    expect(result.events).toHaveLength(1);
    expect(result.truncated).toBe(false);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(calledUrl(mock, 0).searchParams.get('q')).toBe('author:octocat');
    expect(calledUrl(mock, 0).searchParams.get('per_page')).toBe('100');
    expect(calledUrl(mock, 0).searchParams.get('page')).toBe('1');
  });

  it('follows pages sequentially and stops when exhausted', async () => {
    const pages = [
      [commitItem('a'), commitItem('b')],
      [commitItem('c')],
    ];
    let call = 0;
    const mock = vi.fn(async () =>
      response({
        total_count: 3,
        incomplete_results: false,
        items: pages[call++] ?? [],
      })
    );

    const result = await searchCommits('token', 'octocat', {
      fetchImpl: asFetch(mock),
      perPage: 2,
      maxPages: 5,
    });

    expect(result.events.map((event) => event.externalId)).toEqual(['a', 'b', 'c']);
    expect(result.truncated).toBe(false);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(calledUrl(mock, 1).searchParams.get('page')).toBe('2');
  });

  it('marks results truncated when the page cap is reached', async () => {
    const pages = [
      [commitItem('a'), commitItem('b')],
      [commitItem('c'), commitItem('d')],
    ];
    let call = 0;
    const mock = vi.fn(async () =>
      response({
        total_count: 4,
        incomplete_results: false,
        items: pages[call++] ?? [],
      })
    );

    const result = await searchCommits('token', 'octocat', {
      fetchImpl: asFetch(mock),
      perPage: 2,
      maxPages: 2,
    });

    expect(result.events.map((event) => event.externalId)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(result.truncated).toBe(true);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('treats incomplete_results as truncation', async () => {
    const mock = vi.fn(async () =>
      response({
        total_count: 1,
        incomplete_results: true,
        items: [commitItem('a')],
      })
    );

    const result = await searchCommits('token', 'octocat', {
      fetchImpl: asFetch(mock),
      perPage: 100,
    });

    expect(result.truncated).toBe(true);
  });

  it('reports rate limits with the reset time', async () => {
    const reset = 1_700_000_000;
    const mock = vi.fn(async () =>
      response(
        { message: 'API rate limit exceeded' },
        {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(reset),
          },
        }
      )
    );

    try {
      await searchCommits('token', 'octocat', {
        fetchImpl: asFetch(mock),
        perPage: 100,
      });
      expect.unreachable('expected a rate limit error');
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError);
      const apiError = error as GitHubApiError;
      expect(apiError.code).toBe('rate_limited');
      expect(apiError.resetAt?.getTime()).toBe(reset * 1000);
    }
  });

  it('reports revoked credentials as unauthorized', async () => {
    const mock = vi.fn(async () =>
      response({ message: 'Bad credentials' }, { status: 401 })
    );

    await expect(
      searchCommits('token', 'octocat', {
        fetchImpl: asFetch(mock),
        perPage: 100,
      })
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('builds the merged-PR query with an overlap boundary', async () => {
    const mock = vi.fn(async () =>
      response({ total_count: 0, incomplete_results: false, items: [] })
    );

    await searchMergedPullRequests('token', 'octocat', {
      fetchImpl: asFetch(mock),
      since: new Date('2024-01-01T00:00:00.000Z'),
      perPage: 100,
    });

    expect(calledUrl(mock, 0).searchParams.get('q')).toBe(
      'is:pr is:merged author:octocat merged:>=2024-01-01T00:00:00.000Z'
    );
  });
});
