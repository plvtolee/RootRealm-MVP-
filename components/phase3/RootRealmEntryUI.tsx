"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./RootRealmEntryUI.css";

/* -------------------------------------------------------------------------- */
/* Login UI                                                                    */
/* -------------------------------------------------------------------------- */

export interface RootRealmLoginProps {
  onGithubSignIn?: () => void;
  onBackToHome?: () => void;
  loading?: boolean;
  error?: string;
  productName?: string;
}

export function RootRealmLogin({
  onGithubSignIn,
  onBackToHome,
  loading = false,
  error,
  productName = "ROOTREALM",
}: RootRealmLoginProps) {
  return (
    <main className="rr3-root rr3-auth-root">
      <div className="rr3-auth-noise" aria-hidden="true" />
      <header className="rr3-auth-header">
        <a className="rr3-brand" href="#top" onClick={(event) => { event.preventDefault(); onBackToHome?.(); }} aria-label="RootRealm home">
          <span className="rr3-brand-mark" aria-hidden="true">✳</span>
          <span>{productName}</span>
        </a>
        <span className="rr3-auth-header-note">A DEVELOPER PROGRESSION REALM</span>
      </header>

      <section className="rr3-auth-layout" aria-labelledby="rr3-login-title">
        <div className="rr3-auth-story">
          <div className="rr3-eyebrow"><span className="rr3-status-dot" /> YOUR WORK, MADE VISIBLE</div>
          <h1>Build with intent.<br /><em>Progress with purpose.</em></h1>
          <p className="rr3-auth-lede">A quieter place to track your craft, earn your progress, and make a mark alongside other developers.</p>

          <div className="rr3-auth-preview" aria-label="Example RootRealm progression card">
            <div className="rr3-auth-preview-top">
              <span className="rr3-micro-label">YOUR REALM, YOUR PACE</span>
              <span className="rr3-live-pill"><i /> PROFILE PREVIEW</span>
            </div>
            <div className="rr3-auth-preview-person">
              <div className="rr3-auth-avatar" aria-hidden="true">R<span>✦</span></div>
              <div className="rr3-auth-person-copy">
                <strong>Rising builder</strong>
                <span>LEVEL 08 <b>·</b> THE WAYFARER</span>
              </div>
              <div className="rr3-auth-xp-copy"><strong>1,280</strong><small>XP</small></div>
            </div>
            <div className="rr3-auth-progress"><span style={{ width: "72%" }} /></div>
            <div className="rr3-auth-progress-meta"><span>PROGRESSION</span><span>72% TO NEXT LEVEL</span></div>
            <div className="rr3-auth-paths">
              <div><span>BUILDER</span><i><b style={{ width: "78%" }} /></i></div>
              <div><span>SCHOLAR</span><i><b style={{ width: "61%" }} /></i></div>
              <div><span>ARCHITECT</span><i><b style={{ width: "67%" }} /></i></div>
            </div>
          </div>

          <div className="rr3-auth-pillars">
            <div><span className="rr3-pillar-symbol">⌘</span><span><strong>Build</strong><small>Turn real work into progress.</small></span></div>
            <div><span className="rr3-pillar-symbol">◇</span><span><strong>Advance</strong><small>Earn every level and milestone.</small></span></div>
            <div><span className="rr3-pillar-symbol">✳</span><span><strong>Connect</strong><small>Find your people in the realm.</small></span></div>
          </div>
        </div>

        <div className="rr3-auth-form-wrap">
          <div className="rr3-auth-form-panel">
            <div className="rr3-auth-form-kicker">WELCOME BACK</div>
            <h2 id="rr3-login-title">Enter the <em>realm.</em></h2>
            <p className="rr3-auth-form-copy">Sign in to continue where your work left off.</p>

            {error ? <div className="rr3-auth-error" role="alert">{error}</div> : null}

            <button className="rr3-github-button" type="button" onClick={onGithubSignIn} disabled={!onGithubSignIn || loading}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="rr3-github-icon"><path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.11.08 1.7 1.14 1.7 1.14.99 1.69 2.6 1.2 3.24.92.1-.72.39-1.2.7-1.48-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.06 1.14a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.12 2.95.71.78 1.14 1.77 1.14 2.99 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.02.75 2.06v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
              <span>{loading ? "Connecting to GitHub…" : "Continue with GitHub"}</span>
              <span className="rr3-button-arrow" aria-hidden="true">↗</span>
            </button>

            <div className="rr3-auth-divider"><span /> <small>SECURE ACCOUNT ACCESS</small> <span /></div>
            <div className="rr3-auth-security"><span className="rr3-lock-symbol">⌑</span><p>RootRealm uses GitHub to verify your account. Your developer activity powers progression; your private repositories stay private.</p></div>
            <div className="rr3-auth-create"><span>New to RootRealm?</span><strong>Your realm begins when you sign in.</strong></div>
          </div>
          <div className="rr3-auth-footnote"><span>© ROOTREALM</span><span>BUILT FOR THE LONG GAME</span></div>
        </div>
      </section>

      <footer className="rr3-auth-footer"><span>ROOTREALM <b>·</b> DEVELOPER PROGRESSION</span><span>BUILD SOMETHING THAT LASTS.</span></footer>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Community UI — Discover, Friends and Requests in one section                */
/* -------------------------------------------------------------------------- */

export type CommunityView = "discover" | "friends" | "requests";
export type RelationshipState = "none" | "outgoing" | "incoming" | "friends";
export type RequestDirection = "incoming" | "outgoing";

export interface CommunityMember {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  level: number;
  rank?: string;
  role?: string;
  bio?: string;
  skills?: number;
  streak?: number;
  xp?: number;
  joinedLabel?: string;
  featured?: boolean;
  relationship?: RelationshipState;
  avatarUrl?: string | null;
  avatarStyle?: "stone" | "ash" | "moss" | "rust" | "ice" | "sand";
}

export interface CommunityRequest {
  id: string;
  member: CommunityMember;
  direction: RequestDirection;
  sentLabel?: string;
}

export interface CommunityCurrentUser {
  id?: string;
  displayName: string;
  username: string;
  initials: string;
  avatarUrl?: string | null;
  level?: number;
}

export interface RootRealmCommunityProps {
  currentUser: CommunityCurrentUser;
  members: CommunityMember[];
  memberCount?: number;
  friends: CommunityMember[];
  requests: CommunityRequest[];
  initialView?: CommunityView;
  showTopbar?: boolean;
  onNavigate?: (section: "profile" | "quests" | "shop" | "community") => void;
  onViewProfile?: (username: string) => void;
  onAddFriend?: (memberId: string) => void;
  onCancelRequest?: (memberId: string) => void;
  onAcceptRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onRemoveFriend?: (memberId: string) => void;
  /**
   * Controlled Discover search. When `onSearchQueryChange` is supplied the
   * `members` array is treated as the authoritative (server-side) result set
   * and the built-in client filter is skipped.
   */
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searching?: boolean;
  /** Optional status banner rendered above the community panel. */
  feedback?: { type: "success" | "error"; message: string } | null;
  /** Optional sign-out handler rendered in the top bar account area. */
  onSignOut?: () => void;
}

const NAV_ITEMS: { id: "profile" | "quests" | "shop" | "community"; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "⌂" },
  { id: "quests", label: "Quests", icon: "◇" },
  { id: "shop", label: "Shop", icon: "▤" },
  { id: "community", label: "Community", icon: "◎" },
];

export function RootRealmCommunity({
  currentUser,
  members,
  memberCount,
  friends,
  requests,
  initialView = "discover",
  showTopbar = true,
  onNavigate,
  onViewProfile,
  onAddFriend,
  onCancelRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  searchQuery,
  onSearchQueryChange,
  searching = false,
  feedback,
  onSignOut,
}: RootRealmCommunityProps) {
  const [view, setView] = useState<CommunityView>(initialView);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "recent" | "level">("all");

  const incomingCount = requests.filter((request) => request.direction === "incoming").length;
  const outgoingCount = requests.filter((request) => request.direction === "outgoing").length;
  const totalMembers = memberCount ?? members.length;

  const isControlledSearch = typeof onSearchQueryChange === "function";
  const activeQuery = isControlledSearch ? (searchQuery ?? "") : query;
  const setActiveQuery = (next: string) => {
    if (isControlledSearch) {
      onSearchQueryChange?.(next);
    } else {
      setQuery(next);
    }
  };

  const visibleMembers = useMemo(() => {
    const needle = activeQuery.trim().replace(/^@/, "").toLowerCase();
    let result = members.filter((member) => currentUser.id ? member.id !== currentUser.id : member.username !== currentUser.username);
    // In controlled mode `members` is already the server-side search result.
    if (!isControlledSearch && needle) {
      result = result.filter((member) =>
        member.username.toLowerCase().includes(needle) || member.displayName.toLowerCase().includes(needle),
      );
    }
    if (!needle) {
      if (filter === "recent") result = result.filter((member) => Boolean(member.joinedLabel));
      if (filter === "level") result = [...result].sort((a, b) => b.level - a.level);
    }
    return result;
  }, [members, currentUser.id, currentUser.username, activeQuery, filter, isControlledSearch]);

  const renderMemberAction = (member: CommunityMember) => {
    const state = member.relationship ?? "none";
    if (state === "friends") {
      return <button className="rr3-action-button rr3-action-friend" type="button" disabled>✓ Connected</button>;
    }
    if (state === "outgoing") {
      return <button className="rr3-action-button rr3-action-quiet" type="button" onClick={() => onCancelRequest?.(member.id)} disabled={!onCancelRequest}>Request sent <span>↗</span></button>;
    }
    if (state === "incoming") {
      return <button className="rr3-action-button rr3-action-quiet" type="button" onClick={() => setView("requests")}>Respond <span>↗</span></button>;
    }
    return <button className="rr3-action-button rr3-action-primary" type="button" onClick={() => onAddFriend?.(member.id)} disabled={!onAddFriend}>＋ Add friend</button>;
  };

  return (
    <main className="rr3-root rr3-community-root">
      {showTopbar ? (
        <header className="rr3-topbar">
          <a className="rr3-brand" href="#community" onClick={(event) => event.preventDefault()}>
            <span className="rr3-brand-mark" aria-hidden="true">✳</span><span>ROOTREALM</span>
          </a>
          <nav className="rr3-main-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => <button key={item.id} type="button" aria-current={item.id === "community" ? "page" : undefined} onClick={() => onNavigate?.(item.id)}><span>{item.icon}</span>{item.label}</button>)}
          </nav>
          <div className="rr3-top-account"><span className="rr3-top-account-copy"><strong>{currentUser.displayName}</strong><small>@{currentUser.username}</small></span><span className="rr3-top-avatar">{currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : currentUser.initials}</span>{onSignOut ? <button type="button" className="rr3-signout" onClick={onSignOut}>Sign out</button> : null}</div>
        </header>
      ) : null}

      <div className="rr3-community-wrap">
        <div className="rr3-community-head">
          <div><div className="rr3-eyebrow">THE COMMONS <span className="rr3-eyebrow-line" /></div><h1>Find your <em>people.</em></h1><p>Meet the builders behind the progress. Discover RootRealm members and grow your circle.</p></div>
          <div className="rr3-community-head-meta"><span className="rr3-community-online"><i /> THE REALM IS GROWING</span><strong>{totalMembers.toLocaleString()} <small>MEMBERS</small></strong></div>
        </div>

        {feedback ? <div className={`rr3-feedback is-${feedback.type}`} role="status" aria-live="polite">{feedback.message}</div> : null}

        <section className="rr3-community-panel">
          <div className="rr3-community-toolbar">
            <div className="rr3-community-tabs" role="tablist" aria-label="Community views">
              <button type="button" role="tab" aria-selected={view === "discover"} className={view === "discover" ? "is-active" : ""} onClick={() => setView("discover")}><span>⌕</span> Discover <small>{totalMembers}</small></button>
              <button type="button" role="tab" aria-selected={view === "friends"} className={view === "friends" ? "is-active" : ""} onClick={() => setView("friends")}><span>◎</span> Friends <small>{friends.length}</small></button>
              <button type="button" role="tab" aria-selected={view === "requests"} className={view === "requests" ? "is-active" : ""} onClick={() => setView("requests")}><span>↔</span> Requests {incomingCount > 0 ? <b className="rr3-tab-count">{incomingCount}</b> : null}</button>
            </div>
            <div className="rr3-community-context"><span className="rr3-context-dot" /> ONE COMMUNITY, YOUR CONNECTIONS</div>
          </div>

          {view === "discover" ? (
            <div className="rr3-community-content">
              <div className="rr3-discover-toolbar">
                <label className="rr3-search-box"><span aria-hidden="true">⌕</span><input value={activeQuery} onChange={(event) => setActiveQuery(event.target.value)} placeholder="Search by name or @username" aria-label="Search RootRealm members" />{activeQuery ? <button type="button" onClick={() => setActiveQuery("")} aria-label="Clear search">×</button> : searching ? <kbd>…</kbd> : <kbd>/</kbd>}</label>
                <div className="rr3-filter-group" aria-label="Sort members">
                  <button type="button" className={filter === "all" ? "is-selected" : ""} onClick={() => setFilter("all")}>All members</button>
                  <button type="button" className={filter === "recent" ? "is-selected" : ""} onClick={() => setFilter("recent")}>Recently joined</button>
                  <button type="button" className={filter === "level" ? "is-selected" : ""} onClick={() => setFilter("level")}>Top level</button>
                </div>
              </div>

              <div className="rr3-section-line"><span>{activeQuery ? "SEARCH RESULTS" : "PEOPLE TO KNOW"}</span><small>{searching ? "SEARCHING…" : `${visibleMembers.length} MEMBERS`}</small></div>
              {visibleMembers.length ? <div className="rr3-member-grid">{visibleMembers.map((member) => <MemberCard key={member.id} member={member} action={renderMemberAction(member)} onViewProfile={onViewProfile} />)}</div> : <EmptyState title="No members found" text="Try another name or username. New builders appear here as they join the realm." />}
            </div>
          ) : null}

          {view === "friends" ? (
            <div className="rr3-community-content">
              <div className="rr3-view-heading"><div><span className="rr3-section-kicker">YOUR CIRCLE</span><h2>People you build <em>alongside.</em></h2><p>Your RootRealm connections, all in one place.</p></div><span className="rr3-view-count">{friends.length.toString().padStart(2, "0")} <small>CONNECTED</small></span></div>
              {friends.length ? <div className="rr3-member-grid">{friends.map((member) => <MemberCard key={member.id} member={member} action={<button className="rr3-action-button rr3-action-friend" type="button" onClick={() => onRemoveFriend?.(member.id)} disabled={!onRemoveFriend}>✓ Friends <span>⌄</span></button>} onViewProfile={onViewProfile} />)}</div> : <EmptyState title="Your circle starts here" text="Find developers in Discover and send a connection request to build your circle." action={<button className="rr3-action-button rr3-action-primary" type="button" onClick={() => setView("discover")}>Explore members ↗</button>} />}
            </div>
          ) : null}

          {view === "requests" ? (
            <div className="rr3-community-content">
              <div className="rr3-view-heading"><div><span className="rr3-section-kicker">CONNECTIONS</span><h2>Requests & <em>invites.</em></h2><p>Decide who gets a place in your circle.</p></div><span className="rr3-view-count">{incomingCount.toString().padStart(2, "0")} <small>INCOMING</small></span></div>
              <div className="rr3-requests-columns">
                <section className="rr3-request-column"><div className="rr3-request-heading"><h3>Incoming</h3><span>{incomingCount}</span></div>
                  {requests.filter((request) => request.direction === "incoming").length ? requests.filter((request) => request.direction === "incoming").map((request) => <RequestRow key={request.id} request={request} onViewProfile={onViewProfile} onAccept={() => onAcceptRequest?.(request.id)} onDecline={() => onDeclineRequest?.(request.id)} canRespond={Boolean(onAcceptRequest && onDeclineRequest)} />) : <div className="rr3-empty-inline">No incoming requests right now.</div>}
                </section>
                <section className="rr3-request-column"><div className="rr3-request-heading"><h3>Outgoing</h3><span>{outgoingCount}</span></div>
                  {requests.filter((request) => request.direction === "outgoing").length ? requests.filter((request) => request.direction === "outgoing").map((request) => <RequestRow key={request.id} request={request} onViewProfile={onViewProfile} onCancel={() => onCancelRequest?.(request.member.id)} canRespond={Boolean(onCancelRequest)} />) : <div className="rr3-empty-inline">You haven&apos;t sent any requests.</div>}
                </section>
              </div>
            </div>
          ) : null}
        </section>

        <footer className="rr3-community-footer"><span>ROOTREALM <b>·</b> THE COMMONS</span><span>BUILD YOUR CIRCLE. KEEP BUILDING.</span></footer>
      </div>
    </main>
  );
}

function MemberCard({ member, action, onViewProfile }: { member: CommunityMember; action: ReactNode; onViewProfile?: (username: string) => void }) {
  return (
    <article className="rr3-member-card">
      <div className="rr3-member-card-top"><span className={`rr3-member-avatar rr3-avatar-${member.avatarStyle ?? "stone"}`}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.initials}<i /></span><div className="rr3-member-level"><small>LEVEL</small><strong>{member.level.toString().padStart(2, "0")}</strong></div></div>
      <div className="rr3-member-identity"><h3>{member.displayName}</h3><span>@{member.username}</span></div>
      {member.bio ? <p className="rr3-member-bio">{member.bio}</p> : null}
      <div className="rr3-member-meta"><span>{member.rank ?? `LEVEL ${member.level}`}</span>{typeof member.xp === "number" ? <span>{member.xp.toLocaleString()} XP</span> : null}{member.role ? <span>{member.role}</span> : null}{member.joinedLabel ? <span>{member.joinedLabel}</span> : null}</div>
      {member.skills !== undefined || member.streak !== undefined ? <div className="rr3-member-stats"><span><strong>{member.skills ?? 0}</strong> SKILLS</span><span><strong>{member.streak ?? 0}</strong> DAY STREAK</span></div> : null}
      <div className="rr3-member-card-actions"><button type="button" className="rr3-view-profile-button" onClick={() => onViewProfile?.(member.username)} disabled={!onViewProfile}>View profile <span>↗</span></button>{action}</div>
    </article>
  );
}

