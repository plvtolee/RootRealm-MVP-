import type { CosmeticRarity } from '@/lib/types';

/**
 * Five-tier rarity system.
 *
 * Rarity describes collectible prestige, not theme. Colours are deliberately
 * independent from cosmetic motifs so a Legendary is not always gold and a
 * Mythical is not always purple.
 */
export interface RarityMeta {
  id: CosmeticRarity;
  label: string;
  order: number;
  /** Primary badge/accent colour. */
  color: string;
  /** Soft glow used in borders and auras. */
  glow: string;
  /** Rarity tiers at or above this one are animated. */
  animated: boolean;
  /** One-line collector-facing summary. */
  blurb: string;
}

export const RARITY_META: Record<CosmeticRarity, RarityMeta> = {
  common: {
    id: 'common',
    label: 'Common',
    order: 1,
    color: '#a7b0bd',
    glow: 'rgba(167, 176, 189, 0.18)',
    animated: false,
    blurb: 'Quiet, permanent entry-level collectibles.',
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    order: 2,
    color: '#5aa9ff',
    glow: 'rgba(90, 169, 255, 0.22)',
    animated: false,
    blurb: 'Refined frames with a little more story in the detail.',
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    order: 3,
    color: '#b07cff',
    glow: 'rgba(176, 124, 255, 0.24)',
    animated: false,
    blurb: 'Premium static pieces with intricate compositions.',
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    order: 4,
    color: '#ffbf4d',
    glow: 'rgba(255, 191, 77, 0.28)',
    animated: true,
    blurb: 'Living borders with their own motion and atmosphere.',
  },
  mythical: {
    id: 'mythical',
    label: 'Mythical',
    order: 5,
    color: '#ff5c8a',
    glow: 'rgba(255, 92, 138, 0.3)',
    animated: true,
    blurb: 'Multi-layer animated showpieces. The rarest standard tier.',
  },
};

export const RARITY_ORDER: CosmeticRarity[] = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythical',
];

export function isRarity(value: unknown): value is CosmeticRarity {
  return typeof value === 'string' && value in RARITY_META;
}

export function rarityMeta(value: string | null | undefined): RarityMeta {
  return isRarity(value) ? RARITY_META[value] : RARITY_META.common;
}

export function rarityOrder(value: string | null | undefined): number {
  return rarityMeta(value).order;
}