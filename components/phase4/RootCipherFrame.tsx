'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';

/**
 * Thin React wrapper around Opus's dependency-free Root Cipher Canvas 2D
 * runtime (`/cosmetics/root-cipher/root-cipher.js`).
 *
 * The runtime is loaded once, lazily, and only in the browser. Each mounted
 * component owns exactly one engine instance, which is destroyed on unmount.
 * The original artwork and animation are never recreated in CSS/React.
 */

export type RootCipherQuality = 'auto' | 'high' | 'medium' | 'low';
export type RootCipherState = 'idle' | 'showcase';

export interface RootCipherFrameHandle {
  /** Play the 5s signature reveal. Resolves true when it finishes. */
  showcase: () => Promise<boolean>;
  /** Cancel any showcase and render the idle loop. */
  idle: () => void;
  play: () => void;
  pause: () => void;
}

export interface RootCipherFrameProps {
  /** CSS length or pixel number. The frame always stays square. */
  size?: number | string;
  quality?: RootCipherQuality;
  /** Idle effect multiplier (default 1). */
  intensity?: number;
  /** Edge-triggered showcase request. `autoShowcase` covers mount-time reveals. */
  state?: RootCipherState;
  /** Play the dramatic reveal once, the first time the frame becomes visible. */
  autoShowcase?: boolean;
  /** Pause the render loop without unmounting (e.g. while a dialog is open). */
  paused?: boolean;
  avatarUrl?: string | null;
  avatarInitial?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onShowcaseEnd?: () => void;
}

const SCRIPT_URL = '/cosmetics/root-cipher/root-cipher.js';
const ARTWORK_URL = '/cosmetics/root-cipher/root-cipher-frame.png';
const SCRIPT_MARKER = 'data-root-cipher-runtime';

interface RootCipherInstance {
  ready: Promise<RootCipherInstance>;
  canvas: HTMLCanvasElement;
  showcase: () => Promise<boolean>;
  setState: (state: RootCipherState) => Promise<boolean>;
  setQuality: (quality: RootCipherQuality) => void;
  setIntensity: (intensity: number) => void;
  play: () => RootCipherInstance;
  pause: () => RootCipherInstance;
  destroy: () => void;
}

interface RootCipherApi {
  create: (target: HTMLElement, options: Record<string, unknown>) => RootCipherInstance;
}

declare global {
  interface Window {
    RootCipher?: RootCipherApi;
  }
}

/**
 * Load the runtime at most once. Every component waits on the same promise, so
 * React re-renders and parallel mounts cannot inject duplicate <script> tags.
 */
let runtimePromise: Promise<RootCipherApi> | null = null;

