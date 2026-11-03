/*
 * Wraithlight Frame — animation configuration (Legendary tier)
 * ------------------------------------------------------------
 * All coordinates are in the artwork's native 1024×1024 space.
 * Every idle motion is a periodic function of the loop length (loopSeconds),
 * so the idle loop is mathematically seamless.
 *
 * Tweak values here; the engine (wraithlight.js) reads this object.
 */
window.WRAITHLIGHT_CONFIG = {
  artwork: '/cosmetics/wraithlight/wraithlight-frame.png',
  leafSprite: '/cosmetics/wraithlight/leaf.svg',
  size: 1024,
  loopSeconds: 16,          // seamless idle loop length
  revealSeconds: 2.6,       // one-shot reveal

  ring: { cx: 515, cy: 520, r: 400 },   // centre line of the branch wreath

  moon: { cx: 270, cy: 180, r: 140, haloAlpha: 0.16, pulseAlpha: 0.10, pulseCycles: 2 },

  // pivot = where the chain meets the branch; rect = region cut out & swung
  lanterns: [
    { pivot: [183, 330], rect: [145, 345, 78, 190], glass: [184, 450], phase: 0.0,  amp: 2.0 },
    { pivot: [738, 205], rect: [697, 220, 85, 195], glass: [739, 330], phase: 1.9,  amp: 1.6 },
    { pivot: [906, 660], rect: [865, 675, 82, 210], glass: [906, 795], phase: 3.7,  amp: 2.2 }
  ],
  lanternSwayCycles: 3,     // sway periods per loop (16s / 3 ≈ 5.3s per swing)
  flameGlow: { radius: 46, alpha: 0.42, color: [150, 200, 255] },

  water: { rect: [290, 765, 430, 120], alpha: 0.38 },

  ribbonShimmer: { alpha: 0.45, blobRadius: 170 },

  wisps: [
    { theta0: -2.55, dir:  1, rOff: -12 },
    { theta0: -0.55, dir: -1, rOff:  22 },
    { theta0:  1.35, dir:  1, rOff:   6 }
  ],
  wispArc: 1.4,             // radians travelled per wisp lifetime
  wispTrail: 0.42,          // trail length in radians

  leaves: [
    { start: [425, 62],  dx:  40, fall: 150, offset: 0.00, rot: -0.4 },
    { start: [905, 190], dx: -30, fall: 170, offset: 0.27, rot:  2.6 },
    { start: [112, 272], dx:  26, fall: 160, offset: 0.52, rot:  0.3 },
    { start: [800, 470], dx: -34, fall: 150, offset: 0.76, rot:  2.9 }
  ],

  particles: { count: 9, seed: 7 }
};
