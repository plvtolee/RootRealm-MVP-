// @vitest-environment jsdom

import React, { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { WraithlightFrame } from '@/components/phase4/WraithlightFrame';

class MockWraithlightEngine {
  static instances: MockWraithlightEngine[] = [];
  speed = 1;
  load = vi.fn(async () => this);
  playIdle = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  renderAt = vi.fn();
  destroy = vi.fn();

  constructor() {
    MockWraithlightEngine.instances.push(this);
  }

  setSpeed = vi.fn((speed: number) => {
    this.speed = speed;
  });
}

describe('WraithlightFrame lifecycle', () => {
  afterEach(() => {
    cleanup();
    delete (window as Window & { WRAITHLIGHT_CONFIG?: unknown }).WRAITHLIGHT_CONFIG;
    delete (window as Window & { WraithlightFrame?: unknown }).WraithlightFrame;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    MockWraithlightEngine.instances = [];
  });

  function setupRuntime(reducedMotion = false) {
    vi.stubGlobal('React', React);
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    Object.assign(window, {
      WRAITHLIGHT_CONFIG: { artwork: '/frame.png', leafSprite: '/leaf.svg', size: 1024, loopSeconds: 16 },
      WraithlightFrame: MockWraithlightEngine,
    });
  }

  it('starts the idle loop at 4x, pauses off-state, resumes, and destroys on unmount', async () => {
    setupRuntime();
    const view = render(createElement(WraithlightFrame, {
      label: 'Wraithlight',
      avatarUrl: 'https://example.test/avatar.png',
    }));
    expect(view.container.querySelector('.wl-avatar')?.getAttribute('src')).toBe(
      'https://example.test/avatar.png'
    );
    await waitFor(() => expect(MockWraithlightEngine.instances).toHaveLength(1));

    const engine = MockWraithlightEngine.instances[0];
    await waitFor(() => expect(engine.playIdle).toHaveBeenCalledOnce());
    expect(engine.setSpeed).toHaveBeenCalledWith(4);
    expect(engine.renderAt).toHaveBeenCalledWith(0);

    view.rerender(createElement(WraithlightFrame, { label: 'Wraithlight', paused: true }));
    await waitFor(() => expect(engine.pause).toHaveBeenCalled());
    view.rerender(createElement(WraithlightFrame, { label: 'Wraithlight' }));
    await waitFor(() => expect(engine.resume).toHaveBeenCalled());

    view.unmount();
    expect(engine.destroy).toHaveBeenCalledOnce();
    expect(engine.playIdle).toHaveBeenCalledOnce();

    const switchedBack = render(createElement(WraithlightFrame, { label: 'Wraithlight' }));
    await waitFor(() => expect(MockWraithlightEngine.instances).toHaveLength(2));
    await waitFor(() => expect(MockWraithlightEngine.instances[1].playIdle).toHaveBeenCalledOnce());
    switchedBack.unmount();
  });

  it('renders a still frame without starting playback for reduced motion', async () => {
    setupRuntime(true);
    const view = render(createElement(WraithlightFrame, { label: 'Wraithlight' }));
    await waitFor(() => expect(MockWraithlightEngine.instances).toHaveLength(1));

    const engine = MockWraithlightEngine.instances[0];
    await waitFor(() => expect(engine.renderAt).toHaveBeenCalledWith(0));
    expect(engine.playIdle).not.toHaveBeenCalled();
    view.unmount();
    expect(engine.destroy).toHaveBeenCalledOnce();
  });
});
