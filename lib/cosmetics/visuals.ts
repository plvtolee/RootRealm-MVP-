import type { CosmeticComposition } from '@/lib/types';

/** Motif identifiers rendered by `components/phase4/CosmeticArt.tsx`. */
export type CosmeticMotif =
  | 'groove'
  | 'bevel'
  | 'grid'
  | 'circuit'
  | 'rime'
  | 'ember'
  | 'neon'
  | 'prism'
  | 'aurora'
  | 'sun'
  | 'wisp'
  | 'constellation'
  | 'cipher';

export interface CosmeticVisual {
  slug: string;
  composition: CosmeticComposition;
  /** Compact glyph used in chips, badges, and the avatar badge. */
  glyph: string;
  motif: CosmeticMotif;
  /** Primary accent (CSS colour). */
  accent: string;
  /** Secondary accent. */
  accentAlt: string;
  /** Deep surface behind the artwork. */
  surface: string;
  /** Soft glow for borders/aura. */
  glow: string;
  /**
   * Optional hand-painted frame artwork served from `/public` (transparent
   * centre). When present it replaces the CSS-drawn frame and corner glyph in
   * every surface — shop card, banner, inspection panel, and live avatar.
   */
  frame?: string;
}

/**
 * Presentation-only configuration for each cosmetic, keyed by the database
 * `preview_value`. Keeping this client-safe avoids shipping a heavier query and
 * lets the same artwork render in the shop, inspection panel, and profiles.
 */
export const COSMETIC_VISUALS: Record<string, CosmeticVisual> = {
  graphite: {
    slug: 'graphite',
    composition: 'square',
    glyph: '▣',
    motif: 'groove',
    accent: '#c8ced8',
    accentAlt: '#7d8794',
    surface: '#14171c',
    glow: 'rgba(200, 206, 216, 0.14)',
    frame: '/cosmetics/graphite-halo.png',
  },
  silverline: {
    slug: 'silverline',
    composition: 'square',
    glyph: '◈',
    motif: 'bevel',
    accent: '#dbe2ec',
    accentAlt: '#8d98a8',
    surface: '#181c22',
    glow: 'rgba(219, 226, 236, 0.2)',
    frame: '/cosmetics/silverline-frame.png',
  },
  ledgerline: {
    slug: 'ledgerline',
    composition: 'square',
    glyph: '⌗',
    motif: 'grid',
    accent: '#e5d6b2',
    accentAlt: '#8d846f',
    surface: '#121a1d',
    glow: 'rgba(229, 214, 178, 0.2)',
    frame: '/cosmetics/ledgerline-frame.png',
  },
  'aurum-circuit': {
    slug: 'aurum-circuit',
    composition: 'square',
    glyph: '⌁',
    motif: 'circuit',
    accent: '#f09a5a',
    accentAlt: '#a35a2a',
    surface: '#1a130d',
    glow: 'rgba(240, 154, 90, 0.26)',
    frame: '/cosmetics/aurum-circuit-frame.png',
  },
  frostbound: {
    slug: 'frostbound',
    composition: 'circle',
    glyph: '❄',
    motif: 'rime',
    accent: '#9edcff',
    accentAlt: '#4f8fae',
    surface: '#10212c',
    glow: 'rgba(158, 220, 255, 0.26)',
    frame: '/cosmetics/frostbound-frame.png',
  },
  'ember-index': {
    slug: 'ember-index',
    composition: 'square',
    glyph: '◭',
    motif: 'ember',
    accent: '#f39a62',
    accentAlt: '#a24a2a',
    surface: '#241512',
    glow: 'rgba(243, 154, 98, 0.26)',
    frame: '/cosmetics/ember-index-frame-v2.png',
  },
  'neon-pulse': {
    slug: 'neon-pulse',
    composition: 'square',
    glyph: '⌁',
    motif: 'neon',
    accent: '#7cf4e7',
    accentAlt: '#2a8f88',
    surface: '#0f2426',
    glow: 'rgba(124, 244, 231, 0.28)',
  },
  voidglass: {
    slug: 'voidglass',
    composition: 'full',
    glyph: '◬',
    motif: 'prism',
    accent: '#c0a6ff',
    accentAlt: '#5b4a8a',
    surface: '#121020',
    glow: 'rgba(192, 166, 255, 0.24)',
    frame: '/cosmetics/voidglass-frame.png',
  },
  'aurora-meridian': {
    slug: 'aurora-meridian',
    composition: 'full',
    glyph: '≋',
    motif: 'aurora',
    accent: '#74e8b2',
    accentAlt: '#b985ff',
    surface: '#0e1a1c',
    glow: 'rgba(116, 232, 178, 0.24)',
    frame: '/cosmetics/aurora-meridian-frame.png',
  },
  'solar-crown': {
    slug: 'solar-crown',
    composition: 'square',
    glyph: '☀',
    motif: 'sun',
    accent: '#ffc65c',
    accentAlt: '#d9772b',
    surface: '#211a0e',
    glow: 'rgba(255, 198, 92, 0.34)',
  },
  'astral-horizon': {
    slug: 'astral-horizon',
    composition: 'full',
    glyph: '✦',
    motif: 'constellation',
    accent: '#8fb7ff',
    accentAlt: '#d68cff',
    surface: '#0c0f1f',
    glow: 'rgba(143, 183, 255, 0.3)',
  },
  wraithlight: {
    slug: 'wraithlight',
    composition: 'circle',
    glyph: '✧',
    motif: 'wisp',
    accent: '#a9c7f5',
    accentAlt: '#596f9c',
    surface: '#101522',
    glow: 'rgba(169, 199, 245, 0.28)',
    frame: '/cosmetics/wraithlight/wraithlight-frame.png',
  },
  'root-cipher': {
    slug: 'root-cipher',
    composition: 'square',
    glyph: '✶',
    motif: 'cipher',
    accent: '#ffe6a8',
    accentAlt: '#8be9d0',
    surface: '#100e0a',
    glow: 'rgba(255, 230, 168, 0.38)',
    // Opus's original transparent artwork. The live canvas runtime paints the
    // animated version on top; this still is the loading / no-JS fallback.
    frame: '/cosmetics/root-cipher/root-cipher-frame.png',
  },
};

export const DEFAULT_VISUAL: CosmeticVisual = {
  slug: 'graphite',
  composition: 'square',
  glyph: '▣',
  motif: 'groove',
  accent: '#c8ced8',
  accentAlt: '#7d8794',
  surface: '#14171c',
  glow: 'rgba(200, 206, 216, 0.14)',
};

export function cosmeticVisual(slug: string | null | undefined): CosmeticVisual {
  if (!slug) return DEFAULT_VISUAL;
  return COSMETIC_VISUALS[slug] ?? { ...DEFAULT_VISUAL, slug };
}

export function cosmeticComposition(slug: string | null | undefined): CosmeticComposition {
  return cosmeticVisual(slug).composition;
}

export function cosmeticFrame(slug: string | null | undefined): string | undefined {
  return cosmeticVisual(slug).frame;
}
