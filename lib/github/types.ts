import type { ActivityType } from '@/lib/types';

export interface ActivityEventMetadata {
  title?: string;
  message?: string;
  url?: string;
  authorLogin?: string | null;
  parentsCount?: number;
  isMerge?: boolean;
  isBot?: boolean;
  number?: number;
}

/** Normalized activity event stored in `github_activity_events`. */
export interface ActivityEvent {
  activityType: ActivityType;
  externalId: string;
  repoFullName: string;
  occurredAt: string;
  metadata: ActivityEventMetadata;
}

export interface GitHubRateLimit {
  remaining: number | null;
  resetAt: Date | null;
}

export interface SearchResult {
  events: ActivityEvent[];
  /** True when the result cap or GitHub's incomplete_results flag was hit. */
  truncated: boolean;
  rateLimit: GitHubRateLimit;
}

export interface GitHubUser {
  login: string;
  id: number;
}
