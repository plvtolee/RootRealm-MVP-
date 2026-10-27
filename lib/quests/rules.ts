import type { Quest } from '@/lib/types';

type RuleInput = Pick<
  Quest,
  'activity_type' | 'requirement_count' | 'window_days' | 'exclude_merge_commits'
>;

/** Human-readable summary of a quest's activity rule, used in the UI. */
export function describeQuestRule(quest: RuleInput): string {
  const type = quest.activity_type;
  const count = quest.requirement_count;

  if (!type || !count) {
    return 'Complete this quest.';
  }

  const noun = type === 'commit' ? 'commit' : 'merged pull request';
  const plural = count === 1 ? noun : `${noun}s`;
  const window =
    quest.window_days == null
      ? 'all time'
      : `in the last ${quest.window_days} day${quest.window_days === 1 ? '' : 's'}`;

  if (type === 'commit') {
    const mergeNote = quest.exclude_merge_commits ? ', excluding merge commits' : '';
    return `Land ${count} ${plural} (${window}${mergeNote}).`;
  }

  return `Merge ${count} ${plural} (${window}).`;
}