function loadRuntime(): Promise<RootCipherApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('The Root Cipher runtime is browser-only.'));
  }
  if (window.RootCipher) return Promise.resolve(window.RootCipher);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<RootCipherApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`);

    const settle = () => {
      if (window.RootCipher) resolve(window.RootCipher);
      else reject(new Error('The Root Cipher runtime loaded without exposing RootCipher.'));
    };
    const fail = () => {
      runtimePromise = null;
      reject(new Error('Failed to load the Root Cipher runtime.'));
    };

    if (existing) {
      if (window.RootCipher) {
        settle();
        return;
      }
      existing.addEventListener('load', settle, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.setAttribute(SCRIPT_MARKER, 'true');
    script.addEventListener('load', settle, { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        fail();
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  return runtimePromise;
}

export const RootCipherFrame = forwardRef<RootCipherFrameHandle, RootCipherFrameProps>(
  function RootCipherFrame(
    {
      size = '100%',
      quality = 'auto',
      intensity = 1,
      state = 'idle',
      autoShowcase = false,
      paused = false,
      avatarUrl,
      avatarInitial,
      label,
      className,
      style,
      onShowcaseEnd,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<RootCipherInstance | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    const configRef = useRef({ quality, intensity, paused });
    const autoShowcaseRef = useRef(autoShowcase);
    const autoShowcaseDone = useRef(false);
    const visibleRef = useRef(true);
    const previousStateRef = useRef(state);
    const onShowcaseEndRef = useRef(onShowcaseEnd);

    useEffect(() => {
      onShowcaseEndRef.current = onShowcaseEnd;
    }, [onShowcaseEnd]);

    useEffect(() => {
      autoShowcaseRef.current = autoShowcase;
    }, [autoShowcase]);

    const maybeAutoShowcase = useCallback((instance?: RootCipherInstance) => {
      const fx = instance ?? instanceRef.current;
      if (
        !autoShowcaseRef.current ||
        autoShowcaseDone.current ||
        !fx ||
        !visibleRef.current
      ) {
        return;
      }
      autoShowcaseDone.current = true;
      fx.ready
        .then(() => fx.showcase())
        .catch(() => {
          /* A failed reveal leaves the idle loop untouched. */
        });
    }, []);

    // Create exactly one engine instance for this mount.
    useEffect(() => {
      let cancelled = false;
      const container = containerRef.current;
      if (!container) return;

      loadRuntime()
        .then((api) => {
          if (cancelled || !containerRef.current) return;

          const fx = api.create(containerRef.current, {
            src: ARTWORK_URL,
            state: 'idle',
            // Play is started from onReady so an unmount during image load can
            // never leave a detached animation loop running.
            autoplay: false,
            quality: configRef.current.quality,
            intensity: configRef.current.intensity,
            pauseWhenHidden: true,
            reducedMotion: 'auto',
            onReady: () => {
              if (cancelled) {
                fx.destroy();
                return;
              }
              setStatus('ready');
              if (!configRef.current.paused) fx.play();
              maybeAutoShowcase(fx);
            },
            onShowcaseEnd: () => onShowcaseEndRef.current?.(),
          });

          instanceRef.current = fx;
          fx.canvas.classList.add('rc-canvas');
          fx.canvas.setAttribute('aria-hidden', 'true');
          fx.ready.catch(() => {
            if (!cancelled) setStatus('error');
          });
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });

      return () => {
        cancelled = true;
        instanceRef.current?.destroy();
        instanceRef.current = null;
      };
    }, [maybeAutoShowcase]);

    // Keep live options in sync without recreating the instance.
    useEffect(() => {
      configRef.current.quality = quality;
      instanceRef.current?.setQuality(quality);
    }, [quality]);

    useEffect(() => {
      configRef.current.intensity = intensity;
      instanceRef.current?.setIntensity(intensity);
    }, [intensity]);

    useEffect(() => {
      configRef.current.paused = paused;
      const fx = instanceRef.current;
      if (!fx) return;
      if (paused) fx.pause();
      else fx.play();
    }, [paused]);

    // Declarative, edge-triggered showcase requests.
    useEffect(() => {
      const previous = previousStateRef.current;
      previousStateRef.current = state;
      if (state === previous) return;

      const fx = instanceRef.current;
      if (!fx) return;
      if (state === 'showcase') {
        fx.ready.then(() => fx.showcase()).catch(() => {});
      } else {
        fx.ready.then(() => fx.setState('idle')).catch(() => {});
      }
    }, [state]);

    // Reveal once when the featured presentation first enters the viewport.
    useEffect(() => {
      if (!autoShowcase) return;
      const el = containerRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') {
        maybeAutoShowcase();
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const isVisible = entries[0]?.isIntersecting ?? false;
          visibleRef.current = isVisible;
          if (isVisible) maybeAutoShowcase();
        },
        { threshold: 0.35 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [autoShowcase, maybeAutoShowcase]);

    useImperativeHandle(
      ref,
      () => ({
        showcase: () => {
          const fx = instanceRef.current;
          if (!fx) return Promise.resolve(false);
          return fx.ready.then(() => fx.showcase());
        },
        idle: () => {
          instanceRef.current?.setState('idle');
        },
        play: () => {
          instanceRef.current?.play();
        },
        pause: () => {
          instanceRef.current?.pause();
        },
      }),
      []
    );

    const width = typeof size === 'number' ? `min(100%, ${size}px)` : size;
    const classes = ['rc-frame', className].filter(Boolean).join(' ');

    return (
      <div
        ref={containerRef}
        className={classes}
        data-root-cipher-status={status}
        data-ready={status === 'ready' ? 'true' : undefined}
        style={{ width, ...style }}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        aria-busy={status === 'loading' ? 'true' : undefined}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="rc-avatar" src={avatarUrl} alt="" />
        ) : avatarInitial ? (
          <span className="rc-avatar rc-avatar-initial" aria-hidden="true">
            {avatarInitial}
          </span>
        ) : null}

        {/* Static, transparent artwork shown while the runtime loads and as a
            no-JS / load-failure fallback. The animated canvas paints over it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rc-fallback" src={ARTWORK_URL} alt="" aria-hidden="true" />
      </div>
    );
  }
);