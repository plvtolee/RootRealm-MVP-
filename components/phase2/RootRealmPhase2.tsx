'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { LocalTime } from '@/components/local-time';
import type {
  CosmeticAction,
  Phase2Feedback,
  RootRealmChrome,
  RootRealmCosmetic,
  RootRealmProfileData,
  RootRealmQuest,
  RootRealmSection,
} from './types';

export type {
  CosmeticAction,
  CosmeticState,
  EquippedCosmetic,
  GitHubUiStatus,
  Phase2Feedback,
  ProfileAchievement,
  ProfileAttribute,
  QuestStatus,
  RootRealmChrome,
  RootRealmCosmetic,
  RootRealmProfileData,
  RootRealmQuest,
  RootRealmSection,
} from './types';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

const sections: { id: RootRealmSection; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: '◉' },
  { id: 'quests', label: 'Quests', icon: '◇' },
  { id: 'shop', label: 'Shop', icon: '✧' },
  { id: 'community', label: 'Community', icon: '◎' },
];

interface RootRealmPhase2Props {
  section: RootRealmSection;
  chrome: RootRealmChrome;
  profile?: RootRealmProfileData;
  quests?: RootRealmQuest[];
  cosmetics?: RootRealmCosmetic[];
  feedback?: Phase2Feedback | null;
  lastSyncedAt?: string | null;
  needsReauth?: boolean;
  syncing?: boolean;
  pendingCosmeticId?: string | null;
  onSectionChange?: (section: RootRealmSection) => void;
  onCosmeticAction?: (cosmeticId: string, action: CosmeticAction) => void;
  onCustomizeProfile?: () => void;
  onSync?: () => void;
  /** Server action for GitHub OAuth. Safe to use as a form action. */
  connectAction?: () => Promise<void>;
  /** Server action that signs the user out. Safe to use as a form action. */
  signOutAction?: () => Promise<void>;
}