function RequestRow({ request, onViewProfile, onAccept, onDecline, onCancel, canRespond }: {
  request: CommunityRequest;
  onViewProfile?: (username: string) => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  canRespond: boolean;
}) {
  const member = request.member;
  return (
    <article className="rr3-request-row">
      <button type="button" className={`rr3-request-avatar rr3-avatar-${member.avatarStyle ?? "stone"}`} onClick={() => onViewProfile?.(member.username)} disabled={!onViewProfile}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.initials}</button>
      <div className="rr3-request-person"><strong>{member.displayName}</strong><span>@{member.username} · Level {member.level}</span><small>{request.sentLabel ?? (request.direction === "incoming" ? "Wants to connect" : "Awaiting response")}</small></div>
      {request.direction === "incoming" ? <div className="rr3-request-actions"><button className="rr3-action-button rr3-action-primary" type="button" onClick={onAccept} disabled={!canRespond}>Accept</button><button className="rr3-request-decline" type="button" onClick={onDecline} disabled={!canRespond}>Decline</button></div> : <button className="rr3-request-cancel" type="button" onClick={onCancel} disabled={!canRespond}>Cancel request</button>}
    </article>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="rr3-empty-state"><span className="rr3-empty-mark" aria-hidden="true">◎</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export default RootRealmCommunity;
