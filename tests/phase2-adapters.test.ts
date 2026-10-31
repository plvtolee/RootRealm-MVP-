import { describe, expect, it } from 'vitest';
import {
  toPhase2Chrome,
  toPhase2Cosmetics,
  toPhase2Profile,
  toPhase2Quests,
  type CosmeticAdapterInput,
  type ProfileAdapterInput,
  type QuestAdapterInput,
} from '@/lib/phase2/adapters';
import type { Cosmetic, Profile, ProfileActivityStats } from '@/lib/types';

const profile: Profile = {
  id: 'user-1',
  username: 'octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  total_xp: 250,
  coins: 120,
  equipped_cosmetic_id: 'cosmetic-aurum',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const aurumCircuit: Cosmetic = {
  id: 'cosmetic-aurum',
  name: 'Aurum Circuit',
  description: 'Traced gold circuitry loops the border like current through warm copper.',
  cosmetic_type: 'avatar_border',
  preview_value: 'aurum-circuit',
  price: 110,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  rarity: 'rare',
  category: 'Frame',
  is_exclusive: false,
};

function quest(overrides: Partial<QuestAdapterInput> & Pick<QuestAdapterInput, 'id' | 'title'>): QuestAdapterInput {
  return {
    description: 'Quest description',
    difficulty: 'easy',
    xp_reward: 25,
    coin_reward: 10,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    activity_type: 'commit',
    requirement_count: 1,
    window_days: null,
    exclude_merge_commits: true,
    repo_filter: null,
    completed: false,
    progress: 0,
    target: 1,
    status: 'in_progress',
    ...overrides,
  };
}

const quests: QuestAdapterInput[] = [
  quest({
    id: 'q1',
    title: 'First Commit',
    completed: true,
    progress: 1,
    target: 1,
    status: 'completed',
  }),
  quest({
    id: 'q2',
    title: 'First Merge',
    activity_type: 'merged_pr',
    difficulty: 'hard',
    progress: 2,
    target: 10,
    status: 'indeterminate',
  }),
  quest({
    id: 'q3',
    title: 'Ten Commits',
    activity_type: 'commit',
    difficulty: 'medium',
    progress: 4,
    target: 10,
    status: 'in_progress',
  }),
];

const stats: ProfileActivityStats = {
  commits: 3,
  mergedPrs: 1,
  repositories: 2,
  activeDays: 2,
  firstActivityAt: '2026-01-02T10:00:00.000Z',
  lastActivityAt: '2026-01-04T10:00:00.000Z',
};

const input: ProfileAdapterInput = {
  profile,
  equipped: aurumCircuit,
  questsCompleted: 1,
  progression: {
    level: 3,
    totalXp: 250,
    xpIntoLevel: 50,
    xpForNextLevel: 100,
    progressRatio: 0.5,
  },
  github: {
    last_synced_at: '2026-01-05T12:00:00.000Z',
    needs_reauth: false,
    commits_history_complete: true,
    prs_history_complete: true,
  },
};

describe('Phase 2 adapters', () => {
  it('builds chrome data from the real profile', () => {
    expect(toPhase2Chrome(profile)).toEqual({
      name: 'octocat',
      login: 'octocat',
      avatarInitial: 'O',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
      codeCoins: 120,
    });
  });

  it('maps quest status, activity, and difficulty without inventing a claim state', () => {
    const mapped = toPhase2Quests(quests);

    expect(mapped[0]).toMatchObject({
      title: 'First Commit',
      category: 'COMMIT · EASY',
      icon: '⌘',
      status: 'REWARD CLAIMED',
    });
    expect(mapped[1]).toMatchObject({
      title: 'First Merge',
      category: 'MERGED PR · HARD',
      icon: '◇',
      status: 'HISTORY INCOMPLETE',
    });
    expect(mapped[2]).toMatchObject({
      title: 'Ten Commits',
      category: 'COMMIT · MEDIUM',
      status: 'IN PROGRESS',
    });
  });

  it('maps owned, equipped, and purchasable cosmetics to real actions', () => {
    const cosmetics: CosmeticAdapterInput[] = [
      { ...aurumCircuit, owned: true, equipped: true },
      {
        ...aurumCircuit,
        id: 'cosmetic-neon',
        name: 'Neon Pulse',
        preview_value: 'neon-pulse',
        price: 240,
        rarity: 'epic',
        category: 'Aura',
        owned: true,
        equipped: false,
      },
      {
        ...aurumCircuit,
        id: 'cosmetic-silver',
        name: 'Silverline',
        preview_value: 'silverline',
        price: 45,
        rarity: 'common',
        category: 'Frame',
        owned: false,
        equipped: false,
      },
    ];

    const mapped = toPhase2Cosmetics(cosmetics);

    expect(mapped[0]).toMatchObject({
      action: 'equipped',
      actionLabel: 'Equipped',
      kind: 'AVATAR BORDER',
      rarity: 'rare',
      rarityLabel: 'Rare',
      category: 'Frame',
      previewValue: 'aurum-circuit',
      isExclusive: false,
      owned: true,
    });
    expect(mapped[1]).toMatchObject({
      action: 'equip',
      actionLabel: 'Equip',
      rarity: 'epic',
      rarityLabel: 'Epic',
      category: 'Aura',
      owned: true,
    });
    expect(mapped[2]).toMatchObject({
      action: 'purchase',
      actionLabel: 'Purchase',
      rarity: 'common',
      rarityLabel: 'Common',
      owned: false,
    });
  });

  it('derives profile metrics, signals, evidence, milestones, and loadout from real data', () => {
    const result = toPhase2Profile(input, quests, stats);

    expect(result.level).toBe(3);
    expect(result.xp).toBe(250);
    expect(result.xpIntoLevel).toBe(50);
    expect(result.xpForNextLevel).toBe(100);
    expect(result.questsCompleted).toBe(1);
    expect(result.totalQuests).toBe(3);
    expect(result.activityEvents).toBe(4);
    expect(result.codeCoins).toBe(120);
    expect(result.githubStatus).toBe('connected');
    expect(result.avatarFrameId).toBe('aurum-circuit');
    expect(result.avatarComposition).toBe('square');
    expect(result.loadout[0]).toMatchObject({
      name: 'Aurum Circuit',
      kind: 'AVATAR BORDER',
      cosmeticId: 'aurum-circuit',
      rarity: 'rare',
      category: 'Frame',
    });

    expect(result.attributes.find((item) => item.name === 'Commits authored')).toMatchObject({
      display: '3',
      percent: 75,
    });
    expect(
      result.attributes.find((item) => item.name === 'Merged pull requests')
    ).toMatchObject({ display: '1', percent: 25 });
    expect(result.attributes.find((item) => item.name === 'History coverage')).toMatchObject({
      display: '100%',
      percent: 100,
    });

    expect(result.evidence).toContainEqual({ label: 'Repositories', value: '2' });
    expect(result.evidence).toContainEqual({
      label: 'First recorded activity',
      value: '2026-01-02',
    });
    expect(result.achievements.filter((item) => item.unlocked)).toHaveLength(1);
  });

  it('uses honest defaults when no cosmetic or GitHub connection exists', () => {
    const result = toPhase2Profile(
      { ...input, equipped: null, github: null },
      quests,
      stats
    );

    expect(result.avatarFrameId).toBeUndefined();
    expect(result.loadout[0]).toMatchObject({ name: 'Default frame', kind: 'AVATAR BORDER' });
    expect(result.githubStatus).toBe('disconnected');
    expect(result.attributes.find((item) => item.name === 'History coverage')).toMatchObject({
      display: '0%',
      percent: 0,
    });
  });
});
