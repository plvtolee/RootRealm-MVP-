import { describe, expect, it } from 'vitest';
import {
  normalizeCommit,
  normalizeMergedPr,
  parseRepoFromUrl,
} from '@/lib/github/normalize';

const login = 'octocat';

function commit(overrides: Record<string, unknown> = {}) {
  return {
    sha: 'abc123',
    html_url: 'https://github.com/octocat/hello/commit/abc123',
    commit: {
      message: 'feat: add thing\n\nbody text',
      author: { date: '2024-01-01T00:00:00Z' },
      committer: { date: '2024-01-02T03:04:05Z' },
    },
    author: { login: 'octocat', type: 'User' },
    parents: [{ sha: 'p1' }],
    repository: { full_name: 'octocat/hello' },
    ...overrides,
  };
}

function pr(overrides: Record<string, unknown> = {}) {
  return {
    number: 42,
    title: 'Add feature',
    html_url: 'https://github.com/octocat/hello/pull/42',
    user: { login: 'octocat', type: 'User' },
    repository_url: 'https://api.github.com/repos/octocat/hello',
    pull_request: { merged_at: '2024-02-01T12:00:00Z' },
    ...overrides,
  };
}

describe('normalizeCommit', () => {
  it('normalizes a qualifying commit', () => {
    const event = normalizeCommit(commit(), login);

    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      activityType: 'commit',
      externalId: 'abc123',
      repoFullName: 'octocat/hello',
      occurredAt: '2024-01-02T03:04:05.000Z',
      metadata: {
        message: 'feat: add thing',
        authorLogin: 'octocat',
        parentsCount: 1,
        isMerge: false,
        isBot: false,
      },
    });
  });

  it('flags merge commits without dropping them', () => {
    const event = normalizeCommit(
      commit({ parents: [{ sha: 'p1' }, { sha: 'p2' }] }),
      login
    );

    expect(event?.metadata.isMerge).toBe(true);
    expect(event?.metadata.parentsCount).toBe(2);
  });

  it('drops bot-authored commits', () => {
    expect(
      normalizeCommit(commit({ author: { login: 'octocat', type: 'Bot' } }), login)
    ).toBeNull();
  });

  it('drops commits attributed to another user', () => {
    expect(
      normalizeCommit(commit({ author: { login: 'someone-else', type: 'User' } }), login)
    ).toBeNull();
  });

  it('drops commits with no linked GitHub author', () => {
    expect(normalizeCommit(commit({ author: null }), login)).toBeNull();
  });

  it('drops malformed commits', () => {
    expect(normalizeCommit(commit({ sha: undefined }), login)).toBeNull();
    expect(
      normalizeCommit(commit({ commit: { message: 'x' } }), login)
    ).toBeNull();
    expect(normalizeCommit(commit({ repository: undefined, html_url: undefined }), login)).toBeNull();
  });
});

describe('normalizeMergedPr', () => {
  it('normalizes a merged pull request', () => {
    const event = normalizeMergedPr(pr(), login);

    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      activityType: 'merged_pr',
      externalId: 'octocat/hello#42',
      repoFullName: 'octocat/hello',
      occurredAt: '2024-02-01T12:00:00.000Z',
      metadata: {
        title: 'Add feature',
        authorLogin: 'octocat',
        number: 42,
        isBot: false,
      },
    });
  });

  it('drops unmerged pull requests', () => {
    expect(
      normalizeMergedPr(pr({ pull_request: { merged_at: null } }), login)
    ).toBeNull();
  });

  it('drops bot-authored pull requests', () => {
    expect(
      normalizeMergedPr(pr({ user: { login: 'octocat', type: 'Bot' } }), login)
    ).toBeNull();
  });

  it('drops pull requests attributed to another user', () => {
    expect(
      normalizeMergedPr(pr({ user: { login: 'someone-else', type: 'User' } }), login)
    ).toBeNull();
  });

  it('drops malformed pull requests', () => {
    expect(normalizeMergedPr(pr({ number: 'forty-two' }), login)).toBeNull();
    expect(normalizeMergedPr(pr({ user: null }), login)).toBeNull();
    expect(
      normalizeMergedPr(pr({ repository_url: undefined, html_url: undefined }), login)
    ).toBeNull();
  });
});

describe('parseRepoFromUrl', () => {
  it('parses API repository URLs', () => {
    expect(parseRepoFromUrl('https://api.github.com/repos/octocat/hello')).toBe(
      'octocat/hello'
    );
  });

  it('parses HTML repository URLs', () => {
    expect(parseRepoFromUrl('https://github.com/octocat/hello/pull/42')).toBe(
      'octocat/hello'
    );
  });

  it('returns null for unrelated URLs', () => {
    expect(parseRepoFromUrl('https://example.com/nope')).toBeNull();
    expect(parseRepoFromUrl(null)).toBeNull();
  });
});
