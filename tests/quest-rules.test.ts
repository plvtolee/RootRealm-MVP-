import { describe, expect, it } from 'vitest';
import { describeQuestRule } from '@/lib/quests/rules';

describe('describeQuestRule', () => {
  it('describes all-time commit milestones', () => {
    expect(
      describeQuestRule({
        activity_type: 'commit',
        requirement_count: 5,
        window_days: null,
        exclude_merge_commits: true,
      })
    ).toBe('Land 5 commits (all time, excluding merge commits).');
  });

  it('describes all-time merged-PR milestones', () => {
    expect(
      describeQuestRule({
        activity_type: 'merged_pr',
        requirement_count: 1,
        window_days: null,
        exclude_merge_commits: true,
      })
    ).toBe('Merge 1 merged pull request (all time).');
  });

  it('describes windowed milestones when configured', () => {
    expect(
      describeQuestRule({
        activity_type: 'commit',
        requirement_count: 10,
        window_days: 90,
        exclude_merge_commits: false,
      })
    ).toBe('Land 10 commits (in the last 90 days).');
  });

  it('falls back for quests without an activity rule', () => {
    expect(
      describeQuestRule({
        activity_type: null,
        requirement_count: null,
        window_days: null,
        exclude_merge_commits: true,
      })
    ).toBe('Complete this quest.');
  });
});
