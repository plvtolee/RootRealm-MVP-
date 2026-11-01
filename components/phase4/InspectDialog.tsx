'use client';

import { useEffect, useRef } from 'react';
import type { CosmeticAction, RootRealmCosmetic } from '@/components/phase2/types';
import { RARITY_META, rarityMeta } from '@/lib/cosmetics/rarity';
import { CosmeticArt, RarityBadge } from './CosmeticArt';
import { RootCipherFrame, type RootCipherFrameHandle } from './RootCipherFrame';

interface InspectDialogProps {
  cosmetic: RootRealmCosmetic;
  codeCoins: number;
  pendingCosmeticId: string | null;
  isCreator: boolean;
  profile: { name: string; avatarUrl: string | null; initial: string };
  onAction: (cosmeticId: string, action: CosmeticAction) => void;
  onClose: () => void;
}

function effectsFor(cosmetic: RootRealmCosmetic): string[] {
  const meta = rarityMeta(cosmetic.rarity);
  const base = [meta.animated ? 'Animated artwork' : 'Static artwork'];

  if (cosmetic.isExclusive) {
    return [
      ...base,
      'Living canvas animation',
      'Golden orbital ribbons',
      'Floating cipher cubes',
      'Crown illumination',
      'Signature showcase reveal',
    ];
  }

  if (cosmetic.rarity === 'mythical') {
    return [...base, 'Multi-layer animation', 'Orbiting elements', 'Particle field', 'Animated rarity indicator'];
  }
  if (cosmetic.rarity === 'legendary') {
    return [...base, 'Animated border', 'Particle drift', 'Pulsing highlights'];
  }
  if (cosmetic.rarity === 'epic') {
    return [...base, 'Intricate layered composition', 'No continuous motion'];
  }
  if (cosmetic.rarity === 'rare') {
    return [...base, 'Refined double-frame details'];
  }
  return [...base, 'Minimal single-groove frame'];
}

export function InspectDialog({
  cosmetic,
  codeCoins,
  pendingCosmeticId,
  isCreator,
  profile,
  onAction,
  onClose,
}: InspectDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const cipherRef = useRef<RootCipherFrameHandle>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const meta = RARITY_META[cosmetic.rarity];
  const busy = pendingCosmeticId === cosmetic.id;
  const owned = cosmetic.owned;
  const exclusiveLocked = cosmetic.isExclusive && !owned;
  const affordable = codeCoins >= cosmetic.cost;
  const effects = effectsFor(cosmetic);
  const isCipher = cosmetic.previewValue === 'root-cipher';

  const statusLabel = owned
    ? cosmetic.action === 'equipped'
      ? 'Equipped'
      : 'Owned'
    : cosmetic.isExclusive
      ? 'Creator only'
      : `${new Intl.NumberFormat('en-US').format(cosmetic.cost)} CC`;

  const action = (() => {
    if (exclusiveLocked) {
      return (
        <button type="button" className="rr2-button rr2-button-muted" disabled>
          {isCreator ? 'Preparing grant…' : 'Creator Exclusive'}
        </button>
      );
    }

    if (cosmetic.action === 'equipped') {
      return (
        <div className="p4-inspect-actions">
          <span className="rr2-button rr2-button-muted" aria-disabled="true">
            ✓ Equipped
          </span>
          <button
            type="button"
            className="rr2-button rr2-button-secondary"
            disabled={busy}
            onClick={() => onAction(cosmetic.id, 'unequip')}
          >
            {busy ? 'Updating…' : 'Unequip'}
          </button>
        </div>
      );
    }

    if (cosmetic.action === 'equip') {
      return (
        <button
          type="button"
          className="rr2-button rr2-button-primary"
          disabled={busy}
          onClick={() => onAction(cosmetic.id, 'equip')}
        >
          {busy ? 'Equipping…' : `Equip ${cosmetic.name}`}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="rr2-button rr2-button-primary"
        disabled={busy || !affordable}
        onClick={() => onAction(cosmetic.id, 'purchase')}
      >
        {busy
          ? 'Purchasing…'
          : affordable
            ? `Purchase · ${new Intl.NumberFormat('en-US').format(cosmetic.cost)} CC`
            : 'Not enough CodeCoins'}
      </button>
    );
  })();

  return (
    <div className="p4-inspect-backdrop" role="presentation" onClick={onClose}>
      <div
        className="p4-inspect"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p4-inspect-title"
        data-rarity={cosmetic.rarity}
        data-cosmetic={cosmetic.previewValue}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="p4-inspect-close"
          onClick={onClose}
          aria-label="Close inspection"
        >
          ✕
        </button>

        <div className="p4-inspect-art">
          {isCipher ? (
            <>
              <RootCipherFrame
                ref={cipherRef}
                className="rc-frame--inspect"
                quality="high"
                intensity={1.05}
                label={`${cosmetic.name} — animated artwork`}
              />
              <button
                type="button"
                className="rr2-button rr2-button-secondary p4-inspect-cipher-reveal"
                onClick={() => {
                  void cipherRef.current?.showcase();
                }}
              >
                Play signature reveal
              </button>
            </>
          ) : (
            <>
              <CosmeticArt
                slug={cosmetic.previewValue}
                rarity={cosmetic.rarity}
                composition={cosmetic.composition}
                exclusive={cosmetic.isExclusive}
                size="inspect"
                label={`${cosmetic.name} artwork`}
              />
              <div
                className="p4-inspect-art-glow"
                data-rarity={cosmetic.rarity}
                aria-hidden="true"
              />
            </>
          )}
        </div>

        <div className="p4-inspect-body">
          <div className="p4-inspect-meta">
            <RarityBadge
              rarity={cosmetic.rarity}
              exclusive={cosmetic.isExclusive}
              label={isCipher ? 'Creator' : undefined}
              creatorTier={isCipher}
            />
            <span className="p4-inspect-category">{cosmetic.category}</span>
            <span className="p4-inspect-slot">{cosmetic.kind}</span>
          </div>

          <h2 id="p4-inspect-title" className="p4-inspect-title">
            {cosmetic.name}
          </h2>
          <p className="p4-inspect-description">{cosmetic.description}</p>

          <div className="p4-inspect-effects">
            <span className="rr2-kicker">VISUAL EFFECTS</span>
            <ul>
              {effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </div>

          <div className="p4-inspect-preview">
            <span className="rr2-kicker">PROFILE PREVIEW</span>
            <div className="p4-inspect-preview-row">
              <div
                className="rr2-profile-avatar p4-preview-avatar"
                data-cosmetic={cosmetic.previewValue}
                data-composition={cosmetic.composition}
                data-rarity={cosmetic.rarity}
                aria-label={`${profile.name} with ${cosmetic.name} equipped`}
                role="img"
              >
                {isCipher ? (
                  <RootCipherFrame
                    quality="low"
                    intensity={0.9}
                    avatarUrl={profile.avatarUrl}
                    avatarInitial={profile.initial}
                  />
                ) : profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  profile.initial
                )}
              </div>
              <div className="p4-inspect-preview-copy">
                <strong>{profile.name}</strong>
                <span>@{profile.name}</span>
                <small style={{ color: meta.color }}>{meta.blurb}</small>
              </div>
            </div>
          </div>

          <div className="p4-inspect-foot">
            <div className="p4-inspect-status">
              <span className="rr2-kicker">{owned ? 'OWNERSHIP' : 'PRICE'}</span>
              <strong data-rarity={cosmetic.rarity}>{statusLabel}</strong>
            </div>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
