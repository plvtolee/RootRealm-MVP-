/**
 * XP and level progression rules.
 *
 * Single source of truth for level math. Every UI and backend path must
 * derive level/progress from these helpers rather than re-implementing the
 * formula.
 */

/** Total XP required to gain a single level. */
export const XP_PER_LEVEL = 100;

export interface Progression {
  /** 1-based level. Level 1 starts at 0 XP. */
  level: number;
  /** Total lifetime XP. */
  totalXp: number;
  /** XP accumulated toward the next level (0..XP_PER_LEVEL-1). */
  xpIntoLevel: number;
  /** XP needed to reach the next level. */
  xpForNextLevel: number;
  /** 0..1 fraction toward the next level. */
  progressRatio: number;
}

/**
 * Calculate level and progress from total XP.
 *
 * Rules:
 * - Level 1 starts at 0 XP.
 * - Every 100 total XP advances one level.
 *
 * Boundary examples:
 * - 0   -> level 1, 0/100
 * - 99  -> level 1, 99/100
 * - 100 -> level 2, 0/100
 * - 199 -> level 2, 99/100
 * - 200 -> level 3, 0/100
 */
export function getProgression(totalXp: number): Progression {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safeXp % XP_PER_LEVEL;

  return {
    level,
    totalXp: safeXp,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    progressRatio: xpIntoLevel / XP_PER_LEVEL,
  };
}