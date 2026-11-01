/**
 * Cosmetic release configuration.
 *
 * The shop's Limited Mythic Release banner is data-driven: a future release can
 * be showcased by pointing `FEATURED_RELEASE` (or a caller-provided release) at a
 * different collection without touching the Shop layout.
 *
 * `startsAt` / `endsAt` are only rendered as a countdown when genuine release
 * window data is supplied. They are intentionally null here — this collection
 * has no artificial expiry or stock limit.
 */
export interface CosmeticRelease {
  id: string;
  /** Collection title shown as the banner headline. */
  collection: string;
  /** Series / edition line. */
  series: string;
  /** Badge copy, e.g. LIMITED MYTHIC RELEASE. */
  badge: string;
  /** Supporting sentence beneath the title. */
  headline: string;
  /** Paragraph introducing the collection. */
  description: string;
  /** Slug of the large featured Mythical artwork. */
  featuredSlug: string;
  /** Slug of the Creator Exclusive spotlight. */
  spotlightSlug: string;
  /** Slugs shown in the small collection preview strip. */
  previewSlugs: string[];
  /** Genuine release window, if one exists. */
  startsAt?: string | null;
  endsAt?: string | null;
}

export const FEATURED_RELEASE: CosmeticRelease = {
  id: 'genesis-codex',
  collection: 'Genesis Codex',
  series: 'Series I · Origin Collection',
  badge: 'NEW RELEASE',
  headline: 'The first artefacts of the realm are here.',
  description:
    'Thirteen original avatar artefacts trace the path from a quiet first frame to the living constellation of a Mythical — culminating in The Root Cipher, forged for the realm’s creator.',
  // The Root Cipher opens the Shop alive: its animated canvas is the featured
  // presentation, and the spotlight config points at the same artefact.
  featuredSlug: 'root-cipher',
  spotlightSlug: 'root-cipher',
  previewSlugs: ['graphite', 'frostbound', 'neon-pulse', 'solar-crown', 'astral-horizon'],
  startsAt: null,
  endsAt: null,
};