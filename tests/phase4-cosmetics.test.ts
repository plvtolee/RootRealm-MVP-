import { describe, expect, it } from 'vitest';
import { RARITY_META, RARITY_ORDER, rarityMeta, rarityOrder } from '@/lib/cosmetics/rarity';
import { COSMETIC_VISUALS, cosmeticComposition, cosmeticFrame, cosmeticVisual } from '@/lib/cosmetics/visuals';
import { FEATURED_RELEASE } from '@/lib/cosmetics/release';

describe('Phase 4 rarity system', () => {
  it('defines exactly five ascending tiers', () => {
    expect(RARITY_ORDER).toEqual(['common', 'rare', 'epic', 'legendary', 'mythical']);
    expect(Object.keys(RARITY_META)).toHaveLength(5);
    expect(RARITY_ORDER.map((tier) => RARITY_META[tier].order)).toEqual([1, 2, 3, 4, 5]);
  });

  it('only animates legendary and mythical tiers', () => {
    expect(RARITY_META.common.animated).toBe(false);
    expect(RARITY_META.rare.animated).toBe(false);
    expect(RARITY_META.epic.animated).toBe(false);
    expect(RARITY_META.legendary.animated).toBe(true);
    expect(RARITY_META.mythical.animated).toBe(true);
  });

  it('falls back to common for unknown values', () => {
    expect(rarityMeta('unknown').id).toBe('common');
    expect(rarityMeta(null).id).toBe('common');
    expect(rarityOrder(undefined)).toBe(1);
    expect(rarityMeta('mythical').order).toBe(5);
  });
});

describe('Phase 4 cosmetic visuals', () => {
  it('defines the full 13-item Genesis Codex collection', () => {
    const slugs = Object.keys(COSMETIC_VISUALS);
    expect(slugs).toHaveLength(13);

    const rarities = new Set(Object.values(COSMETIC_VISUALS).map((visual) => visual.motif));
    // Every item has its own motif; no two items share a design language.
    expect(rarities.size).toBe(13);

    for (const visual of Object.values(COSMETIC_VISUALS)) {
      expect(visual.accent).toMatch(/^#/);
      expect(['square', 'circle', 'full']).toContain(visual.composition);
    }
  });

  it('supports circular portraits inside square frames and full-art compositions', () => {
    const compositions = new Set(Object.values(COSMETIC_VISUALS).map((v) => v.composition));
    expect(compositions.has('circle')).toBe(true);
    expect(compositions.has('full')).toBe(true);
    expect(compositions.has('square')).toBe(true);
    expect(cosmeticComposition('frostbound')).toBe('circle');
    expect(cosmeticComposition('root-cipher')).toBe('full');
  });

  it('falls back safely for unknown slugs', () => {
    expect(cosmeticVisual('does-not-exist').composition).toBe('square');
    expect(cosmeticVisual(null).slug).toBe('graphite');
  });

  it('uses hand-painted frame artwork where supplied', () => {
    expect(cosmeticFrame('graphite')).toBe('/cosmetics/graphite-halo.png');
    for (const visual of Object.values(COSMETIC_VISUALS)) {
      if (visual.frame) {
        expect(visual.frame).toMatch(/^\/cosmetics\/[a-z0-9-]+\.png$/);
      }
    }
  });
});

describe('Phase 4 release banner config', () => {
  it('references real catalogue slugs and fabricates no release window', () => {
    expect(COSMETIC_VISUALS[FEATURED_RELEASE.featuredSlug]).toBeDefined();
    expect(COSMETIC_VISUALS[FEATURED_RELEASE.spotlightSlug]).toBeDefined();
    for (const slug of FEATURED_RELEASE.previewSlugs) {
      expect(COSMETIC_VISUALS[slug]).toBeDefined();
    }
    // No genuine release deadline exists, so the banner must not show one.
    expect(FEATURED_RELEASE.endsAt ?? null).toBeNull();
  });
});
