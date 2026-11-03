/*
 * Wraithlight Frame — Legendary-tier animation engine
 * ---------------------------------------------------
 * Reusable, dependency-free Canvas 2D renderer.
 *
 *   const frame = new WraithlightFrame(canvas, window.WRAITHLIGHT_CONFIG);
 *   await frame.load();
 *   frame.playReveal();          // reveal → flows straight into the idle loop
 *   frame.playIdle();            // idle loop only
 *   frame.pause() / frame.resume() / frame.setSpeed(1)
 *   frame.renderAt(seconds, {reveal:false})   // deterministic single frame
 *
 * The original artwork is drawn untouched every frame. Effects are layered on
 * top (or carefully re-drawn from the original pixels, e.g. swaying lanterns),
 * and the transparent background is preserved (canvas is cleared to alpha 0).
 *
 * Seamless loop: every idle effect is a periodic function of
 * config.loopSeconds (integer cycle counts only), so frame(t) === frame(t+L).
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);

  // Deterministic PRNG (mulberry32) so particles are identical every loop.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Failed to load ' + src));
      img.src = src;
    });
  }

  class WraithlightFrame {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.cfg = config;
      this.S = config.size;
      canvas.width = this.S;
      canvas.height = this.S;
      this.ctx = canvas.getContext('2d');
      this.speed = 1;
      this.running = false;
      this.mode = 'idle';
      this.clock = 0;          // seconds since playback start (scaled by speed)
      this._last = 0;
      this._raf = 0;
      this.onFrame = null;     // optional callback(t, phase)
      this._tick = this._tick.bind(this);
    }

    /* ---------------------------------------------------------- setup -- */
    async load() {
      const cfg = this.cfg;
      const [art, leaf] = await Promise.all([loadImage(cfg.artwork), loadImage(cfg.leafSprite)]);
      this.art = art;
      this.leaf = leaf;

      // Base layer = original artwork with lantern regions lifted out
      // (they are re-drawn from the original pixels with a pendulum sway).
      this.base = makeCanvas(this.S, this.S);
      const b = this.base.getContext('2d');
      b.drawImage(art, 0, 0, this.S, this.S);
      cfg.lanterns.forEach((l) => b.clearRect(l.rect[0], l.rect[1], l.rect[2], l.rect[3]));

      this._buildMasks();
      this._buildParticles();
      this._buildGlowSprite();
      return this;
    }

    // Colour masks for water + ghost ribbons. Requires same-origin pixels
    // (http/https). Under file:// the canvas is tainted, so we fall back to
    // geometry-only clipping and skip ribbon shimmer gracefully.
    _buildMasks() {
      const cfg = this.cfg, S = this.S;
      this.waterMask = null;
      this.ribbonMask = null;
      try {
        const c = makeCanvas(S, S), x = c.getContext('2d');
        x.drawImage(this.art, 0, 0, S, S);
        const src = x.getImageData(0, 0, S, S).data;

        const wm = new ImageData(S, S), rm = new ImageData(S, S);
        const [wx, wy, ww, wh] = cfg.water.rect;
        const wcx = wx + ww / 2, wcy = wy + wh / 2;
        const inLantern = (px, py) => cfg.lanterns.some((l) =>
          px >= l.rect[0] - 4 && px <= l.rect[0] + l.rect[2] + 4 &&
          py >= l.rect[1] - 4 && py <= l.rect[1] + l.rect[3] + 4);

        for (let py = 0; py < S; py++) {
          for (let px = 0; px < S; px++) {
            const i = (py * S + px) * 4;
            const r = src[i], g = src[i + 1], bl = src[i + 2], a = src[i + 3];
            if (a < 40) continue;
            // water: inside the water ellipse, distinctly blue (not branch/gold)
            const ex = (px - wcx) / (ww / 2), ey = (py - wcy) / (wh / 2);
            if (ex * ex + ey * ey <= 1 && bl - r > 28 && bl >= g) {
              wm.data[i + 3] = 255;
            }
            // ghost ribbon: bright, saturated blue
            if (bl > 185 && bl - r > 45 && !inLantern(px, py)) {
              rm.data[i + 3] = Math.min(255, (bl - r - 45) * 4);
            }
          }
        }
        this.waterMask = this._softMask(wm, 1.2);
        this.ribbonMask = this._softMask(rm, 1.5);
      } catch (e) {
        console.info('[Wraithlight] Pixel masks unavailable (serve over http for full fidelity).');
      }
    }

    _softMask(imageData, blur) {
      const raw = makeCanvas(this.S, this.S);
      raw.getContext('2d').putImageData(imageData, 0, 0);
      const out = makeCanvas(this.S, this.S), o = out.getContext('2d');
      o.filter = 'blur(' + blur + 'px)';
      o.drawImage(raw, 0, 0);
      o.filter = 'none';
      o.drawImage(raw, 0, 0); // keep the core solid
      return out;
    }

    _buildParticles() {
      const { count, seed } = this.cfg.particles;
      const rand = rng(seed);
      const { cx, cy, r } = this.cfg.ring;
      this.particles = [];
      for (let i = 0; i < count; i++) {
        const th = rand() * TAU;
        const rr = r + (rand() - 0.5) * 70;
        this.particles.push({
          x: cx + Math.cos(th) * rr,
          y: cy + Math.sin(th) * rr,
          cycles: 1 + Math.floor(rand() * 3),   // 1–3 appearances per loop
          offset: rand(),
          rise: 18 + rand() * 26,
          drift: (rand() - 0.5) * 16,
          size: 1.1 + rand() * 1.3
        });
      }
    }

    _buildGlowSprite() {
      const c = makeCanvas(128, 128), x = c.getContext('2d');
      const [r, g, b] = this.cfg.flameGlow.color;
      const grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grd.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = grd;
      x.fillRect(0, 0, 128, 128);
      this.glow = c;
    }

    /* ------------------------------------------------------- playback -- */
    playReveal() { this.mode = 'reveal'; this.clock = 0; this._start(); }
    playIdle() { this.mode = 'idle'; this.clock = 0; this._start(); }
    pause() { this.running = false; cancelAnimationFrame(this._raf); }
    resume() { if (!this.running) this._start(); }
    setSpeed(s) { this.speed = s; }
    destroy() {
      this.pause();
      this.canvas.width = 0;
      this.canvas.height = 0;
    }

    _start() {
      cancelAnimationFrame(this._raf);
      this.running = true;
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }

    _tick(now) {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this.clock += dt * this.speed;
      const R = this.cfg.revealSeconds;
      const inReveal = this.mode === 'reveal' && this.clock < R;
      // The idle clock starts at 0 together with the reveal, so the reveal
      // hands over to the loop without any discontinuity.
      this.renderAt(this.clock, { reveal: inReveal, revealT: this.clock });
      if (this.onFrame) this.onFrame(this.clock, inReveal ? 'reveal' : 'idle');
      this._raf = requestAnimationFrame(this._tick);
    }

    /* ------------------------------------------------------ rendering -- */
    // Periodic smooth noise: integer cycle counts keep it loop-safe.
    _wave(p, terms) {
      let v = 0;
      for (const [k, a, ph] of terms) v += a * Math.sin(TAU * k * p + ph);
      return v;
    }

    renderAt(t, opts = {}) {
      const cfg = this.cfg, ctx = this.ctx, S = this.S;
      const L = cfg.loopSeconds;
      const p = ((t % L) + L) % L / L;   // loop phase 0..1

      // Reveal envelopes (all 1 when idle)
      const rv = opts.reveal ? opts.revealT / cfg.revealSeconds : 1;
      const env = {
        art: smooth(0, 0.8, rv),
        moon: smooth(0.2, 0.7, rv),
        water: smooth(0.45, 0.85, rv),
        ribbon: smooth(0.35, 0.8, rv),
        fx: smooth(0.65, 1, rv),
        lanternBody: smooth(0.3, 0.6, rv),
        lantern: (i) => smooth(0.42 + i * 0.1, 0.62 + i * 0.1, rv)
      };

      ctx.clearRect(0, 0, S, S);

      this._drawMoonHalo(ctx, p, env.moon);
      this._drawBase(ctx, env.art, opts.reveal ? rv : 1);
      this._drawMoonPulse(ctx, p, env.moon);
      this._drawWater(ctx, p, env.water);
      this._drawRibbonFlow(ctx, p, env.ribbon);
      this._drawLanterns(ctx, p, env);
      this._drawWisps(ctx, p, env.fx);
      this._drawLeaves(ctx, p, env.fx);
      this._drawParticles(ctx, p, env.fx);
    }

    _drawBase(ctx, a, rv) {
      if (a >= 1) { ctx.drawImage(this.base, 0, 0); return; }
      // Soft radial unveil from the ring centre + slight settle in scale.
      const S = this.S, { cx, cy } = this.cfg.ring;
      if (!this._revealBuf) this._revealBuf = makeCanvas(S, S);
      const buf = this._revealBuf, b = buf.getContext('2d');
      b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, S, S);
      b.drawImage(this.base, 0, 0);
      // Unveil starts just inside the wreath (the ring centre is empty space).
      const rad = 300 + a * 640;
      const g = b.createRadialGradient(cx, cy, Math.max(0, rad - 260), cx, cy, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      b.globalCompositeOperation = 'destination-in';
      b.fillStyle = g;
      b.fillRect(0, 0, S, S);
      b.globalCompositeOperation = 'source-over';

      const sc = 0.965 + 0.035 * a;
      ctx.save();
      ctx.globalAlpha = clamp(0.25 + a);
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      ctx.drawImage(buf, 0, 0);
      ctx.restore();
    }

    _drawMoonHalo(ctx, p, e) {
      if (e <= 0) return;
      const m = this.cfg.moon;
      const pulse = 0.5 + 0.5 * Math.sin(TAU * m.pulseCycles * p - Math.PI / 2);
      const a = (m.haloAlpha + m.pulseAlpha * pulse) * e;
      const g = ctx.createRadialGradient(m.cx, m.cy, m.r * 0.9, m.cx, m.cy, m.r * 1.55);
      g.addColorStop(0, `rgba(200,215,255,${a})`);
      g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.cx, m.cy, m.r * 1.6, 0, TAU); ctx.fill();
    }

    _drawMoonPulse(ctx, p, e) {
      if (e <= 0) return;
      const m = this.cfg.moon;
      const pulse = 0.5 + 0.5 * Math.sin(TAU * m.pulseCycles * p - Math.PI / 2);
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';   // only on existing pixels
      ctx.globalAlpha = (0.025 + 0.06 * pulse) * e;
      const g = ctx.createRadialGradient(m.cx - 25, m.cy - 25, 0, m.cx, m.cy, m.r);
      g.addColorStop(0, '#f4f8ff');
      g.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.cx, m.cy, m.r, 0, TAU); ctx.fill();
      ctx.restore();
    }

    _drawWater(ctx, p, e) {
      if (e <= 0) return;
      const w = this.cfg.water, [x, y, W, H] = w.rect;
      if (!this._waterBuf) this._waterBuf = makeCanvas(W, H);
      const buf = this._waterBuf, b = buf.getContext('2d');
      b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, W, H);

      if (this.waterMask) {
        // 1) Gentle horizontal ripple displacement of the original water pixels
        for (let row = 0; row < H; row += 2) {
          const depth = row / H;                  // stronger toward viewer
          const dx = Math.sin(TAU * (row / 22 - 3 * p)) * (0.6 + 1.6 * depth)
                   + Math.sin(TAU * (row / 9 + 2 * p)) * 0.4;
          b.drawImage(this.art, x, y + row, W, 2, dx, row, W, 2);
        }
        // 2) Drifting moonlit reflection glints
        b.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const ph = (p * 2 + i / 6) % 1;         // 2 passes per loop
          const gx = W * (0.32 + 0.36 * ((i * 0.37) % 1)) + Math.sin(TAU * (p * 3 + i * 0.2)) * 18;
          const gy = H * (0.18 + 0.7 * ph);
          const ga = Math.sin(Math.PI * ph) * 0.22;
          const grd = b.createRadialGradient(gx, gy, 0, gx, gy, 46);
          grd.addColorStop(0, `rgba(190,215,255,${ga})`);
          grd.addColorStop(1, 'rgba(190,215,255,0)');
          b.fillStyle = grd;
          b.save(); b.translate(gx, gy); b.scale(1, 0.18); b.translate(-gx, -gy);
          b.beginPath(); b.arc(gx, gy, 46, 0, TAU); b.fill(); b.restore();
        }
        // 3) Restrict to water pixels only (branches stay perfectly still)
        b.globalCompositeOperation = 'destination-in';
        b.drawImage(this.waterMask, x, y, W, H, 0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = e;
        ctx.drawImage(buf, x, y);
        ctx.restore();
      } else {
        // Fallback: soft travelling shimmer inside the water ellipse
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + W / 2, y + H / 2, W / 2 - 30, H / 2 - 20, 0, 0, TAU);
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const ph = (p * 2 + i / 4) % 1;
          ctx.fillStyle = `rgba(170,200,255,${0.07 * Math.sin(Math.PI * ph) * e})`;
          ctx.fillRect(x, y + H * ph, W, 2);
        }
        ctx.restore();
      }
    }

    // Two soft light blobs glide along the existing ghost ribbons (masked),
    // making the painted ghostlight appear to flow. One revolution per loop.
    _drawRibbonFlow(ctx, p, e) {
      if (e <= 0 || !this.ribbonMask) return;
      const S = this.S, { cx, cy, r } = this.cfg.ring, rs = this.cfg.ribbonShimmer;
      if (!this._ribBuf) this._ribBuf = makeCanvas(S, S);
      const b = this._ribBuf.getContext('2d');
      b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, S, S);
      for (let k = 0; k < 2; k++) {
        const th = TAU * (p + k / 2) - Math.PI / 2;
        const bx = cx + Math.cos(th) * r, by = cy + Math.sin(th) * r;
        const g = b.createRadialGradient(bx, by, 0, bx, by, rs.blobRadius);
        g.addColorStop(0, 'rgba(210,230,255,1)');
        g.addColorStop(1, 'rgba(210,230,255,0)');
        b.fillStyle = g;
        b.fillRect(bx - rs.blobRadius, by - rs.blobRadius, rs.blobRadius * 2, rs.blobRadius * 2);
      }
      b.globalCompositeOperation = 'destination-in';
      b.drawImage(this.ribbonMask, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = rs.alpha * e;
      ctx.drawImage(this._ribBuf, 0, 0);
      ctx.restore();
    }

    _drawLanterns(ctx, p, env) {
      const cfg = this.cfg, fg = cfg.flameGlow;
      cfg.lanterns.forEach((l, i) => {
        const [px, py] = l.pivot, [rx, ry, rw, rh] = l.rect;
        const ang = (l.amp * Math.PI / 180) *
          (Math.sin(TAU * cfg.lanternSwayCycles * p + l.phase) * 0.85 +
           Math.sin(TAU * (cfg.lanternSwayCycles * 2) * p + l.phase * 1.7) * 0.15);
        const ignite = env.lantern(i);

        ctx.save();
        ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py);
        // Original lantern pixels, swung about the chain anchor
        ctx.globalAlpha = env.art * env.lanternBody;
        ctx.drawImage(this.art, rx, ry, rw, rh, rx, ry, rw, rh);

        // Flickering flame: low-frequency, loop-safe noise
        const flick = 0.78 + this._wave(p, [
          [13, 0.07, i * 1.3], [29, 0.06, i * 2.1], [47, 0.04, i * 0.7], [83, 0.025, i * 3.3]
        ]);
        const [gx, gy] = l.glass;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fg.alpha * flick * ignite;
        const R = fg.radius;
        ctx.drawImage(this.glow, gx - R, gy - R, R * 2, R * 2);
        ctx.globalAlpha = 0.5 * flick * ignite;
        ctx.drawImage(this.glow, gx - 12, gy - 16 + this._wave(p, [[37, 1.2, i]]), 24, 30);
        ctx.restore();
      });
    }

    _drawWisps(ctx, p, e) {
      if (e <= 0) return;
      const { cx, cy, r } = this.cfg.ring, arc = this.cfg.wispArc, trail = this.cfg.wispTrail;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.cfg.wisps.forEach((w, i) => {
        const life = (p + i / this.cfg.wisps.length) % 1;   // one life per loop
        const fade = Math.sin(Math.PI * life);
        const head = w.theta0 + w.dir * arc * life;
        const steps = 14;
        for (let s = 0; s < steps; s++) {
          const f = s / (steps - 1);
          const th = head - w.dir * trail * f;
          const rr = r + w.rOff + Math.sin(th * 3 + TAU * p) * 14;
          const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
          const a = fade * (1 - f) * 0.28 * e;
          const size = 10 * (1 - f * 0.6);
          ctx.globalAlpha = a;
          ctx.drawImage(this.glow, x - size, y - size, size * 2, size * 2);
        }
      });
      ctx.restore();
    }

    _drawLeaves(ctx, p, e) {
      if (e <= 0) return;
      const lifeSpan = 0.3;   // fraction of the loop each leaf is visible
      this.cfg.leaves.forEach((lf, i) => {
        const local = ((p - lf.offset) % 1 + 1) % 1;
        if (local > lifeSpan) return;
        const q = local / lifeSpan;
        const a = smooth(0, 0.18, q) * (1 - smooth(0.72, 1, q));
        const x = lf.start[0] + lf.dx * q + Math.sin(TAU * q * 1.5 + i) * 16;
        const y = lf.start[1] + lf.fall * easeOut(q * 0.9 + 0.1 * q);
        const rot = lf.rot + Math.sin(TAU * q * 1.2 + i) * 0.7 + q * 1.1;
        const flip = 0.55 + 0.45 * Math.cos(TAU * q * 1.3 + i);  // gentle 3D tumble
        ctx.save();
        ctx.globalAlpha = a * 0.9 * e;
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, flip);
        ctx.drawImage(this.leaf, -21, -12, 42, 25);
        ctx.restore();
      });
    }

    _drawParticles(ctx, p, e) {
      if (e <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const pt of this.particles) {
        const q = ((p * pt.cycles + pt.offset) % 1);
        const vis = 0.35;                      // visible for 35% of each cycle
        if (q > vis) continue;
        const k = q / vis;
        const a = Math.sin(Math.PI * k) * 0.75 * e;
        const x = pt.x + pt.drift * k, y = pt.y - pt.rise * k;
        const s = pt.size * 5;
        ctx.globalAlpha = a * 0.5;
        ctx.drawImage(this.glow, x - s, y - s, s * 2, s * 2);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#e8f1ff';
        ctx.beginPath(); ctx.arc(x, y, pt.size * 0.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  global.WraithlightFrame = WraithlightFrame;
})(window);
