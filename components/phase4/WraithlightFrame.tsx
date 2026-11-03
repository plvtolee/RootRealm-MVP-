'use client';

import { useEffect, useRef, useState } from 'react';

const BASE_PATH = '/cosmetics/wraithlight';
const ARTWORK_PATH = `${BASE_PATH}/wraithlight-frame.png`;
const PLAYBACK_SPEED = 4;

interface WraithlightConfig {
  artwork: string;
  leafSprite: string;
  size: number;
  loopSeconds: number;
  [key: string]: unknown;
}

interface WraithlightEngine {
  load(): Promise<WraithlightEngine>;
  playIdle(): void;
  pause(): void;
  resume(): void;
  setSpeed(speed: number): void;
  renderAt(seconds: number): void;
  destroy(): void;
}

interface WraithlightWindow extends Window {
  WRAITHLIGHT_CONFIG?: WraithlightConfig;
  WraithlightFrame?: new (canvas: HTMLCanvasElement, config: WraithlightConfig) => WraithlightEngine;
}

interface WraithlightFrameProps {
  avatarUrl?: string | null;
  avatarInitial?: string;
  paused?: boolean;
  className?: string;
  label?: string;
}

let configPromise: Promise<WraithlightConfig> | null = null;
let enginePromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-wraithlight-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const onError = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.wraithlightSrc = src;
      document.head.appendChild(script);
    }
  });
}

function loadRuntime(): Promise<WraithlightConfig> {
  const runtimeWindow = window as WraithlightWindow;
  if (runtimeWindow.WRAITHLIGHT_CONFIG && runtimeWindow.WraithlightFrame) {
    return Promise.resolve(runtimeWindow.WRAITHLIGHT_CONFIG);
  }

  configPromise ??= loadScript(`${BASE_PATH}/config.js`).then(() => {
    const config = (window as WraithlightWindow).WRAITHLIGHT_CONFIG;
    if (!config) throw new Error('Wraithlight configuration did not load.');
    return config;
  }).catch((error: unknown) => {
    configPromise = null;
    throw error;
  });

  enginePromise ??= configPromise.then(() => loadScript(`${BASE_PATH}/wraithlight.js`)).catch((error: unknown) => {
    enginePromise = null;
    throw error;
  });

  return Promise.all([configPromise, enginePromise]).then(([config]) => config);
}

export function WraithlightFrame({
  avatarUrl,
  avatarInitial,
  paused = false,
  className,
  label,
}: WraithlightFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<WraithlightEngine | null>(null);
  const pausedRef = useRef(paused);
  const syncPlaybackRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    syncPlaybackRef.current?.();
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let cancelled = false;
    let inViewport = typeof IntersectionObserver === 'undefined';
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let documentVisible = document.visibilityState !== 'hidden';
    let started = false;

    const syncPlayback = () => {
      const engine = instanceRef.current;
      if (!engine) return;
      if (reducedMotion) {
        engine.pause();
        engine.renderAt(0);
        return;
      }
      if (!inViewport || !documentVisible || pausedRef.current) {
        engine.pause();
        return;
      }
      if (started) engine.resume();
      else {
        started = true;
        engine.playIdle();
      }
    };
    syncPlaybackRef.current = syncPlayback;

    const start = async () => {
      if (!inViewport || instanceRef.current || cancelled) return;
      try {
        const config = await loadRuntime();
        if (cancelled) return;
        const Engine = (window as WraithlightWindow).WraithlightFrame;
        if (!Engine) throw new Error('Wraithlight animation engine did not load.');

        const engine = new Engine(canvas, config);
        instanceRef.current = engine;
        await engine.load();
        if (cancelled) {
          engine.destroy();
          instanceRef.current = null;
          return;
        }

        engine.setSpeed(PLAYBACK_SPEED);
        engine.renderAt(0);
        setReady(true);
        syncPlayback();
      } catch {
        instanceRef.current?.destroy();
        instanceRef.current = null;
        if (!cancelled) setFailed(true);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      syncPlayback();
    };
    const onVisibilityChange = () => {
      documentVisible = document.visibilityState !== 'hidden';
      syncPlayback();
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        inViewport = entry?.isIntersecting ?? false;
        if (inViewport) void start();
        syncPlayback();
      }, { threshold: 0.05 });
      observer.observe(container);
    } else {
      void start();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      syncPlaybackRef.current = null;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  const classes = ['wl-frame', className].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={classes}
      data-cosmetic="wraithlight"
      data-ready={ready ? 'true' : undefined}
      data-error={failed ? 'true' : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      aria-busy={!ready && !failed ? 'true' : undefined}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="wl-avatar" src={avatarUrl} alt="" />
      ) : avatarInitial ? (
        <span className="wl-avatar wl-avatar-initial" aria-hidden="true">
          {avatarInitial}
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wl-fallback" src={ARTWORK_PATH} alt="" aria-hidden="true" />
      <canvas ref={canvasRef} className="wl-canvas" aria-hidden="true" />
    </div>
  );
}
