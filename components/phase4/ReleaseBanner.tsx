'use client';

import type { RootRealmCosmetic } from '@/components/phase2/types';
import type { CosmeticRelease } from '@/lib/cosmetics/release';
import { CosmeticArt, RarityBadge } from './CosmeticArt';

interface ReleaseBannerProps {
  release: CosmeticRelease;
  cosmeticsBySlug: Record<string, RootRealmCosmetic>;
  isCreator: boolean;
  onInspect: (slug: string) => void;
  onExplore: () => void;
}

/**
 * Data-driven Limited Mythic Release banner.
 *
 * Pass a different `release` object to showcase a future collection; the layout
 * only depends on slugs that exist in the catalogue. Genuine release windows are
 * shown only when `endsAt` is supplied — no invented countdowns or stock limits.
 */
export function ReleaseBanner({
  release,
  cosmeticsBySlug,
  isCreator,
  onInspect,
  onExplore,
}: ReleaseBannerProps) {
  const featured = cosmeticsBySlug[release.featuredSlug];
  const spotlight = cosmeticsBySlug[release.spotlightSlug];
  const preview = release.previewSlugs
    .map((slug) => cosmeticsBySlug[slug])
    .filter((item): item is RootRealmCosmetic => Boolean(item));

  const closesAt = release.endsAt ? new Date(release.endsAt) : null;
  const hasWindow = Boolean(closesAt && !Number.isNaN(closesAt.getTime()));

  return (
    <section className="p4-release" aria-labelledby="p4-release-title">
      <div className="p4-release-atmos" aria-hidden="true" />
      <div className="p4-release-grid" aria-hidden="true" />
      <span className="p4-release-orbit" aria-hidden="true" />
      <span className="p4-release-particles" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>

      <div className="p4-release-copy">
        <div className="p4-release-meta">
          <span className="p4-release-badge">{release.badge}</span>
          <span className="p4-release-series">{release.series}</span>
        </div>

        <h2 id="p4-release-title" className="p4-release-title">
          {release.collection}
        </h2>
        <p className="p4-release-headline">{release.headline}</p>
        <p className="p4-release-description">{release.description}</p>

        <div className="p4-release-actions">
          <button type="button" className="rr2-button rr2-button-primary" onClick={onExplore}>
            Explore Collection
          </button>
          {featured ? (
            <button
              type="button"
              className="rr2-button rr2-button-secondary"
              onClick={() => onInspect(featured.previewValue)}
            >
              Inspect {featured.name}
            </button>
          ) : null}
        </div>

        {hasWindow && closesAt ? (
          <p className="p4-release-window">
            Release window closes{' '}
            <time dateTime={closesAt.toISOString()}>
              {closesAt.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </p>
        ) : null}

        {preview.length > 0 ? (
          <div className="p4-release-preview" aria-label="Collection preview">
            {preview.map((item) => (
              <button
                key={item.id}
                type="button"
                className="p4-release-preview-item"
                onClick={() => onInspect(item.previewValue)}
                aria-label={`Inspect ${item.name}`}
              >
                <CosmeticArt
                  slug={item.previewValue}
                  rarity={item.rarity}
                  composition={item.composition}
                  exclusive={item.isExclusive}
                  size="thumb"
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="p4-release-showcase">
        {featured ? (
          <div className="p4-release-featured">
            <div className="p4-release-featured-art">
              <CosmeticArt
                slug={featured.previewValue}
                rarity={featured.rarity}
                composition={featured.composition}
                size="hero"
                label={`${featured.name} artwork`}
              />
            </div>
            <div className="p4-release-featured-meta">
              <RarityBadge rarity={featured.rarity} />
              <strong>{featured.name}</strong>
              <span>{featured.category}</span>
            </div>
          </div>
        ) : null}

        {spotlight ? (
          <button
            type="button"
            className="p4-release-spotlight"
            onClick={() => onInspect(spotlight.previewValue)}
            aria-label={`Inspect ${spotlight.name}, the Creator Exclusive`}
          >
            <CosmeticArt
              slug={spotlight.previewValue}
              rarity={spotlight.rarity}
              composition={spotlight.composition}
              exclusive
              size="thumb"
            />
            <span className="p4-release-spotlight-copy">
              <span className="p4-release-spotlight-kicker">
                {isCreator ? 'YOUR EXCLUSIVE' : 'CREATOR EXCLUSIVE'}
              </span>
              <strong>{spotlight.name}</strong>
              <em>{isCreator ? 'Granted to the architect' : 'Reserved for the realm’s creator'}</em>
            </span>
            <span className="p4-release-spotlight-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}