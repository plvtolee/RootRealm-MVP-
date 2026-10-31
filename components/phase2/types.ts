import type { CosmeticComposition, CosmeticRarity } from '@/lib/types';

/**
 * Phase 2 presentation types.
 *
 * These describe the UI kit's view model only. They are deliberately separate
 * from the Phase 1 domain types in `lib/types.ts`; adapters translate the real
 * database rows into these shapes at the UI boundary.
 */

export type RootRealmSection = 'profile' | 'quests' | 'shop' | 'community';

/**
 * Phase 1 awards quest rewards automatically in SQL when verified GitHub
 * activity reaches the target. There is no separate claim step, so the UI uses
 * "REWARD CLAIMED" to mean "reward already awarded".
 */
export type QuestStatus = 'IN PROGRESS' | 'REWARD CLAIMED' | 'HISTORY INCOMPLETE';

/** Actions the shop can send to the existing Phase 1 handlers. */
export type CosmeticAction = 'purchase' | 'equip' | 'unequip';

/** Cosmetic state as rendered by the shop. `equipped` is display-only. */
export type CosmeticState = CosmeticAction | 'equipped';

export interface ProfileAttribute {
  name: string;
  description: string;
  icon: string;
  /** Numeric value used for sorting/accessibility; `display` is shown if set. */
  value: number;
  /** Optional formatted display value (e.g. "12 / 20"). */
  display?: string;
  /** Optional 0..100 value for the progress bar. Defaults to `value`. */
  percent?: number;
}

export interface ProfileAchievement {
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface EquippedCosmetic {
  name: string;
  kind: string;
  icon: string;
  /** Phase 1 `preview_value`, used for the cosmetic-specific accent CSS. */
  cosmeticId?: string;
  rarity?: CosmeticRarity;
  category?: string;
  composition?: CosmeticComposition;
}

/** Identity + currency shown in the persistent top bar. */
export interface RootRealmChrome {
  name: string;
  login: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  codeCoins: number;
}

export type GitHubUiStatus = 'connected' | 'needs_reauth' | 'disconnected';

export interface RootRealmProfileData {
  name: string;
  login: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  /** Phase 1 `preview_value` of the equipped avatar border, if any. */
  avatarFrameId?: string;
  /** How the equipped portrait sits inside the frame. */
  avatarComposition?: CosmeticComposition;
  level: number;
  rank: string;
  /** Lifetime XP. */
  xp: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP required to finish the current level. */
  xpForNextLevel: number;
  questsCompleted: number;
  totalQuests: number;
  activityEvents: number;
  codeCoins: number;
  scoringVersion: string;
  githubStatus: GitHubUiStatus;
  attributes: ProfileAttribute[];
  evidence: { label: string; value: string | number }[];
  achievements: ProfileAchievement[];
  loadout: EquippedCosmetic[];
}

export interface RootRealmQuest {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  xp: number;
  coins: number;
  skillPoints?: number;
  status: QuestStatus;
}

export interface RootRealmCosmetic {
  id: string;
  name: string;
  /** Equipment-slot label (`AVATAR BORDER`). */
  kind: string;
  /** Presentation grouping used by the shop filters. */
  category: string;
  rarity: CosmeticRarity;
  rarityLabel: string;
  description: string;
  icon: string;
  cost: number;
  /** Phase 1 `preview_value`, used for the cosmetic-specific artwork. */
  previewValue: string;
  composition: CosmeticComposition;
  /** Creator Exclusive items are never purchasable. */
  isExclusive: boolean;
  owned: boolean;
  action: CosmeticState;
  actionLabel: string;
}

export interface Phase2Feedback {
  type: 'success' | 'error';
  message: string;
}
