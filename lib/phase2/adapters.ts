import type {
  Cosmetic,
  Profile,
  ProfileActivityStats,
  Quest,
  QuestProgressStatus,
} from '@/lib/types';
import type { Progression } from '@/lib/progression';
import type {
  EquippedCosmetic,
  GitHubUiStatus,
  ProfileAchievement,
  ProfileAttribute,
  RootRealmChrome,
  RootRealmCosmetic,
  RootRealmProfileData,
  RootRealmQuest,
} from '@/components/phase2/types';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

const COSMETIC_TYPE_LABELS: Record<string, string> = {
  avatar_border: 'AVATAR BORDER',
};

const COSMETIC_ICONS: Record<string, string> = {
  basic: '◇',
  silver: '◈',
  gold: '✧',
  neon: '⌁',
};

/**
 * Structural inputs. The real Phase 1 rows are assignable to these, but the
 * adapter does not import the server-only query modules, so it stays testable.
 */
export interface ProfileAdapterInput {
  profile: Profile;
  equipped: Cosmetic | null;
  questsCompleted: number;
  progression: Progression;
  github:
    | {
        last_synced_at: string | null;
        needs_reauth: boolean;
        initial_sync_completed_at?: string | null;
        commits_history_complete?: boolean;
        prs_history_complete?: boolean;
      }
    | null;
}

export interface QuestAdapterInput extends Quest {
  completed: boolean;
  progress: number;
  target: number;
  status: QuestProgressStatus;
}

export interface CosmeticAdapterInput extends Cosmetic {
  owned: boolean;
  equipped: boolean;
}

export function toPhase2Chrome(profile: Profile): RootRealmChrome {
  return {
    name: profile.username,
    login: profile.username,
    avatarInitial: profileInitial(profile.username),
    avatarUrl: profile.avatar_url,
    codeCoins: profile.coins,
  };
}

export function toPhase2Quests(quests: QuestAdapterInput[]): RootRealmQuest[] {
  return quests.map((quest) => ({
    id: quest.id,
    title: quest.title,
    category: `${activityLabel(quest.activity_type)} · ${quest.difficulty.toUpperCase()}`,
    description: quest.description,
    icon: questIcon(quest.activity_type),
    current: quest.progress,
    target: quest.target,
    xp: quest.xp_reward,
    coins: quest.coin_reward,
    status: questStatus(quest),
  }));
}

export function toPhase2Cosmetics(
  cosmetics: CosmeticAdapterInput[]
): RootRealmCosmetic[] {
  return cosmetics.map((item) => {
    const action = item.equipped ? 'equipped' : item.owned ? 'equip' : 'purchase';

    return {
      id: item.id,
      name: item.name,
      kind: cosmeticTypeLabel(item.cosmetic_type),
      tier: item.preview_value.toUpperCase(),
      description: item.description,
      icon: cosmeticIcon(item.preview_value),
      cost: item.price,
      previewValue: item.preview_value,
      action,
      actionLabel:
        action === 'equipped' ? 'Equipped' : action === 'equip' ? 'Equip' : 'Purchase',
    };
  });
}

