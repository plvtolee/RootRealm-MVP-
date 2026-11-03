'use client';

import { useMemo, useRef, useState } from 'react';
import type { CosmeticAction, RootRealmCosmetic } from '@/components/phase2/types';
import type { CosmeticRarity } from '@/lib/types';
import { RARITY_META, RARITY_ORDER } from '@/lib/cosmetics/rarity';
import { FEATURED_RELEASE } from '@/lib/cosmetics/release';
import { CosmeticArt, RarityBadge } from './CosmeticArt';
import { InspectDialog } from './InspectDialog';
import { ReleaseBanner } from './ReleaseBanner';
import { RootCipherFrame } from './RootCipherFrame';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

interface ShopViewProps {
  cosmetics: RootRealmCosmetic[];
  codeCoins: number;
  pendingCosmeticId: string | null;
  onCosmeticAction?: (cosmeticId: string, action: CosmeticAction) => void;
  isCreator: boolean;
  profile: { name: string; avatarUrl: string | null; initial: string };
}

type RarityFilter = 'all' | CosmeticRarity;

export function ShopView({
  cosmetics,
  codeCoins,
  pendingCosmeticId,
  onCosmeticAction,
  isCreator,
  profile,
}: ShopViewProps) {
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [inspectSlug, setInspectSlug] = useState<string | null>(null);
  const catalogueRef = useRef<HTMLDivElement>(null);

  const bySlug = useMemo(() => {
    const map: Record<string, RootRealmCosmetic> = {};
    for (const item of cosmetics) map[item.previewValue] = item;
    return map;
  }, [cosmetics]);

  const categories = useMemo(
    () => Array.from(new Set(cosmetics.map((item) => item.category))),
    [cosmetics]
  );

  const visible = useMemo(
    () =>
      cosmetics.filter(
        (item) =>
          (rarityFilter === 'all' || item.rarity === rarityFilter) &&
          (categoryFilter === 'all' || item.category === categoryFilter)
      ),
    [cosmetics, rarityFilter, categoryFilter]
  );

  const inspected = inspectSlug ? bySlug[inspectSlug] ?? null : null;

  const scrollToCatalogue = () => {
    catalogueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isFiltered = rarityFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="p4-shop">
      <ReleaseBanner
        release={FEATURED_RELEASE}
        cosmeticsBySlug={bySlug}
        isCreator={isCreator}
        onInspect={setInspectSlug}
        onExplore={scrollToCatalogue}
        featuredPaused={Boolean(inspected)}
      />

      <div className="p4-catalogue" ref={catalogueRef}>
        <div className="p4-catalogue-head">
          <div>
            <div className="rr2-kicker">REALM EXCHANGE · {FEATURED_RELEASE.series}</div>
            <h1 className="p4-catalogue-title">
              The <em>Genesis Codex</em>
            </h1>
            <p className="p4-catalogue-description">
              Thirteen artefacts across five tiers. Common, Rare and Epic stay still; Legendary and
              Mythical come alive. Every frame is real inventory — buy it, own it, wear it.
            </p>
          </div>

          <div className="p4-balance" aria-label={`${NUMBER_FORMAT.format(codeCoins)} CodeCoins`}>
            <span aria-hidden="true">◆</span>
            <div>
              <small>YOUR BALANCE</small>
              <strong>
                {NUMBER_FORMAT.format(codeCoins)} <span>CODECOINS</span>
              </strong>
            </div>
          </div>
        </div>

        <div className="p4-filters">
          <div className="p4-filter-group" role="group" aria-label="Filter by rarity">
            <span className="p4-filter-label">RARITY</span>
            <div className="p4-filter-row">
              <button
                type="button"
                className={`rr2-filter${rarityFilter === 'all' ? ' is-active' : ''}`}
                aria-pressed={rarityFilter === 'all'}
                onClick={() => setRarityFilter('all')}
              >
                All
              </button>
              {RARITY_ORDER.map((rarity) => (
                <button
                  key={rarity}
                  type="button"
                  className={`rr2-filter p4-filter-rarity${rarityFilter === rarity ? ' is-active' : ''}`}
                  data-rarity={rarity}
                  aria-pressed={rarityFilter === rarity}
                  onClick={() => setRarityFilter(rarity)}
                >
                  <i aria-hidden="true" />
                  {RARITY_META[rarity].label}
                </button>
              ))}
            </div>
          </div>

          <div className="p4-filter-group" role="group" aria-label="Filter by category">
            <span className="p4-filter-label">CATEGORY</span>
            <div className="p4-filter-row">
              <button
                type="button"
                className={`rr2-filter${categoryFilter === 'all' ? ' is-active' : ''}`}
                aria-pressed={categoryFilter === 'all'}
                onClick={() => setCategoryFilter('all')}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`rr2-filter${categoryFilter === category ? ' is-active' : ''}`}
                  aria-pressed={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="p4-catalogue-count">
            <strong>{visible.length}</strong>
            <span>of {cosmetics.length} artefacts</span>
            {isFiltered ? (
              <button
                type="button"
                className="p4-clear"
                onClick={() => {
                  setRarityFilter('all');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="rr2-empty">No cosmetics match these filters.</p>
        ) : (
          <div className="p4-grid">
            {visible.map((item) => (
              <CosmeticCard
                key={item.id}
                cosmetic={item}
                codeCoins={codeCoins}
                busy={pendingCosmeticId === item.id}
                isCreator={isCreator}
                paused={Boolean(inspected)}
                onInspect={() => setInspectSlug(item.previewValue)}
                onAction={onCosmeticAction}
              />
            ))}
          </div>
        )}

        <p className="rr2-quiet-note">
          Cosmetic accents stay local to each item and avatar. The surrounding realm stays graphite.
          Animated tiers respect your system&apos;s reduced-motion setting.
        </p>
      </div>

      {inspected ? (
        <InspectDialog
          cosmetic={inspected}
          codeCoins={codeCoins}
          pendingCosmeticId={pendingCosmeticId}
          isCreator={isCreator}
          profile={profile}
          onAction={(id, action) => onCosmeticAction?.(id, action)}
          onClose={() => setInspectSlug(null)}
        />
      ) : null}
    </div>
  );
}

function CosmeticCard({
  cosmetic,
  codeCoins,
  busy,
  isCreator,
  paused,
  onInspect,
  onAction,
}: {
  cosmetic: RootRealmCosmetic;
  codeCoins: number;
  busy: boolean;
  isCreator: boolean;
  paused: boolean;
  onInspect: () => void;
  onAction?: (cosmeticId: string, action: CosmeticAction) => void;
}) {
  const owned = cosmetic.owned;
  const exclusiveLocked = cosmetic.isExclusive && !owned;
  const affordable = codeCoins >= cosmetic.cost;
  const isEquipped = cosmetic.action === 'equipped';
  const isCipher = cosmetic.previewValue === 'root-cipher';

  return (
    <article
      className={`p4-card${isEquipped ? ' is-equipped' : ''}${cosmetic.isExclusive ? ' is-exclusive' : ''}`}
      data-rarity={cosmetic.rarity}
      data-cosmetic={cosmetic.previewValue}
    >
      <button
        type="button"
        className="p4-card-art"
        onClick={onInspect}
        aria-label={`Inspect ${cosmetic.name}`}
      >
        {isCipher ? (
          <RootCipherFrame
            className="rc-frame--card"
            quality="low"
            intensity={0.8}
            paused={paused}
          />
        ) : (
          <CosmeticArt
            slug={cosmetic.previewValue}
            rarity={cosmetic.rarity}
            composition={cosmetic.composition}
            exclusive={cosmetic.isExclusive}
            size="card"
            paused={paused}
          />
        )}
        <span
          className={`p4-card-flag p4-card-flag--rarity${isCipher ? ' p4-card-flag--creator-tier' : ''}`}
          data-rarity={cosmetic.rarity}
        >
          {isCipher ? 'CREATOR' : RARITY_META[cosmetic.rarity].label}
        </span>
        {isEquipped ? <span className="p4-card-flag p4-card-flag--equipped">EQUIPPED</span> : null}
        {cosmetic.isExclusive && !isCipher ? (
          <span className="p4-card-flag p4-card-flag--creator">CREATOR</span>
        ) : null}
      </button>

      <div className="p4-card-body">
        <div className="p4-card-meta">
          <RarityBadge
            rarity={cosmetic.rarity}
            exclusive={cosmetic.isExclusive}
            label={cosmetic.previewValue === 'root-cipher' ? 'Creator' : undefined}
            creatorTier={cosmetic.previewValue === 'root-cipher'}
            compact
          />
          <span className="p4-card-category">{cosmetic.category}</span>
        </div>

        <button type="button" className="p4-card-title" onClick={onInspect}>
          {cosmetic.name}
        </button>
        <p className="p4-card-description">{cosmetic.description}</p>

        <div className="p4-card-foot">
          <div className="p4-card-status">
            <small className="rr2-kicker">{owned ? 'OWNED' : 'PRICE'}</small>
            <strong data-rarity={cosmetic.rarity}>
              {cosmetic.isExclusive
                ? owned
                  ? isCreator
                    ? 'Creator grant'
                    : 'Exclusive'
                  : 'Creator only'
                : owned
                  ? isEquipped
                    ? 'Equipped'
                    : 'In inventory'
                  : `${NUMBER_FORMAT.format(cosmetic.cost)} CC`}
            </strong>
          </div>

          <CardAction
            cosmetic={cosmetic}
            canAfford={affordable}
            busy={busy}
            exclusiveLocked={exclusiveLocked}
            isCreator={isCreator}
            onAction={onAction}
          />
        </div>

        <button type="button" className="p4-card-inspect" onClick={onInspect}>
          Inspect artwork ↗
        </button>
      </div>
    </article>
  );
}

function CardAction({
  cosmetic,
  canAfford,
  busy,
  exclusiveLocked,
  isCreator,
  onAction,
}: {
  cosmetic: RootRealmCosmetic;
  canAfford: boolean;
  busy: boolean;
  exclusiveLocked: boolean;
  isCreator: boolean;
  onAction?: (cosmeticId: string, action: CosmeticAction) => void;
}) {
  if (exclusiveLocked) {
    return (
      <button type="button" className="rr2-button rr2-button-muted" disabled>
        {isCreator ? 'Grant pending' : 'Creator only'}
      </button>
    );
  }

  if (cosmetic.action === 'equipped') {
    return (
      <button
        type="button"
        className="rr2-button rr2-button-secondary"
        disabled={busy || !onAction}
        onClick={() => onAction?.(cosmetic.id, 'unequip')}
      >
        {busy ? 'Updating…' : 'Unequip'}
      </button>
    );
  }

  if (cosmetic.action === 'equip') {
    return (
      <button
        type="button"
        className="rr2-button rr2-button-secondary"
        disabled={busy || !onAction}
        onClick={() => onAction?.(cosmetic.id, 'equip')}
      >
        {busy ? 'Updating…' : 'Equip'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="rr2-button rr2-button-primary"
      disabled={busy || !canAfford || !onAction}
      onClick={() => onAction?.(cosmetic.id, 'purchase')}
    >
      {busy ? 'Purchasing…' : canAfford ? 'Purchase' : 'Not enough CC'}
    </button>
  );
}
