import type { CosmeticComposition, CosmeticRarity } from '@/lib/types';
import { rarityMeta } from '@/lib/cosmetics/rarity';
import { cosmeticVisual } from '@/lib/cosmetics/visuals';
import { MotifArtwork } from './motifs';

export type CosmeticArtSize = 'thumb' | 'chip' | 'card' | 'inspect' | 'hero';

interface CosmeticArtProps {
  slug: string;
  rarity: CosmeticRarity;
  size?: CosmeticArtSize;
  /** Overrides the slug's default composition (circle-inside-square, etc.). */
  composition?: CosmeticComposition;
  portraitUrl?: string | null;
  portraitInitial?: string;
  exclusive?: boolean;
  className?: string;
  /** Accessible label; when omitted the artwork is decorative. */
  label?: string;
}

/**
 * Shared cosmetic artwork renderer.
 *
 * A single component is used in the shop catalogue, the release banner, the
 * inspection panel, the profile preview, and (via `data-cosmetic` on the avatar)
 * the live profile. Artwork geometry and animation live in `phase4.css`, keyed by
 * the cosmetic slug, so every item keeps one visual identity everywhere.
 */
export function CosmeticArt({
  slug,
  rarity,
  size = 'card',
  composition,
  portraitUrl,
  portraitInitial,
  exclusive = false,
  className,
  label,
}: CosmeticArtProps) {
  const visual = cosmeticVisual(slug);
  const resolvedComposition = composition ?? visual.composition;
  const hasPortrait = Boolean(portraitUrl || portraitInitial);
  const classes = ['p4-art', `p4-art--${size}`, className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-cosmetic={visual.slug}
      data-rarity={rarity}
      data-composition={resolvedComposition}
      data-exclusive={exclusive ? 'true' : undefined}
      data-frame={visual.frame ? 'true' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="p4-art-atmos" aria-hidden="true" />
      <span className="p4-art-frame" aria-hidden="true" />
      <span className="p4-art-orbit" aria-hidden="true" />
      <span className="p4-art-scan" aria-hidden="true" />
      <span className="p4-art-particles" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>

      {portraitUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="p4-art-portrait" src={portraitUrl} alt="" />
      ) : portraitInitial ? (
        <span className="p4-art-portrait p4-art-initial" aria-hidden="true">
          {portraitInitial}
        </span>
      ) : visual.frame ? null : (
        <>
          <MotifArtwork motif={visual.motif} />
          <span className="p4-art-glyph" aria-hidden="true">
            {visual.glyph}
          </span>
        </>
      )}

      {visual.frame ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="p4-art-frame-image" src={visual.frame} alt="" aria-hidden="true" />
      ) : null}

      <span className="p4-art-badge" aria-hidden="true">
        {visual.glyph}
      </span>
      {exclusive ? <span className="p4-art-crest">CREATOR</span> : null}
      {hasPortrait ? null : <span className="p4-art-rarity-glow" aria-hidden="true" />}
      <span className="p4-art-sheen" aria-hidden="true" />
    </div>
  );
}

export function RarityBadge({
  rarity,
  exclusive = false,
  compact = false,
}: {
  rarity: CosmeticRarity;
  exclusive?: boolean;
  compact?: boolean;
}) {
  const meta = rarityMeta(rarity);
  return (
    <span
      className={`p4-rarity p4-rarity--${meta.id}${exclusive ? ' is-exclusive' : ''}${compact ? ' is-compact' : ''}`}
      data-rarity={meta.id}
    >
      <i aria-hidden="true" />
      {exclusive ? 'Creator Exclusive' : meta.label}
    </span>
  );
}