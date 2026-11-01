'use client';

import type { RootRealmCosmetic } from '@/components/phase2/types';
import { RootCipherFrame } from './RootCipherFrame';

interface CipherReleaseBannerProps {
  cosmetic: RootRealmCosmetic;
  /** Release badge copy, e.g. NEW RELEASE. */
  badge: string;
  /** Pause the live animation while another surface owns attention. */
  paused?: boolean;
  onInspect: () => void;
}

function CrownGlyph() {
  return (
    <svg
      className="p4-cipher-crown"
      viewBox="0 0 34 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 21h28l1.6-15.2-7.9 5.7L17 2.6 9.3 11.5 1.4 5.8 3 21z"
        fill="#e6c47e"
      />
      <circle cx="2" cy="4.4" r="1.7" fill="#ffeecb" />
      <circle cx="32" cy="4.4" r="1.7" fill="#ffeecb" />
      <circle cx="17" cy="1.7" r="1.7" fill="#ffeecb" />
    </svg>
  );
}

/**
 * Cinematic banner for the Creator-exclusive Root Cipher release.
 *
 * The right panel hosts the live Canvas 2D artwork instead of a static image,
 * so the frame, its aura and the signature reveal are the real runtime. The
 * whole artwork is a single large button that opens the inspection dialog.
 */
export function CipherReleaseBanner({
  cosmetic,
  badge,
  paused = false,
  onInspect,
}: CipherReleaseBannerProps) {
  return (
    <section className="p4-cipher-banner" aria-labelledby="p4-cipher-title">
      <span className="p4-cipher-glow" aria-hidden="true" />
      <span className="p4-cipher-orbit" aria-hidden="true" />
      <span className="p4-cipher-spark p4-cipher-spark--tl" aria-hidden="true" />
      <span className="p4-cipher-spark p4-cipher-spark--tr" aria-hidden="true" />
      <span className="p4-cipher-spark p4-cipher-spark--bl" aria-hidden="true" />
      <span className="p4-cipher-spark p4-cipher-spark--br" aria-hidden="true" />

      <div className="p4-cipher-copy">
        <div className="p4-cipher-wordmark">
          <span className="p4-cipher-rule" aria-hidden="true" />
          <span>RootRealm</span>
          <span className="p4-cipher-rule" aria-hidden="true" />
        </div>

        <span className="p4-cipher-badge">{badge}</span>

        <h2 id="p4-cipher-title" className="p4-cipher-title">
          {cosmetic.name}
        </h2>

        <div className="p4-cipher-divider" aria-hidden="true">
          <span />
          <CrownGlyph />
          <span />
        </div>

        {cosmetic.isExclusive ? (
          <span className="p4-cipher-exclusive">Creator Exclusive</span>
        ) : null}

        <p className="p4-cipher-description">{cosmetic.description}</p>
      </div>

      <button
        type="button"
        className="p4-cipher-art"
        onClick={onInspect}
        aria-label={`Inspect ${cosmetic.name}`}
      >
        <RootCipherFrame
          quality="high"
          intensity={1}
          autoShowcase
          paused={paused}
        />
      </button>
    </section>
  );
}