export function toPhase2Profile(
  input: ProfileAdapterInput,
  quests: QuestAdapterInput[],
  stats: ProfileActivityStats
): RootRealmProfileData {
  const { profile, equipped, progression, github } = input;
  const completedQuests = quests.filter((quest) => quest.completed).length;
  const totalQuests = quests.length;
  const totalEvents = stats.commits + stats.mergedPrs;

  const levelPercent = clampPercent(Math.round(progression.progressRatio * 100));
  const questPercent = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;
  const commitShare = totalEvents > 0 ? Math.round((stats.commits / totalEvents) * 100) : 0;
  const prShare = totalEvents > 0 ? Math.round((stats.mergedPrs / totalEvents) * 100) : 0;

  const historyCoverage = github
    ? (github.commits_history_complete ? 50 : 0) + (github.prs_history_complete ? 50 : 0)
    : 0;

  const githubStatus: GitHubUiStatus = !github
    ? 'disconnected'
    : github.needs_reauth
      ? 'needs_reauth'
      : 'connected';

  const attributes: ProfileAttribute[] = [
    {
      name: 'Level progress',
      description: 'XP toward the next level',
      icon: '✦',
      value: levelPercent,
      display: `${levelPercent}%`,
      percent: levelPercent,
    },
    {
      name: 'Quest completion',
      description: 'Verified GitHub milestones',
      icon: '◇',
      value: completedQuests,
      display: `${completedQuests} / ${totalQuests}`,
      percent: questPercent,
    },
    {
      name: 'Commits authored',
      description: 'Qualifying public commits',
      icon: '⌘',
      value: stats.commits,
      display: NUMBER_FORMAT.format(stats.commits),
      percent: commitShare,
    },
    {
      name: 'Merged pull requests',
      description: 'Authored and merged PRs',
      icon: '⟡',
      value: stats.mergedPrs,
      display: NUMBER_FORMAT.format(stats.mergedPrs),
      percent: prShare,
    },
    {
      name: 'Active repositories',
      description: 'Repositories with recorded activity',
      icon: '⌂',
      value: stats.repositories,
      display: NUMBER_FORMAT.format(stats.repositories),
      percent: stats.repositories > 0 ? 100 : 0,
    },
    {
      name: 'History coverage',
      description: 'Completeness of the GitHub search history',
      icon: '⌕',
      value: historyCoverage,
      display: `${historyCoverage}%`,
      percent: historyCoverage,
    },
  ];

  const evidence = [
    { label: 'Commits recorded', value: NUMBER_FORMAT.format(stats.commits) },
    { label: 'Merged pull requests', value: NUMBER_FORMAT.format(stats.mergedPrs) },
    { label: 'Repositories', value: NUMBER_FORMAT.format(stats.repositories) },
    { label: 'Active days (UTC)', value: NUMBER_FORMAT.format(stats.activeDays) },
    { label: 'First recorded activity', value: dateOnly(stats.firstActivityAt) },
    { label: 'Last recorded activity', value: dateOnly(stats.lastActivityAt) },
    { label: 'Last GitHub sync', value: dateOnly(github?.last_synced_at ?? null) },
    {
      label: 'GitHub connection',
      value:
        githubStatus === 'connected'
          ? 'Connected'
          : githubStatus === 'needs_reauth'
            ? 'Reconnect required'
            : 'Not connected',
    },
  ];

  const achievements: ProfileAchievement[] = quests.map((quest) => ({
    name: quest.title,
    description: quest.description,
    icon: questIcon(quest.activity_type),
    unlocked: quest.completed,
  }));

  const loadout: EquippedCosmetic[] = equipped
    ? [
        {
          name: equipped.name,
          kind: cosmeticTypeLabel(equipped.cosmetic_type),
          icon: cosmeticIcon(equipped.preview_value),
          cosmeticId: equipped.preview_value,
        },
      ]
    : [{ name: 'Default frame', kind: 'AVATAR BORDER', icon: '◇' }];

  return {
    name: profile.username,
    login: profile.username,
    avatarInitial: profileInitial(profile.username),
    avatarUrl: profile.avatar_url,
    avatarFrameId: equipped?.preview_value,
    level: progression.level,
    rank: 'DEVELOPER',
    xp: progression.totalXp,
    xpIntoLevel: progression.xpIntoLevel,
    xpForNextLevel: progression.xpForNextLevel,
    questsCompleted: completedQuests,
    totalQuests,
    activityEvents: totalEvents,
    codeCoins: profile.coins,
    scoringVersion: 'V1.0',
    githubStatus,
    attributes,
    evidence,
    achievements,
    loadout,
  };
}

function questStatus(quest: QuestAdapterInput): RootRealmQuest['status'] {
  if (quest.completed || quest.status === 'completed') return 'REWARD CLAIMED';
  if (quest.status === 'indeterminate') return 'HISTORY INCOMPLETE';
  return 'IN PROGRESS';
}

function activityLabel(type: Quest['activity_type']): string {
  if (type === 'commit') return 'COMMIT';
  if (type === 'merged_pr') return 'MERGED PR';
  return 'MILESTONE';
}

function questIcon(type: Quest['activity_type']): string {
  if (type === 'commit') return '⌘';
  if (type === 'merged_pr') return '◇';
  return '✦';
}

function cosmeticTypeLabel(type: string): string {
  return COSMETIC_TYPE_LABELS[type] ?? type.replaceAll('_', ' ').toUpperCase();
}

function cosmeticIcon(previewValue: string): string {
  return COSMETIC_ICONS[previewValue] ?? '✦';
}

function profileInitial(username: string): string {
  return username.trim().slice(0, 1).toUpperCase() || '?';
}

function dateOnly(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '—';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
