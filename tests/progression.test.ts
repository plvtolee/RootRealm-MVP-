import { describe, it, expect } from 'vitest';
import { getProgression, XP_PER_LEVEL } from '@/lib/progression';

describe('getProgression', () => {
  it('starts at level 1 with 0 XP', () => {
    const p = getProgression(0);
    expect(p.level).toBe(1);
    expect(p.totalXp).toBe(0);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.xpForNextLevel).toBe(100);
    expect(p.progressRatio).toBe(0);
  });

  it('handles 99 XP (still level 1, almost level 2)', () => {
    const p = getProgression(99);
    expect(p.level).toBe(1);
    expect(p.xpIntoLevel).toBe(99);
    expect(p.progressRatio).toBeCloseTo(0.99);
  });

  it('advances to level 2 at exactly 100 XP', () => {
    const p = getProgression(100);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.progressRatio).toBe(0);
  });

  it('handles 150 XP -> level 2 with 50/100', () => {
    const p = getProgression(150);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(50);
    expect(p.progressRatio).toBeCloseTo(0.5);
  });

  it('handles 199 XP -> level 2 with 99/100', () => {
    const p = getProgression(199);
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(99);
  });

  it('advances to level 3 at exactly 200 XP', () => {
    const p = getProgression(200);
    expect(p.level).toBe(3);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.progressRatio).toBe(0);
  });

  it('scales to higher levels', () => {
    const p = getProgression(1234);
    expect(p.level).toBe(13);
    expect(p.xpIntoLevel).toBe(34);
  });

  it('clamps negative and invalid input to 0', () => {
    expect(getProgression(-50).level).toBe(1);
    expect(getProgression(-50).totalXp).toBe(0);
    expect(getProgression(NaN).totalXp).toBe(0);
    expect(getProgression(Infinity).totalXp).toBe(0);
  });

  it('floors fractional XP', () => {
    const p = getProgression(150.9);
    expect(p.totalXp).toBe(150);
    expect(p.xpIntoLevel).toBe(50);
  });

  it('keeps progressRatio within [0,1) for all non-negative inputs', () => {
    for (let xp = 0; xp <= 1000; xp += 7) {
      const p = getProgression(xp);
      expect(p.progressRatio).toBeGreaterThanOrEqual(0);
      expect(p.progressRatio).toBeLessThan(1);
    }
  });

  it('exposes a consistent XP_PER_LEVEL constant', () => {
    expect(XP_PER_LEVEL).toBe(100);
  });
});