import type { CosmeticMotif } from '@/lib/cosmetics/visuals';

/**
 * Original line-art motifs for each cosmetic. Drawn on a 120×120 canvas with
 * `currentColor` so the surrounding palette (CSS variables) drives the accent.
 * These are presentation-only and safe to render on the server or client.
 */
export function MotifArtwork({ motif }: { motif: CosmeticMotif }) {
  return (
    <svg
      className="p4-motif"
      viewBox="0 0 120 120"
      role="presentation"
      aria-hidden="true"
      fill="none"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {renderMotif(motif)}
      </g>
    </svg>
  );
}

function renderMotif(motif: CosmeticMotif) {
  switch (motif) {
    case 'groove':
      return (
        <>
          <path d="M20 60h32M68 60h32" />
          <path d="M52 54h16v12H52z" />
          <path d="M20 40v40M100 40v40" opacity=".32" />
          <path d="M34 56v8M86 56v8" opacity=".45" />
        </>
      );

    case 'bevel':
      return (
        <>
          <path d="M24 44l20-20M32 56l32-32" opacity=".85" />
          <path d="M96 44L76 24M88 56L56 24" opacity=".85" />
          <path d="M24 76l20 20M32 64l32 32" opacity=".5" />
          <path d="M96 76L76 96M88 64L56 96" opacity=".5" />
          <circle cx="60" cy="60" r="9" />
          <path d="M60 40v8M60 72v8" opacity=".6" />
        </>
      );

    case 'grid':
      return (
        <>
          <g opacity=".62">
            <path d="M36 24v72M60 24v72M84 24v72" />
            <path d="M24 36h72M24 60h72M24 84h72" />
          </g>
          <path d="M24 24h10v10H24zM86 24h10v10H86zM24 86h10v10H24zM86 86h10v10H86z" strokeWidth="1.4" />
          <circle cx="60" cy="60" r="3" fill="currentColor" stroke="none" />
        </>
      );

    case 'circuit':
      return (
        <>
          <path d="M22 44h20v18h22M42 44V30h30" />
          <path d="M98 76H78V58H56M78 76v14H48" />
          <path d="M22 76h14v-8M98 44H88v8" opacity=".55" />
          <circle cx="60" cy="60" r="4.5" fill="currentColor" stroke="none" />
          <circle cx="42" cy="44" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="78" cy="76" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="60" cy="62" r="11" opacity=".4" />
        </>
      );

    case 'rime':
      return (
        <>
          <path d="M60 24v72M29 42l62 36M91 42L29 78" />
          <g opacity=".7">
            <path d="M60 36l-7-8M60 36l7-8M60 84l-7 8M60 84l7 8" />
            <path d="M41 46l-10-2M41 46l-2-10M79 74l10 2M79 74l2 10" />
            <path d="M79 46l10-2M79 46l2-10M41 74l-10 2M41 74l-2 10" />
          </g>
          <circle cx="60" cy="60" r="8" />
        </>
      );

    case 'ember':
      return (
        <>
          <path d="M46 96l9-21-8-14 13-17-4-18" />
          <path d="M78 94L68 70l10-14-12-19 6-14" opacity=".72" />
          <path d="M34 92l6-12M88 88l-4-10" opacity=".45" />
          <g fill="currentColor" stroke="none" opacity=".85">
            <circle cx="48" cy="39" r="2.6" />
            <circle cx="73" cy="52" r="2" />
            <circle cx="61" cy="27" r="1.6" />
            <circle cx="82" cy="36" r="1.4" />
          </g>
          <path d="M54 78c0-5 4-8 6-11 2 4 6 6 6 11a6 6 0 0 1-12 0z" opacity=".8" />
        </>
      );

    case 'neon':
      return (
        <>
          <rect x="25" y="29" width="70" height="62" rx="11" />
          <path d="M38 62h9l6-12 8 24 7-14h14" strokeWidth="1.8" />
          <path d="M25 45v-4a12 12 0 0 1 12-12h38" opacity=".45" />
          <path d="M95 75v4a12 12 0 0 1-12 12H45" opacity=".45" />
        </>
      );

    case 'prism':
      return (
        <>
          <path d="M60 25l33 60H27z" />
          <path d="M18 62h12M90 62h12" opacity=".8" />
          <path d="M42 85l-9 13M78 85l9 13" opacity=".5" />
          <path d="M48 57h24" opacity=".7" />
          <path d="M60 25v60" opacity=".25" />
          <g fill="currentColor" stroke="none" opacity=".7">
            <circle cx="60" cy="48" r="1.6" />
            <circle cx="19" cy="62" r="1.4" />
            <circle cx="101" cy="62" r="1.4" />
          </g>
        </>
      );

    case 'aurora':
      return (
        <>
          <path d="M32 30c17 10 17 23 0 30s-17 23 0 30" opacity=".85" />
          <path d="M54 26c17 12 17 25 0 34s-17 25 0 34" opacity=".55" />
          <path d="M76 30c17 10 17 23 0 30s-17 23 0 30" opacity=".85" />
          <path d="M44 44c6 5 6 11 0 16M66 52c6 5 6 11 0 16" opacity=".35" />
        </>
      );

    case 'sun':
      return (
        <>
          <circle cx="60" cy="60" r="15" />
          <circle cx="60" cy="60" r="33" strokeDasharray="2 7" opacity=".7" />
          <g opacity=".82">
            <path d="M60 27v-9M60 93v9M27 60h-9M93 60h9" />
            <path d="M37 37l-6-6M83 83l6 6M83 37l6-6M37 83l-6 6" />
          </g>
          <circle cx="60" cy="60" r="5.5" fill="currentColor" stroke="none" />
          <circle cx="93" cy="60" r="2.6" fill="currentColor" stroke="none" />
        </>
      );

    case 'wisp':
      return (
        <>
          <path d="M45 74c-10-8-6-20 2-25-2 9 4 11 4 17a8 8 0 0 1-6 8z" />
          <path d="M66 69c-8-10 0-21 8-26-4 10 6 14 2 23a8 8 0 0 1-10 3z" opacity=".78" />
          <path d="M35 86h50M47 86v9h26v-9" opacity=".55" />
          <circle cx="54" cy="58" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="74" cy="53" r="1.4" fill="currentColor" stroke="none" />
        </>
      );

    case 'constellation':
      return (
        <>
          <path
            d="M28 46l18-13 16 10 21-8 13 16-11 17-18 6-16-10-17 4-8-12z"
            opacity=".55"
          />
          <path
            d="M46 33l16 10 21-8M62 43l-10 31M52 74l18 6 11-17M28 46l18 4M81 60l13-15"
            opacity=".32"
          />
          <ellipse cx="60" cy="60" rx="38" ry="19" transform="rotate(-17 60 60)" strokeDasharray="2 5" opacity=".4" />
          <g fill="currentColor" stroke="none">
            <circle cx="46" cy="33" r="2.7" />
            <circle cx="62" cy="43" r="2.2" />
            <circle cx="83" cy="35" r="2" />
            <circle cx="52" cy="74" r="2.5" />
            <circle cx="70" cy="80" r="1.8" />
            <circle cx="28" cy="46" r="1.6" />
            <circle cx="94" cy="44" r="1.6" />
            <circle cx="60" cy="60" r="1.2" opacity=".7" />
          </g>
        </>
      );

    case 'cipher':
      return (
        <>
          <path d="M60 18l36 21v42L60 102 24 81V39z" />
          <path d="M60 30l25 15v30L60 90 35 75V45z" opacity=".68" />
          <circle cx="60" cy="60" r="17" strokeDasharray="2 4" opacity=".82" />
          <path d="M60 47v11" strokeWidth="1.6" />
          <path d="M54 67a6 6 0 1 0 12 0 6 6 0 0 0-12 0z" />
          <g fill="currentColor" stroke="none" opacity=".55" fontFamily="monospace" fontSize="6">
            <text x="50" y="28">0</text>
            <text x="65" y="28">1</text>
            <text x="50" y="99">1</text>
            <text x="65" y="99">0</text>
          </g>
        </>
      );

    default:
      return <circle cx="60" cy="60" r="26" />;
  }
}