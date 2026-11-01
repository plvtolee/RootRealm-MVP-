/*!
 * The Root Cipher — RootRealm Creator Exclusive animated frame
 * Standalone, dependency-free Canvas 2D animation engine.
 *
 * The original artwork (images/root-cipher-frame.png) is never redrawn or
 * distorted. It is used as-is as the base layer; individual elements (cubes,
 * crown, </> emblem, halo, frame bars) are isolated at runtime with clip paths
 * and alpha masks and animated independently. All extra light is additive, so
 * the output stays fully transparent-compatible (premultiplied alpha).
 *
 * Usage:
 *   const fx = RootCipher.create(document.querySelector('#slot'), { state: 'idle' });
 *   fx.showcase();            // play the dramatic reveal, then return to idle
 *   fx.setState('idle');
 *   // or: <root-cipher-frame state="idle" style="width:256px"></root-cipher-frame>
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var S = 1024;          // artwork coordinate space (source PNG is 1024x1024)
  var LOOP = 12;         // idle loop length in seconds (all idle motion is periodic in LOOP => seamless loops)

  /* ------------------------------------------------------------------ */
  /* Layout: element positions measured on the 1024x1024 source artwork  */
  /* ------------------------------------------------------------------ */
  var LAYOUT = {
    center: [512, 490],
    innerOpening: [150, 160, 850, 806],             // transparent window (x0,y0,x1,y1)
    frameBars: [134, 152, 878, 826],                // centre-line of the main bars (x0,y0,x1,y1)
    cubes: [                                        // floating cubes (ellipse clip used to lift them off the base)
      { x: 64,  y: 313, rx: 15, ry: 18, phase: 0.0, dir: 1 },
      { x: 962, y: 176, rx: 16, ry: 18, phase: 1.7, dir: -1 },
      { x: 964, y: 642, rx: 24, ry: 27, phase: 3.1, dir: 1 },
      { x: 213, y: 776, rx: 30, ry: 30, phase: 4.4, dir: -1 }
    ],
    ribbons: [                                      // glowing orbit rings (ellipse, tilt in degrees)
      { cx: 884, cy: 262, rx: 112, ry: 30, tilt: -24, dir: 1,  speed: 1, offset: 0.10 },
      { cx: 104, cy: 352, rx: 92,  ry: 26, tilt: 32,  dir: -1, speed: 1, offset: 0.55 },
      { cx: 100, cy: 768, rx: 80,  ry: 22, tilt: -12, dir: 1,  speed: 1, offset: 0.30 },
      { cx: 882, cy: 732, rx: 114, ry: 32, tilt: -20, dir: -1, speed: 1, offset: 0.80 }
    ],
    halo: { cx: 504, cy: 136, r: 128, a0: 198, a1: 342 }, // thin rings above the crown (degrees)
    crown: { x: 504, y: 128, r: 64 },
    pendant: { x: 509, y: 214 },
    topStar: { x: 512, y: 18 },
    emblem: { x: 509, y: 912, w: 72, h: 48 },       // </> glyph
    shield: [452, 800, 568, 992],
    sparkles: [[122, 527], [901, 527]]
  };

  var GOLD_CORE = '255,246,214';
  var GOLD = '255,200,96';
  var GOLD_DEEP = '240,150,40';

  /* ----------------------------- helpers ----------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function frac(x) { return x - Math.floor(x); }
  function wave(t, k, ph) { return Math.sin(TAU * (t * k / LOOP) + (ph || 0)); } // periodic in LOOP for integer k
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }
  function deepMerge(base, over) {
    if (!over) return JSON.parse(JSON.stringify(base));
    var out = JSON.parse(JSON.stringify(base));
    Object.keys(over).forEach(function (k) { out[k] = over[k]; });
    return out;
  }
  function loadImage(src, crossOrigin) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      if (crossOrigin) im.crossOrigin = crossOrigin;
      im.decoding = 'async';
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('RootCipher: failed to load artwork ' + src)); };
      im.src = src;
    });
  }

  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  function defaultSrc() {
    try { return new URL('../images/root-cipher-frame.png', scriptSrc || location.href).href; }
    catch (e) { return 'images/root-cipher-frame.png'; }
  }

  /* --------------------------- sprite makers -------------------------- */
  function makeGlowSprite() {
    var c = makeCanvas(128, 128), x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,252,236,1)');
    g.addColorStop(0.18, 'rgba(255,226,150,0.85)');
    g.addColorStop(0.45, 'rgba(255,176,60,0.28)');
    g.addColorStop(1, 'rgba(255,140,20,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return c;
  }
  function makeStarSprite() {
    var c = makeCanvas(128, 128), x = c.getContext('2d');
    x.translate(64, 64);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.25, 'rgba(255,228,150,0.95)');
    g.addColorStop(1, 'rgba(255,170,40,0)');
    x.fillStyle = g;
    x.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = i * TAU / 4;
      var ox = Math.cos(a) * 62, oy = Math.sin(a) * 62;
      var b = a + TAU / 8;
      var ix = Math.cos(b) * 7, iy = Math.sin(b) * 7;
      if (i === 0) x.moveTo(ox, oy); else x.lineTo(ox, oy);
      x.quadraticCurveTo(ix * 0.6, iy * 0.6, Math.cos(a + TAU / 4) * 62, Math.sin(a + TAU / 4) * 62);
    }
    x.closePath(); x.fill();
    var g2 = x.createRadialGradient(0, 0, 0, 0, 0, 22);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(1, 'rgba(255,220,140,0)');
    x.fillStyle = g2; x.beginPath(); x.arc(0, 0, 22, 0, TAU); x.fill();
    return c;
  }

  /* ============================== Engine ============================== */
  function RootCipher(target, opts) {
    if (!(this instanceof RootCipher)) return new RootCipher(target, opts);
    opts = opts || {};
    this.opts = {
      src: opts.src || defaultSrc(),
      crossOrigin: opts.crossOrigin || null,
      bleed: opts.bleed != null ? opts.bleed : 0.15,      // extra canvas margin (fraction of frame size) for aura/particles
      quality: opts.quality || 'auto',                  // 'auto' | 'high' | 'medium' | 'low'
      state: opts.state || 'idle',
      autoplay: opts.autoplay !== false,
      speed: opts.speed || 1,                           // global time scale
      intensity: opts.intensity != null ? opts.intensity : 1, // idle effect intensity multiplier
      showcaseDuration: opts.showcaseDuration || 5,     // seconds
      returnToIdle: opts.returnToIdle !== false,        // after showcase completes
      pixelRatio: opts.pixelRatio || 1,                 // supersampling multiplier
      maxPixelRatio: opts.maxPixelRatio || 2,
      maxCanvasSize: opts.maxCanvasSize || 2400,
      reducedMotion: opts.reducedMotion || 'auto',      // 'auto' | true | false
      pauseWhenHidden: opts.pauseWhenHidden !== false,
      debug: !!opts.debug,
      onReady: opts.onReady, onShowcaseEnd: opts.onShowcaseEnd
    };
    this.layout = deepMerge(LAYOUT, opts.layout);
    this.state = this.opts.state === 'showcase' ? 'idle' : this.opts.state;
    this.time = 0;             // idle clock (s)
    this.showcaseTime = null;  // local showcase clock (s) or null
    this.playing = false;
    this._visible = true;
    this._raf = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);

    // Canvas setup -----------------------------------------------------
    if (target && target.tagName === 'CANVAS') {
      this.canvas = target; this.container = null;
    } else {
      this.container = target;
      this.canvas = document.createElement('canvas');
      var b = this.opts.bleed;
      var st = this.canvas.style;
      st.position = 'absolute';
      st.left = st.top = (-b * 100) + '%';
      st.width = st.height = ((1 + 2 * b) * 100) + '%';
      st.pointerEvents = 'none';
      st.display = 'block';
      if (target) {
        var cs = getComputedStyle(target);
        if (cs.position === 'static') target.style.position = 'relative';
        target.appendChild(this.canvas);
      }
    }
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'The Root Cipher — animated creator frame');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.fx = makeCanvas(2, 2);
    this.fxc = this.fx.getContext('2d');
    this.glow = makeGlowSprite();
    this.star = makeStarSprite();

    this._buildShowcaseTable();
    var self = this;
    this.ready = loadImage(this.opts.src, this.opts.crossOrigin).then(function (img) {
      self.img = img;
      self._prepareAssets();
      self.resize();
      self._setupObservers();
      self.renderAt(0, null);
      if (self.opts.autoplay) self.play();
      if (opts.state === 'showcase') self.showcase();
      self._emit('ready');
      if (self.opts.onReady) self.opts.onReady(self);
      return self;
    });
  }

  var P = RootCipher.prototype;

  /* ----------------------- one-time asset prep ------------------------ */
  P._prepareAssets = function () {
    var L = this.layout, img = this.img;
    var q = this._qualitySettings();
    this.q = q;

    // 1. Base layer: original artwork with the floating cubes lifted out (holes are transparent bg only).
    var base = makeCanvas(S, S), bx = base.getContext('2d');
    bx.drawImage(img, 0, 0, S, S);
    bx.globalCompositeOperation = 'destination-out';
    L.cubes.forEach(function (c) {
      bx.beginPath(); bx.ellipse(c.x, c.y, c.rx + 1, c.ry + 1, 0, 0, TAU); bx.fill();
    });
    this.base = base;

    // 2. Cube sprites cut from the original artwork (pixel-identical).
    this.cubeSprites = L.cubes.map(function (c) {
      var w = c.rx * 2 + 4, h = c.ry * 2 + 4;
      var cv = makeCanvas(w * 2, h * 2), x = cv.getContext('2d');
      x.scale(2, 2);
      x.beginPath(); x.ellipse(w / 2, h / 2, c.rx + 1, c.ry + 1, 0, 0, TAU); x.clip();
      x.drawImage(img, -(c.x - w / 2), -(c.y - h / 2), S, S);
      return { canvas: cv, w: w, h: h };
    });

    // 3. Outer aura: gold, shape-following glow generated from the frame silhouette (shadowBlur => universal support).
    var A = 120, aq = q.auraScale, sz = S + A * 2;
    var aura = makeCanvas(sz * aq, sz * aq), ax = aura.getContext('2d');
    var OFF = sz * aq + 50;
    ax.setTransform(aq, 0, 0, aq, 0, 0);
    [[64, 'rgba(255,170,50,0.9)'], [26, 'rgba(255,214,120,0.85)']].forEach(function (p) {
      ax.shadowColor = p[1];
      ax.shadowBlur = p[0] * aq;
      ax.shadowOffsetX = OFF;
      ax.drawImage(base, A - OFF / aq, A, S, S);
    });
    ax.shadowColor = 'transparent'; ax.shadowBlur = 0; ax.shadowOffsetX = 0;
    // keep the avatar window clean: feather-cut the inner opening out of the aura
    var io = L.innerOpening;
    ax.globalCompositeOperation = 'destination-out';
    ax.shadowColor = 'rgba(0,0,0,1)'; ax.shadowBlur = 40 * aq; ax.fillStyle = '#000';
    ax.fillRect(A + io[0] + 34, A + io[1] + 34, io[2] - io[0] - 68, io[3] - io[1] - 68);
    this.aura = aura; this.auraPad = A;

    // 4. Frame-bar path for travelling light trails.
    var fb = L.frameBars;
    this.trailPath = this._samplePath([[fb[0], fb[1]], [fb[2], fb[1]], [fb[2], fb[3]], [fb[0], fb[3]], [fb[0], fb[1]]], 4);

    // 5. Deterministic particles.
    this._buildParticles(q.particles, q.burst);
  };

  P._qualitySettings = function () {
    var ql = this.opts.quality;
    if (ql === 'auto') {
      var cores = navigator.hardwareConcurrency || 4;
      var mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      ql = (mobile || cores <= 4) ? 'medium' : 'high';
    }
    var table = {
      high:   { name: 'high',   particles: 90, burst: 110, auraScale: 0.5,  ribbonSteps: 44 },
      medium: { name: 'medium', particles: 60, burst: 70,  auraScale: 0.4,  ribbonSteps: 34 },
      low:    { name: 'low',    particles: 30, burst: 40,  auraScale: 0.3,  ribbonSteps: 24 }
    };
    return table[ql] || table.high;
  };

  P._samplePath = function (pts, step) {
    var out = [], total = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step));
      for (var j = 0; j < n; j++) {
        var t = j / n;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      total += len;
    }
    return { pts: out, length: total };
  };

  P._buildParticles = function (n, nb) {
    var rnd = mulberry32(0x5EED + 7), L = this.layout, fb = L.frameBars, cx = L.center[0], cy = L.center[1];
    var path = this._samplePath([[fb[0], fb[1]], [fb[2], fb[1]], [fb[2], fb[3]], [fb[0], fb[3]], [fb[0], fb[1]]], 2);
    var parts = [];
    for (var i = 0; i < n; i++) {
      var p = path.pts[Math.floor(rnd() * path.pts.length)];
      var dx = p[0] - cx, dy = p[1] - cy, dl = Math.hypot(dx, dy) || 1;
      var out = -10 + rnd() * 70;  // spawn around the bars, biased outward
      var k = 1 + Math.floor(rnd() * 4); // lifetime = LOOP / k  -> seamless loop
      parts.push({
        x: p[0] + dx / dl * out, y: p[1] + dy / dl * out,
        vx: dx / dl * (2 + rnd() * 8) + (rnd() - 0.5) * 6,
        vy: -(6 + rnd() * 18) + dy / dl * 3,
        life: LOOP / k, phase: rnd(),
        size: 3 + rnd() * 7, tw: 1 + Math.floor(rnd() * 5), tph: rnd() * TAU,
        wob: 2 + rnd() * 6, wk: 1 + Math.floor(rnd() * 3)
      });
    }
    this.particles = parts;
    var burst = [];
    for (var j = 0; j < nb; j++) {
      var q = path.pts[Math.floor(rnd() * path.pts.length)];
      var ex = q[0] - cx, ey = q[1] - cy, el = Math.hypot(ex, ey) || 1;
      var spread = (rnd() - 0.5) * 0.9;
      var ang = Math.atan2(ey, ex) + spread;
      burst.push({ x: q[0], y: q[1], ax: Math.cos(ang), ay: Math.sin(ang), v: 140 + rnd() * 360,
                   size: 4 + rnd() * 9, delay: rnd() * 0.25, life: 1.1 + rnd() * 1.3 });
    }
    this.burst = burst;
  };

  /* ------------------------- showcase timeline ------------------------ */
  // u is normalised showcase time in [0, 5] ("design seconds"), scaled to showcaseDuration.
  function energyAt(u) {
    return easeOut(clamp((u - 0.62) / 0.55, 0, 1)) * (1 - smooth(3.2, 5.0, u));
  }
  P._buildShowcaseTable = function () {
    var N = 400, cum = new Float32Array(N + 1), acc = 0;
    for (var i = 1; i <= N; i++) { acc += energyAt(i / N * 5); cum[i] = acc; }
    for (var j = 0; j <= N; j++) cum[j] /= acc;
    this._cum = cum;
  };
  P._cumAt = function (u) {
    var N = this._cum.length - 1, f = clamp(u / 5, 0, 1) * N, i = Math.floor(f), r = f - i;
    return i >= N ? 1 : this._cum[i] * (1 - r) + this._cum[i + 1] * r;
  };
  P._showcaseParams = function (ts) {
    if (ts == null) return { active: false, u: 0, E: 0, charge: 0, flash: 0, orbit: 0, spin: 0, sweep: -1, shock: -1, tau: -1 };
    var u = ts / this.opts.showcaseDuration * 5;
    var cum = this._cumAt(u);
    return {
      active: true, u: u,
      E: energyAt(u),
      charge: smooth(0, 0.55, u) * (1 - smooth(0.62, 0.85, u)),
      // Keep the signature ignition bright, but soften its flash/glow peak.
      flash: 0.68 * Math.exp(-Math.pow((u - 0.74) / 0.13, 2)),
      orbit: cum * 2,     // extra ribbon turns (integer total => seamless return to idle)
      spin: cum * 1,      // extra cube turns
      sweep: (u - 0.7) / 1.05,
      shock: (u - 0.68) / 1.4,
      tau: u - 0.7        // time since ignition (design seconds)
    };
  };

  /* ------------------------------ sizing ------------------------------ */
  /**
   * Lock the backing canvas to an exact pixel size (used for exports / offscreen rendering).
   * Pass null to return to automatic, layout-driven sizing.
   */
  P.setPixelSize = function (px) {
    this._fixedPx = px ? Math.round(px) : null;
    this.resize();
  };

  P.resize = function () {
    var b = this.opts.bleed, full = S * (1 + 2 * b);
    if (this._fixedPx) {
      var fpx = this._fixedPx;
      if (this.canvas.width !== fpx) { this.canvas.width = this.canvas.height = fpx; }
      if (this.fx.width !== fpx) { this.fx.width = this.fx.height = fpx; }
      this.k = fpx / full; this.pad = S * b;
      if (!this.playing && this.img) this.renderAt(this.time, this.showcaseTime);
      return;
    }
    var rect = this.canvas.getBoundingClientRect();
    var cssW = rect.width || (this.container ? this.container.clientWidth * (1 + 2 * b) : 512);
    var dpr = Math.min((global.devicePixelRatio || 1) * this.opts.pixelRatio, this.opts.maxPixelRatio);
    var px = Math.min(Math.round(cssW * dpr), this.opts.maxCanvasSize);
    if (px < 16) px = 16;
    if (this.canvas.width !== px) { this.canvas.width = this.canvas.height = px; }
    if (this.fx.width !== px) { this.fx.width = this.fx.height = px; }
    this.k = px / full;
    this.pad = S * b;
    if (!this.playing && this.img) this.renderAt(this.time, this.showcaseTime);
  };

  P._setupObservers = function () {
    var self = this;
    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(this.container || this.canvas);
    } else {
      this._onWinResize = function () { self.resize(); };
      global.addEventListener('resize', this._onWinResize);
    }
    if (this.opts.pauseWhenHidden && global.IntersectionObserver) {
      this._io = new IntersectionObserver(function (es) {
        self._visible = es[0].isIntersecting;
        if (self._visible && self.playing && !self._raf) { self._last = 0; self._raf = requestAnimationFrame(self._loop); }
      });
      this._io.observe(this.canvas);
    }
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this._reduced = this.opts.reducedMotion === 'auto' ? !!(mq && mq.matches) : !!this.opts.reducedMotion;
  };

  /* ------------------------------ control ----------------------------- */
  P.play = function () {
    if (this.playing) return this;
    this.playing = true; this._last = 0;
    if (!this._raf) this._raf = requestAnimationFrame(this._loop);
    return this;
  };
  P.pause = function () {
    this.playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    return this;
  };
  P.setState = function (state) {
    if (state === 'showcase') return this.showcase();
    this.state = 'idle';
    this.showcaseTime = null;
    if (this._showcaseResolve) { this._showcaseResolve(false); this._showcaseResolve = null; }
    if (!this.playing && this.img) this.renderAt(this.time, null);
    return Promise.resolve(true);
  };
  /** Plays the showcase reveal. Resolves true when it completes (false if interrupted). */
  P.showcase = function () {
    var self = this;
    if (this._showcaseResolve) this._showcaseResolve(false);
    this.state = 'showcase';
    this.showcaseTime = 0;
    this._emit('showcasestart');
    if (!this.playing) this.play();
    return new Promise(function (res) { self._showcaseResolve = res; });
  };
  /**
   * Jump to an exact moment and render it (works while paused; persists across resizes).
   * @param {number} t            idle clock seconds
   * @param {number|null} ts      showcase clock seconds, or null for idle
   */
  P.seek = function (t, ts) {
    this.time = t || 0;
    this.showcaseTime = ts == null ? null : ts;
    this.state = ts == null ? 'idle' : 'showcase';
    if (this.img) this.renderAt(this.time, this.showcaseTime);
    return this;
  };
  P.setQuality = function (ql) { this.opts.quality = ql; if (this.img) this._prepareAssets(); };
  P.setIntensity = function (v) { this.opts.intensity = v; };
  P.setDebug = function (v) { this.opts.debug = !!v; if (!this.playing && this.img) this.renderAt(this.time, this.showcaseTime); };
  P.destroy = function () {
    this.pause();
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._onWinResize) global.removeEventListener('resize', this._onWinResize);
    if (this.container && this.canvas.parentNode === this.container) this.container.removeChild(this.canvas);
  };
  P._emit = function (name, detail) {
    try { this.canvas.dispatchEvent(new CustomEvent('rootcipher:' + name, { detail: detail || { instance: this }, bubbles: true })); } catch (e) {}
  };

  P._loop = function (now) {
    this._raf = 0;
    if (!this.playing) return;
    if (this.opts.pauseWhenHidden && (!this._visible || document.hidden)) { this._last = 0; return; }
    var dt = this._last ? Math.min((now - this._last) / 1000, 0.05) : 0;
    this._last = now;
    var sp = this.opts.speed * (this._reduced ? 0.5 : 1);
    this.time = (this.time + dt * sp) % (LOOP * 1000);
    if (this.showcaseTime != null) {
      this.showcaseTime += dt * this.opts.speed;
      if (this.showcaseTime >= this.opts.showcaseDuration) {
        this.showcaseTime = null;
        this.state = 'idle';
        if (this._showcaseResolve) { this._showcaseResolve(true); this._showcaseResolve = null; }
        this._emit('showcaseend');
        if (this.opts.onShowcaseEnd) this.opts.onShowcaseEnd(this);
        if (!this.opts.returnToIdle) this.pause();
      }
    }
    this.renderAt(this.time, this.showcaseTime);
    this._raf = requestAnimationFrame(this._loop);
  };

  /* ============================== RENDER ============================== */
  /**
   * Deterministically renders one frame.
   * @param {number} t        idle clock in seconds (loops every 12s)
   * @param {number|null} ts  showcase clock in seconds, or null for pure idle
   */
  P.renderAt = function (t, ts) {
    if (!this.img) return;
    var c = this.ctx, k = this.k, pad = this.pad, L = this.layout;
    var I = this.opts.intensity * (this._reduced ? 0.6 : 1);
    var sc = this._showcaseParams(ts);
    var E = sc.E;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(k, 0, 0, k, k * pad, k * pad);

    this._drawAura(c, t, sc, I);
    this._drawRibbons(c, t, sc, I, 'back');

    // Base artwork (untouched pixels)
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.drawImage(this.base, 0, 0, S, S);
    if (sc.charge > 0.001) {                    // pre-reveal dim (only darkens existing pixels)
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(12,7,0,' + (0.55 * sc.charge) + ')';
      c.fillRect(-pad, -pad, S + pad * 2, S + pad * 2);
      c.globalCompositeOperation = 'source-over';
    }

    this._drawCrownRays(c, t, sc);
    this._drawMaskedLight(c, t, sc, I);
    this._drawCrown(c, t, sc, I);
    this._drawEmblem(c, t, sc, I);
    this._drawSparkles(c, t, sc, I);
    this._drawCubes(c, t, sc, I);
    this._drawRibbons(c, t, sc, I, 'front');
    this._drawShockwave(c, sc);
    this._drawParticles(c, t, sc, I);

    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    if (this.opts.debug) this._drawDebug(c);
  };

  /* -------- breathing outer aura -------- */
  P._drawAura = function (c, t, sc, I) {
    var A = this.auraPad, breath = 0.5 + 0.5 * wave(t, 3);
    var s = 1 + 0.014 * breath * I + 0.1 * sc.E - 0.05 * sc.charge;
    var a = clamp((0.42 + 0.22 * breath) * I + 0.4 * sc.E + 0.4 * sc.flash - 0.35 * sc.charge, 0, 1);
    c.save();
    c.translate(512, 500); c.scale(s, s); c.translate(-512, -500);
    c.globalAlpha = a;
    c.drawImage(this.aura, -A, -A, S + 2 * A, S + 2 * A);
    if (sc.E > 0.01 || sc.flash > 0.01) {
      c.globalCompositeOperation = 'lighter';
      c.translate(512, 500); c.scale(1.035, 1.035); c.translate(-512, -500);
      c.globalAlpha = clamp(0.44 * sc.E + 0.48 * sc.flash, 0, 1);
      c.drawImage(this.aura, -A, -A, S + 2 * A, S + 2 * A);
    }
    c.restore();
  };

  /* -------- orbiting golden ribbons (split front/back around the base) -------- */
  P._drawRibbons = function (c, t, sc, I, half) {
    var L = this.layout, steps = this.q.ribbonSteps, self = this;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    L.ribbons.forEach(function (rb, ri) {
      var tilt = rb.tilt * Math.PI / 180;
      tilt += 0.03 * wave(t, 1, ri) + 0.05 * sc.E * Math.sin(sc.u * 3 + ri);   // gentle precession
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      var grow = 1 + 0.04 * sc.E;
      var rx = rb.rx * grow, ry = rb.ry * (1 + 0.12 * sc.E);
      var phase = rb.offset + rb.dir * (t * rb.speed / LOOP + sc.orbit);
      var strands = 2 + (sc.E > 0.05 ? 1 : 0);
      for (var s = 0; s < strands; s++) {
        var head = TAU * phase + s * TAU / strands;
        var len = (0.95 + 0.55 * sc.E) * Math.PI * (s === 2 ? 0.6 : 1);
        var strandA = (s === 2 ? sc.E : 1);
        var px = null, py = null, pdepth = 0;
        for (var i = 0; i <= steps; i++) {
          var f = i / steps;
          var th = head - rb.dir * f * len;
          var lx = Math.cos(th) * rx, ly = Math.sin(th) * ry;
          var x = rb.cx + lx * ct - ly * st, y = rb.cy + lx * st + ly * ct;
          var depth = Math.sin(th);            // > 0 => near side (in front of frame)
          if (px !== null) {
            var front = (depth + pdepth) > 0;
            if ((half === 'front') === front) {
              var fall = Math.pow(1 - f, 1.5);
              var dz = 0.75 + 0.25 * depth;
              var alpha = fall * strandA * (0.5 * I + 0.5 * sc.E + 0.15) * (front ? 1 : 0.55);
              var w = (1.1 + 3.2 * (1 - f)) * dz * (1 + 0.5 * sc.E);
              c.strokeStyle = 'rgba(' + GOLD_DEEP + ',' + (alpha * 0.22) + ')';
              c.lineWidth = w * 4;
              c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
              c.strokeStyle = 'rgba(' + (f < 0.25 ? GOLD_CORE : GOLD) + ',' + alpha + ')';
              c.lineWidth = w;
              c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
            }
          }
          if (i === 0) {                        // bright head
            var hf = depth > 0;
            if ((half === 'front') === hf) {
              var hr = (14 + 10 * sc.E) * (0.8 + 0.2 * depth);
              c.globalAlpha = clamp(strandA * (0.55 * I + 0.45 * sc.E + 0.1), 0, 1) * (hf ? 1 : 0.5);
              c.drawImage(self.glow, x - hr, y - hr, hr * 2, hr * 2);
              c.globalAlpha = 1;
            }
          }
          px = x; py = y; pdepth = depth;
        }
      }
    });
    c.restore();
  };

  /* -------- light that lives ON the metal (trails, sheen, halo, shield scan), masked by artwork alpha -------- */
  P._drawMaskedLight = function (c, t, sc, I) {
    var fx = this.fxc, k = this.k, pad = this.pad, L = this.layout;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.globalCompositeOperation = 'source-over';
    fx.globalAlpha = 1;
    fx.clearRect(0, 0, this.fx.width, this.fx.height);
    fx.setTransform(k, 0, 0, k, k * pad, k * pad);
    fx.globalCompositeOperation = 'lighter';
    fx.lineCap = 'round';

    // golden light trails travelling along the frame bars
    var path = this.trailPath, self = this;
    var comets = [
      { off: 0.0,  sp: 1,  a: 0.9 * I, len: 230 },
      { off: 0.5,  sp: 1,  a: 0.9 * I, len: 230 },
      { off: 0.25, sp: -1, a: 0.55 * I, len: 150 }
    ];
    if (sc.E > 0.01) {
      for (var ci = 0; ci < 4; ci++) comets.push({ off: ci * 0.25 + 0.12, sp: ci % 2 ? -1 : 1, a: sc.E, len: 300, fast: true });
    }
    comets.forEach(function (cm) {
      // sc.orbit ends at exactly 2 => +1 / +1.5 turns keep the hand-off back to idle seamless
      var turns = cm.sp * (t * 1 / LOOP + (cm.fast ? sc.orbit * 0.75 : sc.orbit * 0.5)) + cm.off;
      self._drawComet(fx, path, frac(turns) * path.length, cm.len, cm.sp, cm.a, 20);
    });

    // diagonal sheen sweep (idle: every 6s, faint; showcase: bright reveal sweep)
    var idleP = frac(t * 2 / LOOP) / 0.38;
    if (idleP <= 1) this._drawSheen(fx, idleP, 0.32 * I, 150);
    if (sc.sweep >= 0 && sc.sweep <= 1) this._drawSheen(fx, easeOut(sc.sweep), 1, 230);

    // halo rings above the crown: two lights gliding along the arcs
    var h = L.halo, hm = 0.5 + 0.5 * wave(t, 2);
    for (var hi = 0; hi < 2; hi++) {
      var span = (h.a1 - h.a0) * Math.PI / 180, a0 = h.a0 * Math.PI / 180;
      var pos = hi === 0 ? hm : 1 - hm;
      var ang = a0 + span * pos;
      var hr = 52;
      var g = fx.createRadialGradient(h.cx + Math.cos(ang) * h.r, h.cy + Math.sin(ang) * h.r, 0,
                                      h.cx + Math.cos(ang) * h.r, h.cy + Math.sin(ang) * h.r, hr);
      g.addColorStop(0, 'rgba(255,240,190,' + (0.85 * I + 0.15 + sc.E * 0.4) + ')');
      g.addColorStop(1, 'rgba(255,180,60,0)');
      fx.fillStyle = g;
      fx.fillRect(h.cx + Math.cos(ang) * h.r - hr, h.cy + Math.sin(ang) * h.r - hr, hr * 2, hr * 2);
    }
    if (sc.E > 0.01) {   // whole halo lights up during showcase
      fx.strokeStyle = 'rgba(255,220,140,' + (0.4 * sc.E) + ')';
      fx.lineWidth = 60;
      fx.beginPath(); fx.arc(h.cx, h.cy, h.r, h.a0 * Math.PI / 180, h.a1 * Math.PI / 180); fx.stroke();
    }

    // cipher scan line descending the </> shield
    var sh = L.shield, sp = frac(t * 3 / LOOP);
    var sy = sh[1] + (sh[3] - sh[1]) * sp;
    var sa = Math.sin(Math.PI * sp) * (0.6 * I + 0.3) + sc.E * 0.6;
    var sg = fx.createLinearGradient(0, sy - 22, 0, sy + 22);
    sg.addColorStop(0, 'rgba(255,200,90,0)');
    sg.addColorStop(0.5, 'rgba(255,236,180,' + clamp(sa, 0, 1) + ')');
    sg.addColorStop(1, 'rgba(255,200,90,0)');
    fx.fillStyle = sg;
    fx.fillRect(sh[0], sy - 22, sh[2] - sh[0], 44);

    // showcase: metal glows hot on ignition
    if (sc.flash > 0.01 || sc.E > 0.01) {
      fx.fillStyle = 'rgba(255,200,110,' + clamp(0.44 * sc.flash + 0.1 * sc.E, 0, 1) + ')';
      fx.fillRect(0, 0, S, S);
    }

    // mask to artwork alpha => light only appears on existing metal / gems
    fx.globalCompositeOperation = 'destination-in';
    fx.globalAlpha = 1;
    fx.drawImage(this.base, 0, 0, S, S);

    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(this.fx, 0, 0);
    c.restore();
  };

  P._drawComet = function (ctx, path, d, len, dir, alpha, width) {
    var pts = path.pts, n = pts.length, stepLen = path.length / n;
    var count = Math.max(4, Math.round(len / stepLen / 2));
    var start = Math.floor(d / stepLen);
    var prev = null;
    for (var i = 0; i <= count; i++) {
      var idx = ((start - dir * i * 2) % n + n) % n;
      var p = pts[idx];
      if (prev) {
        var f = i / count, fall = Math.pow(1 - f, 1.4);
        ctx.strokeStyle = 'rgba(' + (f < 0.15 ? GOLD_CORE : GOLD) + ',' + (alpha * fall) + ')';
        ctx.lineWidth = width * (0.35 + 0.65 * (1 - f));
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
      prev = p;
    }
    var hp = pts[start % n], r = width * 2.4;
    var g = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], r);
    g.addColorStop(0, 'rgba(255,250,225,' + alpha + ')');
    g.addColorStop(1, 'rgba(255,190,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(hp[0] - r, hp[1] - r, r * 2, r * 2);
  };

  P._drawSheen = function (ctx, p, alpha, half) {
    ctx.save();
    ctx.translate(512, 512);
    ctx.rotate(-0.55);
    var x = -900 + 1800 * p;
    var g = ctx.createLinearGradient(x - half, 0, x + half, 0);
    g.addColorStop(0, 'rgba(255,220,150,0)');
    g.addColorStop(0.45, 'rgba(255,236,190,' + alpha * 0.7 + ')');
    g.addColorStop(0.5, 'rgba(255,252,235,' + alpha + ')');
    g.addColorStop(0.55, 'rgba(255,236,190,' + alpha * 0.7 + ')');
    g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - half, -1000, half * 2, 2000);
    ctx.restore();
  };

  /* -------- pulsating crown -------- */
  P._drawCrown = function (c, t, sc, I) {
    var cr = this.layout.crown;
    var pulse = Math.pow(0.5 + 0.5 * wave(t, 4), 1.6);
    var a = clamp((0.16 + 0.42 * pulse) * I + 0.56 * sc.E + 0.64 * sc.flash, 0, 2.2);
    c.save();
    c.beginPath(); c.arc(cr.x, cr.y, cr.r, 0, TAU); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (var pass = 0; a > 0.001 && pass < 3; pass++) {   // self-additive brighten of the real crown pixels
      c.globalAlpha = Math.min(1, a); a -= 1;
      c.drawImage(this.base, 0, 0, S, S);
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = 'lighter';
    var gr = 70 + 26 * pulse + 60 * sc.E;
    c.globalAlpha = clamp((0.22 + 0.3 * pulse) * I + 0.4 * sc.E + 0.48 * sc.flash, 0, 1);
    c.drawImage(this.glow, cr.x - gr, cr.y - 6 - gr, gr * 2, gr * 2);
    c.restore();
  };

  P._drawCrownRays = function (c, t, sc) {
    if (sc.E < 0.01 && sc.flash < 0.01) return;
    var cr = this.layout.crown, a = clamp(0.4 * sc.E + 0.48 * sc.flash, 0, 1);
    var len = 140 + 220 * sc.E;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(cr.x, cr.y - 8);
    var g = c.createRadialGradient(0, 0, 10, 0, 0, len);
    g.addColorStop(0, 'rgba(255,240,190,' + a + ')');
    g.addColorStop(1, 'rgba(255,170,50,0)');
    c.fillStyle = g;
    var n = 11;
    for (var i = 0; i < n; i++) {
      var ang = Math.PI + (i + 0.5) / n * Math.PI + 0.06 * Math.sin(sc.u * 2 + i);
      var w = 0.035 + 0.02 * Math.sin(i * 1.7 + sc.u * 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(ang - w) * len, Math.sin(ang - w) * len);
      c.lineTo(Math.cos(ang + w) * len, Math.sin(ang + w) * len);
      c.closePath(); c.fill();
    }
    c.restore();
  };

  /* -------- illuminating </> emblem -------- */
  P._drawEmblem = function (c, t, sc, I) {
    var em = this.layout.emblem;
    var pulse = 0.5 + 0.5 * wave(t, 2, 1.2);
    var flick = 0.9 + 0.1 * wave(t, 37) * wave(t, 11);
    var ignite = sc.tau > 0.3 ? Math.exp(-Math.pow((sc.tau - 0.55) / 0.25, 2)) : 0;
    var a = clamp(((0.35 + 0.65 * pulse) * I * flick) + 1.0 * sc.E + 1.2 * ignite, 0, 3);
    c.save();
    c.beginPath(); c.rect(em.x - em.w / 2, em.y - em.h / 2, em.w, em.h); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (var pass = 0; a > 0.001 && pass < 3; pass++) {
      c.globalAlpha = Math.min(1, a); a -= 1;
      c.drawImage(this.base, 0, 0, S, S);
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = 'lighter';
    var gr = 48 + 14 * pulse + 30 * sc.E;
    c.globalAlpha = clamp((0.25 + 0.3 * pulse) * I + 0.5 * sc.E + 0.6 * ignite, 0, 1);
    c.drawImage(this.glow, em.x - gr, em.y - gr * 0.7, gr * 2, gr * 1.4);
    c.restore();
  };

  /* -------- twinkling star accents -------- */
  P._drawSparkles = function (c, t, sc, I) {
    var L = this.layout, self = this;
    var pts = [
      { p: L.sparkles[0], k: 3, ph: 0, s: 30 },
      { p: L.sparkles[1], k: 3, ph: Math.PI, s: 30 },
      { p: [L.pendant.x, L.pendant.y], k: 2, ph: 0.6, s: 38 },
      { p: [L.topStar.x, L.topStar.y], k: 4, ph: 2.2, s: 34 }
    ];
    c.save();
    c.globalCompositeOperation = 'lighter';
    pts.forEach(function (o, i) {
      var tw = Math.pow(0.5 + 0.5 * wave(t, o.k, o.ph), 3);
      var a = clamp(tw * 0.9 * I + 0.8 * sc.E * (0.6 + 0.4 * Math.sin(sc.u * 9 + i)), 0, 1);
      if (a < 0.01) return;
      var s = o.s * (0.55 + 0.6 * tw + 0.5 * sc.E);
      c.save();
      c.translate(o.p[0], o.p[1]);
      c.rotate(TAU * t / LOOP * (i % 2 ? -1 : 1) * 0.5);
      c.globalAlpha = a;
      c.drawImage(self.star, -s, -s, s * 2, s * 2);
      c.restore();
    });
    c.restore();
  };

  /* -------- floating, rotating cubes -------- */
  P._drawCubes = function (c, t, sc, I) {
    var L = this.layout, self = this, cx = L.center[0], cy = L.center[1];
    L.cubes.forEach(function (cb, i) {
      var spr = self.cubeSprites[i];
      var bob = wave(t, 2, cb.phase) * 5 * I;
      var sway = wave(t, 1, cb.phase * 1.3) * 2.5 * I;
      var dx = cb.x - cx, dy = cb.y - cy, dl = Math.hypot(dx, dy) || 1;
      var push = 16 * sc.E - 6 * sc.charge;
      var x = cb.x + sway + dx / dl * push, y = cb.y + bob + dy / dl * push;
      var rot = cb.dir * (0.32 * wave(t, 1, cb.phase) * I + TAU * sc.spin);
      var tumble = 1 - 0.12 * (0.5 + 0.5 * wave(t, 2, cb.phase + 1)) * I;  // pseudo-3D spin squash
      var scale = 1 + 0.03 * wave(t, 3, cb.phase) * I + 0.08 * sc.E;
      // soft glow under cube
      c.save();
      c.globalCompositeOperation = 'lighter';
      var gr = Math.max(spr.w, spr.h) * (1.2 + 0.4 * sc.E);
      c.globalAlpha = clamp(0.28 * I + 0.4 * sc.E, 0, 1);
      c.drawImage(self.glow, x - gr, y - gr, gr * 2, gr * 2);
      c.restore();
      // cube sprite (original pixels)
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.scale(scale * tumble, scale);
      c.drawImage(spr.canvas, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      var glint = Math.pow(Math.max(0, wave(t, 2, cb.phase * 2.1)), 14) * I + 0.6 * sc.E + sc.flash;
      if (glint > 0.01) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = clamp(glint, 0, 1);
        c.drawImage(spr.canvas, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      }
      c.restore();
    });
  };

  /* -------- showcase shockwave (expands outward from the frame, never across the avatar window) -------- */
  P._drawShockwave = function (c, sc) {
    if (sc.shock < 0 || sc.shock > 1) return;
    var fb = this.layout.frameBars, p = easeOut(sc.shock), e = 10 + p * 150;
    var a = Math.pow(1 - sc.shock, 2);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineJoin = 'round';
    [[34 * (1 - p) + 8, 0.25], [6 * (1 - p) + 1.5, 0.9]].forEach(function (s) {
      c.strokeStyle = 'rgba(255,214,130,' + a * s[1] + ')';
      c.lineWidth = s[0];
      var x0 = fb[0] - e, y0 = fb[1] - e, x1 = fb[2] + e, y1 = fb[3] + e, r = 20 + e * 0.6;
      c.beginPath();
      c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r);
      c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath();
      c.stroke();
    });
    c.restore();
  };

  /* -------- subtle glowing particles -------- */
  P._drawParticles = function (c, t, sc, I) {
    var g = this.glow;
    c.save();
    c.globalCompositeOperation = 'lighter';
    var boost = 1 + 1.4 * sc.E;
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var a = frac(t / p.life + p.phase), age = a * p.life;
      var x = p.x + p.vx * age * boost + Math.sin(TAU * (t * p.wk / LOOP) + p.tph) * p.wob;
      var y = p.y + p.vy * age * boost;
      var al = Math.pow(Math.sin(Math.PI * a), 2) * (0.55 + 0.45 * Math.sin(TAU * t * p.tw / LOOP + p.tph));
      al *= (0.65 * I + 0.6 * sc.E);
      if (al < 0.02) continue;
      var s = p.size * (1 + 0.4 * sc.E);
      c.globalAlpha = clamp(al, 0, 1);
      c.drawImage(g, x - s, y - s, s * 2, s * 2);
    }
    if (sc.tau > 0) {   // ignition burst
      for (var j = 0; j < this.burst.length; j++) {
        var b = this.burst[j], tb = sc.tau - b.delay;
        if (tb <= 0 || tb > b.life) continue;
        var kd = 2.4, dist = b.v / kd * (1 - Math.exp(-kd * tb));
        var bx = b.x + b.ax * dist, by = b.y + b.ay * dist - 12 * tb * tb;
        var ba = Math.pow(1 - tb / b.life, 1.5);
        var bs = b.size * (0.6 + 0.4 * ba);
        c.globalAlpha = clamp(ba, 0, 1);
        c.drawImage(g, bx - bs, by - bs, bs * 2, bs * 2);
      }
    }
    c.restore();
  };

  /* -------- debug guides (layout calibration) -------- */
  P._drawDebug = function (c) {
    var L = this.layout;
    c.save();
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(0,255,255,0.9)';
    L.ribbons.forEach(function (r) {
      c.beginPath(); c.ellipse(r.cx, r.cy, r.rx, r.ry, r.tilt * Math.PI / 180, 0, TAU); c.stroke();
    });
    c.strokeStyle = 'rgba(255,0,80,0.95)';
    L.cubes.forEach(function (cb) { c.beginPath(); c.ellipse(cb.x, cb.y, cb.rx, cb.ry, 0, 0, TAU); c.stroke(); });
    c.strokeStyle = 'rgba(255,0,255,0.9)';
    c.beginPath(); c.arc(L.crown.x, L.crown.y, L.crown.r, 0, TAU); c.stroke();
    c.beginPath(); c.arc(L.halo.cx, L.halo.cy, L.halo.r, L.halo.a0 * Math.PI / 180, L.halo.a1 * Math.PI / 180); c.stroke();
    c.strokeStyle = 'rgba(80,255,80,0.9)';
    c.strokeRect(L.emblem.x - L.emblem.w / 2, L.emblem.y - L.emblem.h / 2, L.emblem.w, L.emblem.h);
    c.strokeRect(L.shield[0], L.shield[1], L.shield[2] - L.shield[0], L.shield[3] - L.shield[1]);
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    var fb = L.frameBars; c.strokeRect(fb[0], fb[1], fb[2] - fb[0], fb[3] - fb[1]);
    c.fillStyle = 'rgba(0,140,255,1)';
    L.sparkles.concat([[L.pendant.x, L.pendant.y], [L.topStar.x, L.topStar.y]]).forEach(function (p) {
      c.beginPath(); c.arc(p[0], p[1], 4, 0, TAU); c.fill();
    });
    c.restore();
  };

  /* ============================ statics ============================ */
  RootCipher.create = function (target, opts) { return new RootCipher(target, opts); };
  RootCipher.LAYOUT = LAYOUT;
  RootCipher.LOOP_SECONDS = LOOP;
  RootCipher.ARTWORK_SIZE = S;
  RootCipher.version = '1.0.0';

  /* ======================= <root-cipher-frame> ======================= */
  if (global.customElements && !global.customElements.get('root-cipher-frame')) {
    var RootCipherElement = (function () {
      function El() { return Reflect.construct(HTMLElement, [], El); }
      El.prototype = Object.create(HTMLElement.prototype);
      El.prototype.constructor = El;
      Object.setPrototypeOf(El, HTMLElement);
      Object.defineProperty(El, 'observedAttributes', { get: function () { return ['state', 'quality', 'intensity', 'paused']; } });
      El.prototype.connectedCallback = function () {
        if (this._fx) return;
        var root = this.attachShadow ? this.attachShadow({ mode: 'open' }) : this;
        var style = document.createElement('style');
        style.textContent = ':host{display:inline-block;position:relative;width:256px;aspect-ratio:1/1;overflow:visible}' +
          '.slot{position:absolute;inset:0}';
        var slot = document.createElement('div'); slot.className = 'slot';
        root.appendChild(style); root.appendChild(slot);
        var self = this;
        this._fx = new RootCipher(slot, {
          src: this.getAttribute('src') || undefined,
          quality: this.getAttribute('quality') || 'auto',
          bleed: this.hasAttribute('bleed') ? parseFloat(this.getAttribute('bleed')) : undefined,
          intensity: this.hasAttribute('intensity') ? parseFloat(this.getAttribute('intensity')) : 1,
          state: this.getAttribute('state') || 'idle',
          autoplay: !this.hasAttribute('paused'),
          onShowcaseEnd: function () {
            if (self.getAttribute('state') === 'showcase') self.setAttribute('state', 'idle');
            self.dispatchEvent(new CustomEvent('showcaseend'));
          }
        });
        this.ready = this._fx.ready;
      };
      El.prototype.disconnectedCallback = function () { if (this._fx) { this._fx.pause(); } };
      El.prototype.attributeChangedCallback = function (name, oldV, v) {
        var fx = this._fx; if (!fx || oldV === v) return;
        fx.ready.then(function () {
          if (name === 'state') { if (v === 'showcase') fx.showcase(); else fx.setState('idle'); }
          if (name === 'quality') fx.setQuality(v || 'auto');
          if (name === 'intensity') fx.setIntensity(parseFloat(v) || 1);
          if (name === 'paused') { if (v === null) fx.play(); else fx.pause(); }
        });
      };
      El.prototype.showcase = function () { return this._fx ? this._fx.showcase() : Promise.resolve(false); };
      Object.defineProperty(El.prototype, 'engine', { get: function () { return this._fx; } });
      return El;
    })();
    global.customElements.define('root-cipher-frame', RootCipherElement);
  }

  global.RootCipher = RootCipher;
  if (typeof module === 'object' && module.exports) module.exports = RootCipher;
})(typeof window !== 'undefined' ? window : this);