export default function RootRealmPhase2({
  section,
  chrome,
  profile,
  quests = [],
  cosmetics = [],
  feedback,
  lastSyncedAt,
  needsReauth = false,
  syncing = false,
  pendingCosmeticId = null,
  onSectionChange,
  onCosmeticAction,
  onCustomizeProfile,
  onSync,
  connectAction,
  signOutAction,
}: RootRealmPhase2Props) {
  const navigate = (next: RootRealmSection) => onSectionChange?.(next);

  return (
    <div className="rr2-root">
      <TopBar
        chrome={chrome}
        section={section}
        onNavigate={navigate}
        signOutAction={signOutAction}
      />

      <main className="rr2-main rr2-wrap">
        {feedback && (
          <div
            className={`rr2-feedback is-${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </div>
        )}

        {section === 'profile' &&
          (profile ? (
            <ProfileView
              profile={profile}
              onNavigate={navigate}
              onCustomizeProfile={onCustomizeProfile}
              connectAction={connectAction}
            />
          ) : (
            <EmptyPanel message="Profile data is unavailable right now." />
          ))}

        {section === 'quests' && (
          <QuestsView
            quests={quests}
            lastSyncedAt={lastSyncedAt ?? null}
            needsReauth={needsReauth}
            syncing={syncing}
            onSync={onSync}
            connectAction={connectAction}
          />
        )}

        {section === 'shop' && (
          <ShopView
            cosmetics={cosmetics}
            codeCoins={chrome.codeCoins}
            pendingCosmeticId={pendingCosmeticId}
            onCosmeticAction={onCosmeticAction}
          />
        )}
      </main>

      <footer className="rr2-footer">
        <span>
          ROOTREALM <strong>·</strong> PUBLIC ACTIVITY
        </span>
        <span>
          GITHUB SEARCH <strong>API</strong>
        </span>
        <span>PRIVATE REPOSITORIES NOT TRACKED</span>
      </footer>
    </div>
  );
}

function TopBar({
  chrome,
  section,
  onNavigate,
  signOutAction,
}: {
  chrome: RootRealmChrome;
  section: RootRealmSection;
  onNavigate: (section: RootRealmSection) => void;
  signOutAction?: () => Promise<void>;
}) {
  const account = (
    <>
      <span className="rr2-mini-avatar" aria-hidden="true">
        {chrome.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chrome.avatarUrl} alt="" />
        ) : (
          chrome.avatarInitial
        )}
      </span>
      <span className="rr2-account-name">
        {chrome.login}
        <small>DEVELOPER PROFILE</small>
      </span>
      <span className="rr2-chevron" aria-hidden="true">
        ⌄
      </span>
    </>
  );

  return (
    <header className="rr2-topbar">
      <button
        type="button"
        className="rr2-wordmark"
        aria-label="Go to profile"
        onClick={() => onNavigate('profile')}
      >
        <span className="rr2-brand-mark" aria-hidden="true">
          ✳
        </span>
        <span className="rr2-wordmark-label">
          ROOT<span className="rr2-wordmark-muted">REALM</span>
        </span>
      </button>

      <nav className="rr2-nav" aria-label="RootRealm sections">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="rr2-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="rr2-account">
        <div
          className="rr2-coin-chip"
          aria-label={`${NUMBER_FORMAT.format(chrome.codeCoins)} CodeCoins`}
        >
          <span aria-hidden="true">◆</span>
          <strong>{NUMBER_FORMAT.format(chrome.codeCoins)}</strong>
          <small>CC</small>
        </div>

        {signOutAction ? (
          <details className="rr2-account-menu">
            <summary className="rr2-account-info" aria-label="Account menu">
              {account}
            </summary>
            <div className="rr2-account-popover">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rr2-button rr2-button-secondary rr2-small-button"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>
        ) : (
          <div className="rr2-account-info">{account}</div>
        )}
      </div>
    </header>
  );
}

function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: ReactNode;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rr2-page-header">
      <div>
        <div className="rr2-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="rr2-page-actions">{action}</div>}
    </div>
  );
}

function ProfileView({
  profile,
  onNavigate,
  onCustomizeProfile,
  connectAction,
}: {
  profile: RootRealmProfileData;
  onNavigate: (section: RootRealmSection) => void;
  onCustomizeProfile?: () => void;
  connectAction?: () => Promise<void>;
}) {
  const xpProgress = clampPercent(
    Math.round((profile.xpIntoLevel / Math.max(profile.xpForNextLevel, 1)) * 100)
  );
  const loadoutLabel =
    profile.loadout[0] && profile.loadout[0].name !== 'Default frame'
      ? `${profile.loadout[0].name.toUpperCase()} LOADOUT`
      : 'DEFAULT LOADOUT';
  const githubLabel =
    profile.githubStatus === 'connected'
      ? 'LINKED'
      : profile.githubStatus === 'needs_reauth'
        ? 'REAUTH'
        : 'OFFLINE';

  return (
    <>
      <PageHeader
        kicker="DEVELOPER DOSSIER"
        title={
          <>
            Your realm <em>record</em>
          </>
        }
        description="A snapshot of your developer progression, activity evidence, milestones, and personal loadout."
        action={
          connectAction ? (
            <form action={connectAction}>
              <button
                className="rr2-button rr2-button-secondary rr2-small-button"
                type="submit"
              >
                {profile.githubStatus === 'connected'
                  ? 'Reconnect GitHub ↗'
                  : 'Connect GitHub ↗'}
              </button>
            </form>
          ) : (
            <button
              className="rr2-button rr2-button-secondary rr2-small-button"
              type="button"
              disabled
            >
              GitHub unavailable
            </button>
          )
        }
      />

      <section className="rr2-profile-hero">
        <div
          className="rr2-profile-avatar"
          data-cosmetic={profile.avatarFrameId}
          aria-label={`Avatar for ${profile.name}`}
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" />
          ) : (
            profile.avatarInitial
          )}
        </div>

        <div className="rr2-profile-identity">
          <div className="rr2-kicker">
            LEVEL {String(profile.level).padStart(2, '0')} · {profile.rank}
          </div>
          <h2>{profile.name}</h2>
          <p>@{profile.login} · Public GitHub activity</p>
          <div className="rr2-profile-tags">
            <span className="rr2-profile-tag">
              <strong>{githubLabel}</strong> GitHub
            </span>
            <span className="rr2-profile-tag">SCORING {profile.scoringVersion}</span>
            <span className="rr2-profile-tag">{loadoutLabel}</span>
          </div>
        </div>

        <div className="rr2-profile-xp">
          <span className="rr2-kicker">EXPERIENCE</span>
          <strong>{NUMBER_FORMAT.format(profile.xp)} XP</strong>
          <div
            className="rr2-xp-track"
            style={{ width: 120 }}
            role="progressbar"
            aria-valuenow={xpProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progress to level ${profile.level + 1}`}
          >
            <i style={{ width: `${xpProgress}%` }} />
          </div>
          <small>
            {Math.max(profile.xpForNextLevel - profile.xpIntoLevel, 0)} XP to next level
          </small>
        </div>
      </section>

      <div className="rr2-profile-summary">
        <Metric
          label="TOTAL EXPERIENCE"
          value={NUMBER_FORMAT.format(profile.xp)}
          note="Lifetime earned XP"
        />
        <Metric
          label="QUESTS COMPLETED"
          value={
            <>
              {profile.questsCompleted}
              <small> / {profile.totalQuests}</small>
            </>
          }
          note="Verified GitHub milestones"
        />
        <Metric
          label="ACTIVITY EVENTS"
          value={NUMBER_FORMAT.format(profile.activityEvents)}
          note="Commits + merged PRs"
        />
        <Metric
          label="CODECOINS"
          value={NUMBER_FORMAT.format(profile.codeCoins)}
          note="Available cosmetic currency"
        />
      </div>

      <div className="rr2-profile-content">
        <div className="rr2-stack">
          <section className="rr2-panel">
            <PanelHeading
              title="Developer signals"
              subtitle="A transparent view of tracked progress"
              meta="PUBLIC"
            />
            <div className="rr2-panel-body">
              {profile.attributes.length === 0 ? (
                <p className="rr2-empty">No tracked signals yet.</p>
              ) : (
                <div className="rr2-attribute-list">
                  {profile.attributes.map((attribute) => {
                    const percent = clampPercent(attribute.percent ?? attribute.value);
                    return (
                      <div className="rr2-attribute" key={attribute.name}>
                        <span className="rr2-attr-icon" aria-hidden="true">
                          {attribute.icon}
                        </span>
                        <div className="rr2-attr-main">
                          <div className="rr2-attr-name">
                            <b>{attribute.name}</b>
                            <small>{attribute.description}</small>
                          </div>
                          <div
                            className="rr2-attr-track"
                            role="progressbar"
                            aria-valuenow={percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${attribute.name} progress`}
                          >
                            <i style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                        <strong className="rr2-attr-value">
                          {attribute.display ??
                            (typeof attribute.value === 'number'
                              ? NUMBER_FORMAT.format(attribute.value)
                              : attribute.value)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rr2-panel">
            <PanelHeading
              title="Activity evidence"
              subtitle="A readable record of work completed"
              meta="ACTIVITY"
            />
            <div className="rr2-panel-body">
              {profile.evidence.length === 0 ? (
                <p className="rr2-empty">No activity recorded yet.</p>
              ) : (
                <div className="rr2-evidence-list">
                  {profile.evidence.map((item) => (
                    <div className="rr2-evidence-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>
                        {typeof item.value === 'number'
                          ? NUMBER_FORMAT.format(item.value)
                          : item.value}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="rr2-stack">
          <section className="rr2-panel">
            <PanelHeading
              title="Milestone showcase"
              subtitle="Quest milestones earned along the way"
              action={
                <button
                  type="button"
                  className="rr2-panel-link"
                  onClick={() => onNavigate('quests')}
                >
                  View quests ↗
                </button>
              }
            />
            <div className="rr2-panel-body">
              {profile.achievements.length === 0 ? (
                <p className="rr2-empty">No milestones are available right now.</p>
              ) : (
                <div className="rr2-achievements">
                  {profile.achievements.map((achievement) => (
                    <article
                      className={`rr2-achievement${achievement.unlocked ? ' is-unlocked' : ''}`}
                      key={achievement.name}
                    >
                      <span className="rr2-achievement-icon" aria-hidden="true">
                        {achievement.icon}
                      </span>
                      <h4>{achievement.name}</h4>
                      <p>{achievement.description}</p>
                      <span className="rr2-achievement-state">
                        {achievement.unlocked ? '✓ UNLOCKED' : '○ LOCKED'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rr2-panel">
            <PanelHeading
              title="Equipped cosmetics"
              subtitle="A neutral realm, a personal touch"
              action={
                <button
                  type="button"
                  className="rr2-panel-link"
                  onClick={() => onNavigate('shop')}
                >
                  Customize ↗
                </button>
              }
            />
            <div className="rr2-panel-body">
              {profile.loadout.length === 0 ? (
                <p className="rr2-empty">No cosmetics equipped.</p>
              ) : (
                <div className="rr2-loadout">
                  {profile.loadout.map((item) => (
                    <div
                      className="rr2-loadout-chip"
                      key={`${item.name}-${item.kind}`}
                    >
                      <span
                        className="rr2-cosmetic-art"
                        data-cosmetic={item.cosmeticId}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        {item.kind}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="rr2-quiet-note">
                Avatar borders are the only cosmetic type in this version.
              </p>
              <div className="rr2-page-actions" style={{ marginTop: 15 }}>
                <button
                  type="button"
                  className="rr2-button rr2-button-secondary rr2-small-button"
                  onClick={onCustomizeProfile ?? (() => onNavigate('shop'))}
                >
                  Edit profile appearance ↗
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <div className="rr2-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function PanelHeading({
  title,
  subtitle,
  meta,
  action,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rr2-panel-head">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action ?? (meta ? <span className="rr2-kicker">{meta}</span> : null)}
    </div>
  );
}

function QuestsView({
  quests,
  lastSyncedAt,
  needsReauth,
  syncing,
  onSync,
  connectAction,
}: {
  quests: RootRealmQuest[];
  lastSyncedAt: string | null;
  needsReauth: boolean;
  syncing: boolean;
  onSync?: () => void;
  connectAction?: () => Promise<void>;
}) {
  const claimed = quests.filter((quest) => quest.status === 'REWARD CLAIMED').length;
  const remaining = quests.length - claimed;
  const remainingRewards = quests
    .filter((quest) => quest.status !== 'REWARD CLAIMED')
    .reduce((sum, quest) => sum + quest.coins, 0);

  return (
    <>
      <PageHeader
        kicker="FIELD JOURNAL"
        title={
          <>
            Quests & <em>rewards</em>
          </>
        }
        description="Objectives give shape to your progress. Every milestone is verified from public GitHub activity and evaluated server-side."
        action={
          <div className="rr2-sync-control">
            <span className="rr2-sync-meta">
              <span className="rr2-kicker">GITHUB SYNC</span>
              <small>
                {lastSyncedAt ? (
                  <>
                    Last synced <LocalTime iso={lastSyncedAt} />
                  </>
                ) : (
                  'Not synced yet'
                )}
              </small>
            </span>
            {needsReauth ? (
              connectAction ? (
                <form action={connectAction}>
                  <button
                    className="rr2-button rr2-button-secondary rr2-small-button"
                    type="submit"
                  >
                    Reconnect GitHub
                  </button>
                </form>
              ) : (
                <button
                  className="rr2-button rr2-button-secondary rr2-small-button"
                  type="button"
                  disabled
                >
                  Reconnect GitHub
                </button>
              )
            ) : (
              <button
                className="rr2-button rr2-button-primary rr2-small-button"
                type="button"
                onClick={onSync}
                disabled={syncing || !onSync}
              >
                {syncing ? 'Syncing…' : 'Sync GitHub'}
              </button>
            )}
          </div>
        }
      />

      <div className="rr2-quest-summary">
        <QuestSummary
          icon="◇"
          value={`${claimed} / ${quests.length}`}
          label="Rewards awarded"
        />
        <QuestSummary icon="✦" value={String(remaining)} label="Milestones remaining" />
        <QuestSummary
          icon="◆"
          value={String(remainingRewards)}
          label="CodeCoins remaining"
        />
      </div>

      {needsReauth && (
        <div className="rr2-alert" role="alert">
          Reconnect GitHub to sync your public activity. Private repository activity is not
          counted in this version.
        </div>
      )}

      {quests.length === 0 ? (
        <p className="rr2-empty">No quests are available right now.</p>
      ) : (
        <div className="rr2-quest-grid">
          {quests.map((quest) => {
            const percent =
              quest.target > 0
                ? clampPercent(Math.round((quest.current / quest.target) * 100))
                : 0;
            const done = quest.status === 'REWARD CLAIMED';
            const incomplete = quest.status === 'HISTORY INCOMPLETE';

            return (
              <article
                className={`rr2-quest-card${done ? ' is-complete' : ''}${incomplete ? ' is-incomplete' : ''}`}
                key={quest.id}
              >
                <div className="rr2-quest-card-head">
                  <span className="rr2-quest-symbol" aria-hidden="true">
                    {quest.icon}
                  </span>
                  <span
                    className={`rr2-quest-status${incomplete ? ' is-incomplete' : ''}`}
                  >
                    {quest.status}
                  </span>
                </div>

                <div className="rr2-kicker">{quest.category}</div>
                <h3>{quest.title}</h3>
                <p>{quest.description}</p>

                <div className="rr2-quest-progress">
                  <div className="rr2-row-between">
                    <span>Evidence progress</span>
                    <strong>
                      {quest.current} / {quest.target}
                    </strong>
                  </div>
                  <div
                    className="rr2-xp-track"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${quest.title} progress`}
                  >
                    <i
                      style={{
                        width: `${percent}%`,
                        background: done
                          ? 'var(--rr2-success)'
                          : incomplete
                            ? 'var(--rr2-warning)'
                            : undefined,
                      }}
                    />
                  </div>
                </div>

                {incomplete && (
                  <p className="rr2-quest-note">
                    History was truncated at GitHub&apos;s search cap, so this milestone
                    cannot be confirmed yet.
                  </p>
                )}

                <div className="rr2-quest-rewards">
                  <span className="rr2-reward-chip">✦ +{quest.xp} XP</span>
                  <span className="rr2-reward-chip">◆ +{quest.coins} CC</span>
                  {quest.skillPoints ? (
                    <span className="rr2-reward-chip">◇ +{quest.skillPoints} SP</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={`rr2-button rr2-quest-action ${done ? 'rr2-button-muted' : 'rr2-button-secondary'}`}
                  disabled
                >
                  {done
                    ? '✓ Reward awarded'
                    : incomplete
                      ? 'History incomplete'
                      : 'Requirements not met'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <p className="rr2-quiet-note">
        Rewards are awarded automatically when verified GitHub activity completes a
        milestone. Progress is evaluated server-side; this interface cannot award quests.
      </p>
    </>
  );
}

function QuestSummary({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rr2-quest-summary-card">
      <span className="rr2-quest-summary-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ShopView({
  cosmetics,
  codeCoins,
  pendingCosmeticId,
  onCosmeticAction,
}: {
  cosmetics: RootRealmCosmetic[];
  codeCoins: number;
  pendingCosmeticId: string | null;
  onCosmeticAction?: (cosmeticId: string, action: CosmeticAction) => void;
}) {
  const [activeKind, setActiveKind] = useState<string>('all');
  const kinds = Array.from(new Set(cosmetics.map((item) => item.kind)));
  const visible =
    activeKind === 'all'
      ? cosmetics
      : cosmetics.filter((item) => item.kind === activeKind);
  const anyPending = pendingCosmeticId !== null;

  return (
    <>
      <PageHeader
        kicker="REALM EXCHANGE"
        title={
          <>
            The cosmetic <em>shop</em>
          </>
        }
        description="Collect the small details that make your realm yours. Every style shares the same neutral interface."
      />

      <div className="rr2-shop-toolbar">
        <div className="rr2-shop-balance">
          <span aria-hidden="true">◆</span>
          <div>
            <small>YOUR BALANCE</small>
            <strong>
              {NUMBER_FORMAT.format(codeCoins)} <span>CODECOINS</span>
            </strong>
          </div>
        </div>

        <div
          className="rr2-shop-filters"
          role="group"
          aria-label="Cosmetic categories"
        >
          <button
            className={`rr2-filter${activeKind === 'all' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={activeKind === 'all'}
            onClick={() => setActiveKind('all')}
          >
            All items
          </button>
          {kinds.map((kind) => (
            <button
              key={kind}
              className={`rr2-filter${activeKind === kind ? ' is-active' : ''}`}
              type="button"
              aria-pressed={activeKind === kind}
              onClick={() => setActiveKind(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
      </div>

      {cosmetics.length === 0 ? (
        <p className="rr2-empty">No cosmetics are available right now.</p>
      ) : visible.length === 0 ? (
        <p className="rr2-empty">No cosmetics match this filter.</p>
      ) : (
        <div className="rr2-shop-grid">
          {visible.map((item) => {
            const busy = pendingCosmeticId === item.id;
            const affordable = codeCoins >= item.cost;
            const purchaseDisabled = item.action === 'purchase' && !affordable;

            return (
              <article className="rr2-shop-card" key={item.id}>
                <div className="rr2-shop-art" data-cosmetic={item.previewValue}>
                  <span aria-hidden="true">{item.icon}</span>
                  {item.tier && <small className="rr2-tier">{item.tier}</small>}
                </div>

                <div className="rr2-shop-card-body">
                  <span className="rr2-shop-kind">{item.kind}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>

                  <div className="rr2-shop-card-foot">
                    <span className="rr2-shop-price">
                      {item.cost === 0 ? (
                        'FREE'
                      ) : (
                        <>
                          ◆ {NUMBER_FORMAT.format(item.cost)} <small>CC</small>
                        </>
                      )}
                    </span>

                    <div className="rr2-shop-actions">
                      {item.action === 'equipped' ? (
                        <>
                          <button
                            type="button"
                            className="rr2-button rr2-button-muted"
                            disabled
                          >
                            ✓ Equipped
                          </button>
                          <button
                            type="button"
                            className="rr2-button rr2-button-secondary"
                            disabled={anyPending || !onCosmeticAction}
                            onClick={() => onCosmeticAction?.(item.id, 'unequip')}
                          >
                            {busy ? 'Updating…' : 'Unequip'}
                          </button>
                        </>
                      ) : item.action === 'purchase' ? (
                        <button
                          type="button"
                          className="rr2-button rr2-button-primary"
                          disabled={anyPending || purchaseDisabled || !onCosmeticAction}
                          onClick={() => onCosmeticAction?.(item.id, 'purchase')}
                        >
                          {busy
                            ? 'Purchasing…'
                            : purchaseDisabled
                              ? 'Not enough coins'
                              : item.actionLabel}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rr2-button rr2-button-secondary"
                          disabled={anyPending || !onCosmeticAction}
                          onClick={() => onCosmeticAction?.(item.id, 'equip')}
                        >
                          {busy ? 'Updating…' : item.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="rr2-quiet-note">
        Cosmetic accents stay local to the item and avatar. The surrounding interface
        remains graphite.
      </p>
    </>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <section className="rr2-panel">
      <div className="rr2-panel-body">
        <p className="rr2-empty">{message}</p>
      </div>
    </section>
  );
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
