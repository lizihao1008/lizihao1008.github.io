/**
 * Astronomy Academic Homepage
 * Starfield, parallax, navigation, scroll reveal, ADS publications
 */

(function () {
  "use strict";

  const DATA_BASE = "data";
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => motionQuery.matches;

  const t = (key, vars) =>
    (typeof SiteI18n !== "undefined" ? SiteI18n.t(key, vars) : key);

  const dateLocale = () => (SiteI18n?.getLang() === "zh" ? "zh-CN" : "en-US");

  let cachedPubData = null;
  let cachedOthersData = null;
  let cachedCiteDict = null;

  /** Shared parallax offset for background layers (-1 … 1) */
  const cosmosParallax = { x: 0, y: 0 };

  // ─── Galaxy field (sprite-baked, GPU-blitted) ───────────────────
  // Each galaxy is a rigid body that only rotates, so we rasterize its
  // thousands of particles ONCE into an offscreen sprite, then per-frame
  // simply rotate + drawImage it. This turns ~30k arc() calls per frame
  // into ~3 drawImage() calls — orders of magnitude faster.
  function initGalaxyField() {
    const canvas = document.getElementById("galaxy-field");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width, height, minDim, animationId;
    let lastWidth = 0;
    let lastHeight = 0;
    let galaxies = [];
    let flowStreams = [];
    let flowSprite = null; // baked, blurred gas-cloud sprite (no hard edges)
    let flowSpriteX = 0; // local offset of sprite top-left from galaxy centre
    let flowSpriteY = 0;
    let animStart = performance.now();

    /** Slow gas motion (not freeze) when OS "reduce motion" is on. */
    function flowSpeedScale() {
      return prefersReducedMotion() ? 0.4 : 1;
    }

    /** Decorative spin — keep visible even when OS "reduce motion" is on (slower only). */
    function galaxyRotSpeed(configSpeed) {
      const base = configSpeed ?? 0.1;
      return prefersReducedMotion() ? base * 0.45 : base;
    }

    /** Box–Muller standard normal sample */
    function gaussianRandom() {
      let u, v, s;
      do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      return u * Math.sqrt((-2 * Math.log(s)) / s);
    }

    /** 2D Gaussian halo: dense small light points instead of ellipse gradient */
    function buildGaussianBulge(radius, flatten, count, sigmaScale) {
      const sigmaX = radius * sigmaScale;
      const sigmaY = sigmaX * flatten;
      const inv2sx2 = 1 / (2 * sigmaX * sigmaX);
      const inv2sy2 = 1 / (2 * sigmaY * sigmaY);
      const particles = [];

      for (let i = 0; i < count; i++) {
        const gx = gaussianRandom() * sigmaX;
        const gy = gaussianRandom() * sigmaY;
        const gaussW = Math.exp(-gx * gx * inv2sx2 - gy * gy * inv2sy2);
        const rNorm = Math.sqrt(gx * gx + gy * gy) / (radius * 0.55);

        const r = Math.hypot(gx, gy / flatten);
        const angle = Math.atan2(gy / flatten, gx);
        particles.push({
          kind: "bulge",
          baseR: r,
          angle,
          size: 0.2 + gaussW * 1.6 + Math.random() * 0.25,
          opacity: 0.25 + gaussW * 0.7,
          hue: rNorm < 0.12 ? "core" : rNorm < 0.32 ? "gold" : rNorm < 0.55 ? "warm" : "purple",
        });
      }
      return particles;
    }

    function buildArmParticles(config, radius) {
      const particles = [];
      const armCount = config.arms || 6;
      const tightness = config.tightness || 0.62;
      const armWidth = ((Math.PI * 2) / armCount) * (config.armWidth ?? 0.17);
      const highlightArm = config.highlightArm ?? 0;

      for (let i = 0; i < config.count; i++) {
        const arm = i % armCount;
        const armAngle = (arm / armCount) * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.58);
        const r = radius * (0.1 + dist * 0.9);
        const armJitter = (arm - highlightArm) * 0.035;
        const spin = Math.log(1 + dist * 14) * tightness * 3.4 + armJitter;
        const angle = armAngle + spin + (Math.random() - 0.5) * armWidth;
        const isHighlight = arm === highlightArm;
        const isBeacon = isHighlight && dist > 0.4 && dist < 0.8 && Math.random() < 0.02;

        particles.push({
          kind: "arm",
          baseR: r,
          angle,
          size: (isBeacon ? 2.4 : 1) * (0.35 + Math.random() * (dist < 0.3 ? 1.5 : 0.75)),
          opacity: (isHighlight ? 1.2 : 1) * (0.1 + (1 - dist) * 0.4 + Math.random() * 0.1),
          hue: isBeacon ? "core" : dist < 0.2 ? "gold" : dist < 0.5 ? "purple" : "blue",
        });
      }
      return particles;
    }

    function buildGalaxy(config) {
      const cx = config.cx * width;
      const cy = config.cy * height;
      const radius = config.radius * minDim;
      const flatten = config.flatten || 0.72;
      const bulgeCount = Math.floor((config.bulgeCount ?? 280) * (width < 768 ? 0.55 : 1));
      const coreCount = Math.floor((config.coreCount ?? 80) * (width < 768 ? 0.55 : 1));

      const bulge = buildGaussianBulge(radius, flatten, bulgeCount, config.bulgeSigma ?? 0.38);
      const core = buildGaussianBulge(radius * 0.35, flatten, coreCount, 0.55);
      const arms = buildArmParticles(config, radius);
      const nucleus = [];
      const nOff = config.nucleusOffset ?? 0.2;
      for (let i = 0; i < 10; i++) {
        const lx = radius * nOff + gaussianRandom() * radius * 0.035;
        const ly = gaussianRandom() * radius * 0.035;
        nucleus.push({
          kind: "nucleus",
          baseR: Math.hypot(lx, ly / flatten),
          angle: Math.atan2(ly / flatten, lx),
          size: 1.4 + Math.random() * 0.8,
          opacity: 0.7 + Math.random() * 0.2,
          hue: "core",
        });
      }

      const haloScale = config.haloScale ?? 0.96;
      return {
        cx,
        cy,
        radius,
        flatten,
        haloRx: radius * haloScale,
        haloRy: radius * flatten * haloScale,
        rotationOffset: config.rotationOffset ?? Math.random() * Math.PI * 2,
        rotSpeed: galaxyRotSpeed(config.rotSpeed),
        nucleusOffset: config.nucleusOffset ?? 0.2,
        parallaxFactor: config.parallaxFactor || 18,
        particles: [...bulge, ...core, ...arms, ...nucleus],
      };
    }

    function resize() {
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      if (nextW === lastWidth && nextH === lastHeight) return;
      lastWidth = nextW;
      lastHeight = nextH;

      width = nextW;
      height = nextH;
      canvas.width = Math.round(nextW * dpr);
      canvas.height = Math.round(nextH * dpr);
      canvas.style.width = nextW + "px";
      canvas.style.height = nextH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      minDim = Math.min(width, height);
      animStart = performance.now();

      const density = width < 768 ? 0.55 : 1;
      const bulgeScale = width < 768 ? 0.55 : 0.72;
      galaxies = [
        buildGalaxy({
          cx: 0.78,
          cy: 0.22,
          radius: 0.15,
          count: Math.floor(2000 * density),
          arms: 6,
          armWidth: 0.4,
          bulgeCount: Math.floor(2000 * bulgeScale),
          coreCount: Math.floor(1000 * bulgeScale),
          rotSpeed: -0.2,
          tightness: 0.64,
          flatten: 0.6,
          parallaxFactor: 22,
        }),
        buildGalaxy({
          cx: 0.18,
          cy: 0.72,
          radius: 0.22,
          count: Math.floor(2000 * density),
          arms: 6,
          armWidth: 0.2,
          bulgeCount: Math.floor(1500 * bulgeScale),
          coreCount: Math.floor(1000 * bulgeScale),
          rotSpeed: -0.06,
          tightness: 0.65,
          flatten: 0.75,
          parallaxFactor: 14,
        }),
        buildGalaxy({
          cx: 0.85,
          cy: 0.6,
          radius: 0.12,
          count: Math.floor(1000 * density),
          arms: 4,
          armWidth: 0.25,
          bulgeCount: Math.floor(500 * bulgeScale),
          coreCount: Math.floor(200 * bulgeScale),
          rotSpeed: -0.16,
          tightness: 0.8,
          flatten: 0.4,
          parallaxFactor: 8,
        }),
      ];

      // Rasterize each galaxy once; the animation loop only blits + rotates.
      galaxies.forEach(bakeGalaxySprite);

      // Circumgalactic gas flows around the bottom-left galaxy.
      if (galaxies[1]) buildFlows(galaxies[1]);
    }

    const colors = {
      core: [255, 248, 220],
      warm: [255, 220, 160],
      gold: [255, 210, 130],
      purple: [200, 160, 255],
      blue: [122, 162, 255],
    };

    /** (r, θ) on a flattened disk → local cartesian (sprite-centred). */
    function diskToLocal(r, angle, flatten) {
      return { x: r * Math.cos(angle), y: r * Math.sin(angle) * flatten };
    }

    /**
     * Bake a galaxy's halo + bloom + every particle into an offscreen
     * sprite ONCE. Particles are composited additively ("lighter") so
     * dense regions glow — the luminous, nebulous core comes for free.
     */
    function bakeGalaxySprite(g) {
      const half = g.radius * 1.4 + 16; // local radius incl. glow margin
      const size = Math.ceil(half * 2);
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(size * dpr));
      off.height = Math.max(1, Math.round(size * dpr));
      const octx = off.getContext("2d");
      octx.scale(dpr, dpr);
      octx.translate(half, half);

      // 1. Soft elliptical halo (blue-violet glow aligned with the disk)
      const rx = g.haloRx;
      const ry = g.haloRy;
      if (rx > 0 && ry > 0) {
        octx.save();
        octx.scale(1, ry / rx);
        const halo = octx.createRadialGradient(0, 0, 0, 0, 0, rx);
        halo.addColorStop(0, "rgba(70, 96, 220, 0.42)");
        halo.addColorStop(0.35, "rgba(48, 64, 168, 0.26)");
        halo.addColorStop(0.65, "rgba(28, 36, 86, 0.12)");
        halo.addColorStop(0.88, "rgba(8, 12, 30, 0.04)");
        halo.addColorStop(1, "rgba(8, 12, 30, 0)");
        octx.fillStyle = halo;
        octx.beginPath();
        octx.arc(0, 0, rx, 0, Math.PI * 2);
        octx.fill();
        octx.restore();
      }

      // 2. Warm central bloom — gives the bulge a glowing heart
      octx.globalCompositeOperation = "lighter";
      const bloomR = g.radius * 0.78;
      const bloom = octx.createRadialGradient(0, 0, 0, 0, 0, bloomR);
      bloom.addColorStop(0, "rgba(255, 240, 208, 0.45)");
      bloom.addColorStop(0.3, "rgba(255, 214, 150, 0.18)");
      bloom.addColorStop(0.7, "rgba(216, 150, 90, 0.05)");
      bloom.addColorStop(1, "rgba(216, 150, 90, 0)");
      octx.fillStyle = bloom;
      octx.beginPath();
      octx.arc(0, 0, bloomR, 0, Math.PI * 2);
      octx.fill();

      // 3. All particles, additively blended (bulge → arms → nucleus)
      const order = { bulge: 0.85, arm: 1, nucleus: 1 };
      ["bulge", "arm", "nucleus"].forEach((kind) => {
        const alphaMul = order[kind];
        for (const p of g.particles) {
          if (p.kind !== kind) continue;
          const { x, y } = diskToLocal(p.baseR, p.angle, g.flatten);
          const a = Math.min(1, p.opacity * alphaMul);
          const [r, gg, b] = colors[p.hue] || colors.gold;
          octx.beginPath();
          octx.arc(x, y, p.size, 0, Math.PI * 2);
          octx.fillStyle = `rgba(${r}, ${gg}, ${b}, ${a})`;
          octx.fill();
        }
      });
      octx.globalCompositeOperation = "source-over";

      g.sprite = off;
      g.spriteHalf = half;
    }

    // ─── Circumgalactic gas flows (accretion / outflow / recycling) ──
    const flowColors = {
      accrete: [150, 205, 255], // light blue — inflowing gas
      outflow: [255, 96, 120], // red — bipolar outflow
      recycle: [255, 120, 150], // pink-red — recycled gas
    };

    /** Cubic Bézier point at t. */
    function bezier(p0, p1, p2, p3, t) {
      const mt = 1 - t;
      const a = mt * mt * mt;
      const b = 3 * mt * mt * t;
      const c = 3 * mt * t * t;
      const d = t * t * t;
      return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
      };
    }

    /** Fade particles in/out near the ends of their stream for continuity. */
    function edgeFade(u) {
      return Math.max(0, Math.min(1, u / 0.16, (1 - u) / 0.16));
    }

    /**
     * Build flow streams around a galaxy, in local px (relative to its
     * centre). Shapes follow the canonical CGM diagram: blue accretion
     * spirals in, red outflows shoot out bipolar, red fountains recycle.
     */
    function buildFlows(g) {
      const R = g.radius;
      const S = (x, y) => ({ x: x * R, y: y * R });

      // Width/alpha profiles along a stream (t: 0 = at galaxy → 1 = far end)
      const taperMid = (t) => 0.35 + 0.65 * Math.sin(Math.PI * t); // wispy both ends
      const widenOut = (t) => 0.45 + 1.75 * t; // thin at base, thick far out
      const fadeOut = (t) => 1 - 0.62 * t; // dimmer with distance
      const one = () => 1;

      // A cubic-Bézier path helper returning a local(t) function.
      const bezPath = (a, b, c, d) => {
        const p0 = S(a[0], a[1]);
        const p1 = S(b[0], b[1]);
        const p2 = S(c[0], c[1]);
        const p3 = S(d[0], d[1]);
        return (t) => bezier(p0, p1, p2, p3, t);
      };

      const make = (type, local, baseWidth, widthFn, alphaFn, count, speed) => ({
        type,
        local,
        baseWidth: baseWidth * R,
        widthFn,
        alphaFn,
        particles: Array.from({ length: count }, () => ({
          o: Math.random(),
          s: speed * (0.75 + Math.random() * 0.5),
          size: 0.7 + Math.random() * 1.5,
          maxA: 0.4 + Math.random() * 0.35,
        })),
      });

      // ── Accretion: ONE light-blue stream spiralling in from the right ──
      // t=0 far out (upper-right) → t=1 at the galaxy, winding ~0.6 turn.
      const rOut = 1.95, rIn = 0.4, th0 = -0.5, sweep = Math.PI * 1.25;
      const spiral = (t) => {
        const rr = (rIn + (rOut - rIn) * Math.pow(1 - t, 1.3)) * R;
        const th = th0 + sweep * t;
        return { x: rr * Math.cos(th), y: rr * Math.sin(th) * 0.82 };
      };

      flowStreams = [
        make("accrete", spiral, 0.24, (t) => 0.4 + 0.6 * Math.sin(Math.PI * Math.min(t * 1.05, 1)), one, 30, 0.06),

        // ── Outflow: one thick plume up, one down — widen + fade outward ──
        make("outflow", bezPath([0.0, -0.12], [0.06, -0.7], [-0.06, -1.3], [0.05, -1.95]), 0.3, widenOut, fadeOut, 26, 0.1),
        make("outflow", bezPath([-0.02, 0.12], [-0.08, 0.7], [0.05, 1.3], [-0.04, 1.95]), 0.3, widenOut, fadeOut, 26, 0.1),

        // ── Recycling: red fountains that arc out and fall back in ──
        make("recycle", bezPath([-0.05, -0.06], [-1.15, -1.0], [-1.5, -0.05], [-0.45, 0.2]), 0.24, taperMid, one, 20, 0.062),
        make("recycle", bezPath([0.08, -0.1], [1.05, -1.35], [1.6, -0.35], [0.45, 0.04]), 0.22, taperMid, one, 20, 0.06),
      ];

      bakeFlowSprite(g);
    }

    /**
     * Bake all gas ribbons into ONE blurred offscreen sprite. The cloud is
     * built from overlapping soft radial blobs along each Bézier, then a
     * Gaussian blur is applied — so the gas has no hard edges at all.
     * Only the moving particles are drawn live on top.
     */
    function bakeFlowSprite(g) {
      if (!flowStreams.length) return;

      // Bounding box from sampled curve points + gas half-width margin.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let maxW = 0;
      flowStreams.forEach((s) => {
        for (let t = 0; t <= 1.0001; t += 0.05) {
          const pt = s.local(t);
          const w = s.baseWidth * s.widthFn(t);
          if (w > maxW) maxW = w;
          if (pt.x - w < minX) minX = pt.x - w;
          if (pt.x + w > maxX) maxX = pt.x + w;
          if (pt.y - w < minY) minY = pt.y - w;
          if (pt.y + w > maxY) maxY = pt.y + w;
        }
      });
      const blurPx = Math.max(8, g.radius * 0.06);
      const margin = maxW * 0.8 + blurPx * 2.5;
      minX -= margin; minY -= margin; maxX += margin; maxY += margin;

      flowSpriteX = minX;
      flowSpriteY = minY;
      const w = Math.ceil(maxX - minX);
      const h = Math.ceil(maxY - minY);

      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w * dpr));
      off.height = Math.max(1, Math.round(h * dpr));
      const octx = off.getContext("2d");
      octx.scale(dpr, dpr);
      octx.translate(-minX, -minY); // galaxy centre → local origin
      octx.filter = `blur(${blurPx}px)`;

      flowStreams.forEach((s) => {
        const [r, gg, b] = flowColors[s.type];
        const steps = 34;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const pt = s.local(t);
          const rad = Math.max(1, s.baseWidth * s.widthFn(t));
          const am = s.alphaFn(t); // alpha multiplier along the stream
          const grad = octx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);
          grad.addColorStop(0, `rgba(${r}, ${gg}, ${b}, ${0.06 * am})`);
          grad.addColorStop(0.6, `rgba(${r}, ${gg}, ${b}, ${0.025 * am})`);
          grad.addColorStop(1, `rgba(${r}, ${gg}, ${b}, 0)`);
          octx.fillStyle = grad;
          octx.beginPath();
          octx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          octx.fill();
        }
      });
      octx.filter = "none";

      flowSprite = off;
    }

    function drawFlows(g, elapsed) {
      if (!flowStreams.length) return;
      const gx = g.cx + cosmosParallax.x * g.parallaxFactor;
      const gy = g.cy + cosmosParallax.y * g.parallaxFactor;
      const speed = flowSpeedScale();

      // 1. Blurred, edgeless gas cloud (baked once) blitted around galaxy.
      if (flowSprite) {
        ctx.drawImage(
          flowSprite,
          gx + flowSpriteX,
          gy + flowSpriteY,
          flowSprite.width / dpr,
          flowSprite.height / dpr
        );
      }

      // 2. Live flowing particles, additively blended for a soft glow.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      flowStreams.forEach((stream) => {
        const [r, gg, b] = flowColors[stream.type];

        stream.particles.forEach((p) => {
          const u = (p.o + elapsed * p.s * speed) % 1;
          const local = stream.local(u);
          const x = local.x + gx;
          const y = local.y + gy;
          const a = edgeFade(u) * p.maxA * stream.alphaFn(u);
          if (a <= 0.01) return;
          // Clumps grow with the plume; soft-edged radial gradient, no rim.
          const sz = p.size * (0.7 + 0.5 * stream.widthFn(u)) * 2.2;
          const grad = ctx.createRadialGradient(x, y, 0, x, y, sz);
          grad.addColorStop(0, `rgba(${r}, ${gg}, ${b}, ${a})`);
          grad.addColorStop(1, `rgba(${r}, ${gg}, ${b}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.restore();
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (now - animStart) / 1000;

      // Gas flows render behind the galaxy disk so it stays crisp on top.
      if (galaxies[1] && galaxies[1].sprite) {
        drawFlows(galaxies[1], elapsed);
      }

      galaxies.forEach((g) => {
        if (!g.sprite) return;
        const rotation = g.rotationOffset + elapsed * g.rotSpeed;
        const px = g.cx + cosmosParallax.x * g.parallaxFactor;
        const py = g.cy + cosmosParallax.y * g.parallaxFactor;
        const d = g.spriteHalf * 2;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rotation);
        ctx.drawImage(g.sprite, -g.spriteHalf, -g.spriteHalf, d, d);
        ctx.restore();
      });

      animationId = requestAnimationFrame(draw);
    }

    function startLoop() {
      cancelAnimationFrame(animationId);
      animStart = performance.now();
      animationId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    startLoop();
    motionQuery.addEventListener("change", () => {
      resize();
      startLoop();
    });

    return () => cancelAnimationFrame(animationId);
  }

  // ─── Starfield Canvas ───────────────────────────────────────────
  function initStarfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let stars = [];
    let supernovae = [];
    let nextNovaAt = 4; // first explosion ~4s after load
    let width, height, animationId;
    let starAnimStart = performance.now();

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const mobile = width < 768;
      const reduced = prefersReducedMotion();
      const count = Math.floor(((width * height) / 900) * (mobile ? 0.85 : 1));

      stars = Array.from({ length: count }, () => {
        const roll = Math.random();
        const depth = Math.random();

        // ~18% strong twinklers, ~35% medium, rest subtle background
        let baseR, minAlpha, maxAlpha, twinkleSpeed, glow, warm;

        if (roll < 0.18) {
          baseR = 1.2 + Math.random() * 1.4;
          minAlpha = reduced ? 0.25 : 0.08;
          maxAlpha = 1;
          twinkleSpeed = (1.4 + Math.random() * 1.6) * (reduced ? 0.5 : 1);
          glow = true;
          warm = Math.random() < 0.35;
        } else if (roll < 0.53) {
          baseR = 0.5 + depth * 1.1;
          minAlpha = reduced ? 0.2 : 0.12;
          maxAlpha = 0.55 + Math.random() * 0.4;
          twinkleSpeed = (0.9 + Math.random() * 1.2) * (reduced ? 0.5 : 1);
          glow = false;
          warm = Math.random() < 0.18;
        } else {
          baseR = 0.2 + depth * 0.75;
          minAlpha = 0.15 + depth * 0.2;
          maxAlpha = 0.35 + depth * 0.25;
          twinkleSpeed = (0.6 + Math.random() * 0.8) * (reduced ? 0.5 : 1);
          glow = false;
          warm = false;
        }

        return {
          x: Math.random() * width,
          y: Math.random() * height,
          baseR,
          minAlpha,
          maxAlpha,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed,
          glow,
          warm,
        };
      });
    }

    // ─── Supernovae: a random star explodes, leaving a colourful nebula ──
    const NOVA_INTERVAL = 20; // seconds between explosions
    const NOVA_LIFE = 11; // total seconds a remnant lives (≈10s nebula + fade)
    const novaPalettes = [
      [[255, 90, 160], [120, 90, 255], [90, 200, 255]], // magenta · violet · cyan
      [[120, 230, 255], [90, 140, 255], [180, 120, 255]], // cyan · blue · violet
      [[255, 170, 80], [255, 90, 130], [180, 120, 255]], // amber · rose · violet
      [[120, 255, 200], [90, 200, 255], [200, 130, 255]], // teal · cyan · lilac
      [[255, 120, 90], [255, 80, 160], [120, 120, 255]], // coral · pink · indigo
    ];

    /** Random lumpiness params so each remnant has an irregular outline. */
    function makeLump() {
      const tau = Math.PI * 2;
      return {
        a1: 0.1 + Math.random() * 0.13, p1: Math.random() * tau,
        a2: 0.08 + Math.random() * 0.11, p2: Math.random() * tau,
        a3: 0.05 + Math.random() * 0.08, p3: Math.random() * tau,
      };
    }

    /** Angular radius modulation (1 ± wobble) for non-circular shapes. */
    function lumpFactor(ang, l) {
      return (
        1 +
        l.a1 * Math.sin(ang * 2 + l.p1) +
        l.a2 * Math.sin(ang * 3 + l.p2) +
        l.a3 * Math.sin(ang * 5 + l.p3)
      );
    }

    /**
     * Pre-render a small, blurred, IRREGULAR HOLLOW nebula shell: coloured
     * lobes scattered around a ring (hollow centre = cavity) with random
     * gaps, then feathered to a circle so the sprite has no square edge.
     * Returns { canvas, half } — half is the sprite's centre offset (px).
     */
    function bakeNebula(maxR, palette, lump) {
      const pad = maxR * 0.6;
      const half = maxR + pad;
      const size = Math.ceil(half * 2);
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const o = off.getContext("2d");
      o.translate(half, half);
      o.filter = `blur(${Math.max(4, maxR * 0.18)}px)`;

      // Lobes around a wobbly ring; some skipped → broken, not a full circle.
      const lobes = 13;
      for (let i = 0; i < lobes; i++) {
        if (Math.random() < 0.22) continue;
        const col = palette[i % palette.length];
        const baseAng = (i / lobes) * Math.PI * 2;
        const ang = baseAng + (Math.random() - 0.5) * 0.45;
        const ringR = maxR * 0.62 * lumpFactor(baseAng, lump) * (0.85 + Math.random() * 0.3);
        const lx = Math.cos(ang) * ringR;
        const ly = Math.sin(ang) * ringR;
        const lr = maxR * (0.2 + Math.random() * 0.26);
        const a = 0.22 + Math.random() * 0.16;
        const grad = o.createRadialGradient(lx, ly, 0, lx, ly, lr);
        grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a})`);
        grad.addColorStop(0.6, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${a * 0.4})`);
        grad.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
        o.fillStyle = grad;
        o.beginPath();
        o.arc(lx, ly, lr, 0, Math.PI * 2);
        o.fill();
      }
      o.filter = "none";

      // Feather to a circle so no square sprite boundary is ever visible.
      o.globalCompositeOperation = "destination-in";
      const maskR = maxR + pad * 0.7;
      const mask = o.createRadialGradient(0, 0, 0, 0, 0, maskR);
      mask.addColorStop(0, "rgba(0,0,0,1)");
      mask.addColorStop(0.78, "rgba(0,0,0,1)");
      mask.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = mask;
      o.beginPath();
      o.arc(0, 0, maskR, 0, Math.PI * 2);
      o.fill();
      o.globalCompositeOperation = "source-over";

      return { canvas: off, half };
    }

    /** Detonate a random star: flash now, then a fading nebula remnant. */
    function spawnSupernova(elapsed) {
      let x = Math.random() * width;
      let y = Math.random() * height;
      if (stars.length) {
        const s = stars[(Math.random() * stars.length) | 0];
        x = s.x;
        y = s.y;
      }
      const mobile = width < 768;
      const maxR = (mobile ? 13 : 18) + Math.random() * (mobile ? 9 : 14); // ≈¼ of before
      const palette = novaPalettes[(Math.random() * novaPalettes.length) | 0];
      const lump = makeLump();
      const neb = bakeNebula(maxR, palette, lump);
      supernovae.push({
        x,
        y,
        start: elapsed,
        half: neb.half,
        lump,
        flashColor: palette[Math.random() < 0.5 ? 2 : 0],
        sprite: neb.canvas,
      });
    }

    /** Nebula opacity: rise (~2s) → hold → fade out by NOVA_LIFE. */
    function nebulaAlpha(age) {
      if (age < 0.4) return 0;
      if (age < 2.0) return (age - 0.4) / 1.6;
      if (age < 6.0) return 1;
      if (age < NOVA_LIFE) return 1 - (age - 6.0) / (NOVA_LIFE - 6.0);
      return 0;
    }

    function drawSupernova(n, elapsed) {
      const age = elapsed - n.start;
      // Continuous outward expansion — the hollow cavity keeps extending.
      const grow = 0.4 + 1.0 * Math.pow(Math.min(age / NOVA_LIFE, 1), 0.6);

      // 1. Irregular hollow nebula shell (baked sprite; expands, then fades).
      const na = nebulaAlpha(age);
      if (na > 0.01) {
        const r = n.half * grow;
        ctx.save();
        ctx.globalAlpha = na;
        ctx.drawImage(n.sprite, n.x - r, n.y - r, r * 2, r * 2);
        ctx.restore();
      }

      // 2. Explosion flash + irregular, broken shockwave (first ~1.5s).
      if (age < 1.5) {
        const [fr, fg, fb] = n.flashColor;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";

        // Bright core flash, fading fast and leaving a cavity behind.
        const cAlpha = Math.max(0, 1 - age / 0.55);
        if (cAlpha > 0) {
          const cr = n.half * (0.15 + 0.5 * Math.min(1, age / 0.22));
          const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, cr);
          cg.addColorStop(0, `rgba(255, 255, 250, ${0.9 * cAlpha})`);
          cg.addColorStop(0.4, `rgba(${fr}, ${fg}, ${fb}, ${0.55 * cAlpha})`);
          cg.addColorStop(1, `rgba(${fr}, ${fg}, ${fb}, 0)`);
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(n.x, n.y, cr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Lumpy, broken shockwave — not a perfect circle.
        const sp = age / 1.5; // 0 → 1
        const baseR = n.half * (0.25 + 1.2 * sp);
        const ringA = Math.max(0, 1 - sp) * 0.75;
        if (ringA > 0.01) {
          ctx.strokeStyle = "rgba(255, 250, 240, 1)";
          ctx.lineWidth = 2.2 * (1 - sp) + 0.5;
          const N = 46;
          let prev = null;
          for (let i = 0; i <= N; i++) {
            const ang = (i / N) * Math.PI * 2;
            const rr = baseR * lumpFactor(ang, n.lump);
            const px = n.x + Math.cos(ang) * rr;
            const py = n.y + Math.sin(ang) * rr;
            const vis = 0.5 + 0.5 * Math.sin(ang * 3 + n.lump.p1); // angular gaps
            if (prev && vis > 0.3) {
              ctx.globalAlpha = ringA * Math.min(1, vis * 1.3);
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(px, py);
              ctx.stroke();
            }
            prev = { x: px, y: py };
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (performance.now() - starAnimStart) / 1000;

      // Trigger one supernova every NOVA_INTERVAL seconds.
      if (elapsed >= nextNovaAt) {
        spawnSupernova(elapsed);
        nextNovaAt += NOVA_INTERVAL;
      }

      // Remnants render behind the stars so the field still sparkles in front.
      supernovae = supernovae.filter((n) => elapsed - n.start < NOVA_LIFE);
      supernovae.forEach((n) => drawSupernova(n, elapsed));

      stars.forEach((s) => {
        const wave = 0.5 + 0.5 * Math.sin(elapsed * s.twinkleSpeed + s.phase);
        const alpha = s.minAlpha + (s.maxAlpha - s.minAlpha) * wave;
        const radius = s.baseR * (0.75 + 0.25 * wave);
        const [cr, cg, cb] = s.warm ? [255, 235, 190] : [245, 247, 255];

        ctx.save();
        if (s.glow && alpha > 0.45) {
          ctx.shadowBlur = 4 + 10 * wave;
          ctx.shadowColor = `rgba(255, 245, 220, ${alpha * 0.85})`;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();
        ctx.restore();
      });

      animationId = requestAnimationFrame(draw);
    }

    function startStarLoop() {
      cancelAnimationFrame(animationId);
      starAnimStart = performance.now();
      supernovae = [];
      nextNovaAt = 4;
      animationId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    startStarLoop();

    motionQuery.addEventListener("change", () => {
      resize();
      startStarLoop();
    });

    return () => cancelAnimationFrame(animationId);
  }

  // ─── Parallax on mouse move ─────────────────────────────────────
  function initParallax() {
    if (prefersReducedMotion()) return;

    const nebulae = document.querySelectorAll(".nebula");
    const dust = document.getElementById("parallax-dust");
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener("mousemove", (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = (e.clientX - cx) / cx;
      targetY = (e.clientY - cy) / cy;
    });

    function animate() {
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      cosmosParallax.x = currentX;
      cosmosParallax.y = currentY;

      nebulae.forEach((el, i) => {
        const factor = (i + 1) * 12;
        el.style.transform = `translate(${currentX * factor}px, ${currentY * factor}px)`;
      });
      if (dust) {
        dust.style.transform = `translate(${currentX * 6}px, ${currentY * 6}px)`;
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ─── Header scroll state ────────────────────────────────────────
  function initHeader() {
    const header = document.getElementById("site-header");
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-links a[data-scroll], .nav-logo");

    function onScroll() {
      header.classList.toggle("scrolled", window.scrollY > 40);

      let current = "";
      sections.forEach((sec) => {
        const top = sec.offsetTop - 120;
        if (window.scrollY >= top) current = sec.id;
      });
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("active", href === `#${current}`);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ─── Smooth scroll & mobile nav ─────────────────────────────────
  function initNavigation() {
    const toggle = document.getElementById("nav-toggle");
    const navLinks = document.getElementById("nav-links");

    document.querySelectorAll("[data-scroll]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const href = el.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
          navLinks?.classList.remove("open");
          toggle?.classList.remove("open");
          toggle?.setAttribute("aria-expanded", "false");
        }
      });
    });

    toggle?.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // ─── Scroll reveal ──────────────────────────────────────────────
  function initReveal() {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  }

  // ─── Footer year ────────────────────────────────────────────────
  function initFooter() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  // ─── Publications & citations (ADS JSON) ────────────────────────
  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  const MAX_DISPLAY_AUTHORS = 6;

  function formatAuthors(authors) {
    const list = authors || [];
    if (list.length === 0) return "";
    const shown = list.slice(0, MAX_DISPLAY_AUTHORS);
    const text = shown.join(", ");
    return list.length > MAX_DISPLAY_AUTHORS ? `${text}, et al.` : text;
  }

  function renderPublications(papers, containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;

    if (!papers || papers.length === 0) {
      list.innerHTML = `<li class="pub-empty">${escapeHtml(t("pub.empty"))}</li>`;
      return;
    }

    list.innerHTML = papers
      .map((p) => {
        const title = p.title || "Untitled";
        const authors = formatAuthors(p.authors);
        const year = p.year || "";
        const journal = p.journal || "";
        const arxiv = p.arxiv_url || (p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : null);
        const doi = p.doi ? `https://doi.org/${p.doi}` : p.doi_url || null;
        const ads = p.bibcode
          ? `https://ui.adsabs.harvard.edu/abs/${p.bibcode}`
          : null;
        const cites =
          p.citation_count != null
            ? `<span class="pub-citations">${escapeHtml(t("pub.citations", { n: p.citation_count }))}</span>`
            : "";

        const links = [
          arxiv ? `<a href="${arxiv}" target="_blank" rel="noopener noreferrer">arXiv</a>` : "",
          doi ? `<a href="${doi}" target="_blank" rel="noopener noreferrer">DOI</a>` : "",
          ads ? `<a href="${ads}" target="_blank" rel="noopener noreferrer">ADS</a>` : "",
        ]
          .filter(Boolean)
          .join("");

        const titleHtml = ads
          ? `<a href="${ads}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
          : escapeHtml(title);

        return `
          <li class="pub-item">
            <h4 class="pub-title">${titleHtml}</h4>
            <p class="pub-meta">${escapeHtml(authors)} · ${year}${journal ? ` · <em>${escapeHtml(journal)}</em>` : ""}</p>
            <div class="pub-links">${links}</div>
            ${cites}
          </li>`;
      })
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  let citationsChart = null;

  /** Normalize legacy or ADS-style JSON into chart payload */
  function normalizeCitations(data) {
    if (data.years && Array.isArray(data.refereed)) {
      return {
        years: data.years.map(String),
        refereed: data.refereed,
        nonrefereed: data.nonrefereed || data.years.map(() => 0),
        first_author: data.first_author ?? 0,
        second_author: data.second_author ?? data.contributing ?? 0,
        time: data.time || data.updated_at || "",
      };
    }

    const byYear = data.citations_by_year || {};
    const years = Object.keys(byYear).sort();
    const refereed = years.map((y) => byYear[y] || 0);
    return {
      years,
      refereed,
      nonrefereed: years.map(() => 0),
      first_author: data.first_author ?? 0,
      second_author: data.second_author ?? data.contributing ?? 0,
      time: data.updated_at || data.time || "",
    };
  }

  function formatCiteDate(timeStr) {
    if (!timeStr) return "—";
    const d = new Date(timeStr);
    return Number.isNaN(d.getTime())
      ? timeStr
      : d.toLocaleDateString(dateLocale(), {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  }

  async function renderCitationsChart(citeDict) {
    const chartEl = document.querySelector("#chart");
    const metaEl = document.getElementById("citations-meta");
    if (!chartEl) return;

    if (typeof ApexCharts === "undefined") {
      if (metaEl) metaEl.textContent = t("pub.chartFail");
      return;
    }

    const years = citeDict.years;
    const refereed = citeDict.refereed;
    const nonrefereed = citeDict.nonrefereed;
    const firstAuthor = citeDict.first_author;
    const secondAuthor = citeDict.second_author;
    const updateTime = citeDict.time;
    const totalCites = refereed.reduce((a, b) => a + b, 0) + nonrefereed.reduce((a, b) => a + b, 0);

    if (metaEl) {
      metaEl.textContent = t("pub.totalCites", {
        total: totalCites,
        date: formatCiteDate(updateTime),
      });
    }

    const chartText = t("pub.chartTitle", {
      first: firstAuthor,
      second: secondAuthor,
    });
    const chartFont =
      SiteI18n?.getLang() === "zh"
        ? '"Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif'
        : "Inter, sans-serif";
    const labelColor = "#aeb7d8";
    const whiteLabels = years.map(() => "#f5f7ff");

    const options = {
      title: {
        text: chartText,
        align: "left",
        margin: 10,
        style: {
          fontSize: "14px",
          fontWeight: "bold",
          color: "#f5f7ff",
          fontFamily: chartFont,
        },
      },
      series: [
        { name: t("pub.chartRefereed"), data: refereed },
        { name: t("pub.chartNonRefereed"), data: nonrefereed },
      ],
      chart: {
        type: "bar",
        height: 350,
        stacked: true,
        background: "transparent",
        foreColor: labelColor,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        zoom: { enabled: false },
        fontFamily: chartFont,
      },
      colors: ["#d8b76a", "#7aa2ff"],
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: { height: 320 },
            legend: { position: "bottom", offsetX: 0, offsetY: 0 },
          },
        },
      ],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 8,
          borderRadiusApplication: "end",
          dataLabels: {
            total: {
              enabled: true,
              style: {
                fontSize: "12px",
                fontWeight: 700,
                color: "#f5f7ff",
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: years,
        labels: {
          style: { fontSize: "12px", colors: whiteLabels },
        },
        axisBorder: { color: "rgba(255,255,255,0.12)" },
        axisTicks: { color: "rgba(255,255,255,0.12)" },
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", colors: [labelColor] },
        },
        title: {
          text: t("pub.chartYaxis"),
          style: { color: "#f5f7ff", fontSize: "12px", fontWeight: 600 },
        },
      },
      grid: {
        borderColor: "rgba(255,255,255,0.08)",
        strokeDashArray: 4,
      },
      legend: {
        position: "right",
        offsetY: 40,
        labels: { colors: "#f5f7ff" },
        markers: { radius: 12 },
      },
      fill: { opacity: 0.92 },
      tooltip: { enabled: false },
      theme: { mode: "dark" },
    };

    if (citationsChart) {
      citationsChart.destroy();
      citationsChart = null;
    }
    chartEl.innerHTML = "";
    citationsChart = new ApexCharts(chartEl, options);
    await citationsChart.render();
  }

  function updatePublicationsTimestamp(pubData) {
    const desc = document.querySelector("#publications .section-desc");
    if (!desc) return;
    if (pubData?.updated_at) {
      desc.innerHTML = t("pub.descUpdated", {
        date: formatCiteDate(pubData.updated_at),
      });
    } else {
      desc.innerHTML = t("pub.desc");
    }
  }

  function renderOtherPublications(othersData) {
    const section = document.getElementById("pub-other-section");
    const papers = othersData?.papers || [];
    if (!section) return;
    if (papers.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    renderPublications(papers, "pub-other-selected");
  }

  async function loadOthersData() {
    try {
      return await loadJSON(`${DATA_BASE}/others.json`);
    } catch (err) {
      console.warn("Failed to load others.json:", err);
      return { papers: [] };
    }
  }

  async function initPublications() {
    const othersData = await loadOthersData();
    cachedOthersData = othersData;

    try {
      const [pubData, citeData] = await Promise.all([
        loadJSON(`${DATA_BASE}/publications.json`),
        loadJSON(`${DATA_BASE}/citations.json`),
      ]);

      cachedPubData = pubData;
      cachedCiteDict = normalizeCitations(citeData);
      renderPublications(pubData.first_author || [], "pub-first-author");
      renderPublications(pubData.second_author || [], "pub-second-author");
      renderOtherPublications(othersData);
      updatePublicationsTimestamp(pubData);
      await renderCitationsChart(cachedCiteDict);
    } catch (err) {
      console.warn("Using embedded fallback publication data:", err);
      await renderFallbackPublications();
      renderOtherPublications(othersData);
    }
  }

  async function renderFallbackPublications() {
    const fallback = {
      first_author: [
        {
          title: "The Assembly of Disk Galaxies at Cosmic Noon",
          authors: ["Your Name", "Collaborator, A.", "Collaborator, B."],
          year: 2024,
          journal: "The Astrophysical Journal",
          arxiv_id: "2401.00001",
          doi: "10.3847/placeholder",
          bibcode: "2024ApJ...000..000Y",
          citation_count: 12,
        },
        {
          title: "Star Formation Laws in High-redshift Galaxies",
          authors: ["Your Name", "Collaborator, C."],
          year: 2023,
          journal: "Monthly Notices of the Royal Astronomical Society",
          arxiv_id: "2306.00002",
          doi: "10.1093/mnras/placeholder",
          bibcode: "2023MNRAS.000..000Y",
          citation_count: 28,
        },
      ],
      second_author: [
        {
          title: "Cosmic Web Tomography with Deep Imaging Surveys",
          authors: ["Lead Author, D.", "Your Name", "Collaborator, E."],
          year: 2023,
          journal: "Astronomy & Astrophysics",
          arxiv_id: "2303.00003",
          doi: "10.1051/0004-6361/placeholder",
          bibcode: "2023A&A...000..000L",
          citation_count: 45,
        },
      ],
    };
    const citeFallback = {
      years: ["2019", "2020", "2021", "2022", "2023", "2024", "2025"],
      refereed: [4, 10, 20, 32, 45, 55, 16],
      nonrefereed: [1, 2, 4, 6, 7, 6, 2],
      first_author: 2,
      second_author: 1,
      time: new Date().toISOString(),
    };

    renderPublications(fallback.first_author, "pub-first-author");
    renderPublications(fallback.second_author, "pub-second-author");
    await renderCitationsChart(citeFallback);

    const metaEl = document.getElementById("citations-meta");
    if (metaEl) {
      metaEl.textContent += " (placeholder — run GitHub Action after setting ADS_TOKEN)";
    }
  }

  // Re-render ApexCharts on resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => initPublications(), 250);
  });

  // ─── CV PDF viewer modal ─────────────────────────────────────────
  function initCvViewer() {
    const CV_PDF = "assets/CV.pdf";
    const modal = document.getElementById("cv-modal");
    const openBtn = document.getElementById("cv-view-btn");
    const frame = document.getElementById("cv-pdf-frame");
    if (!modal || !openBtn || !frame) return;

    let lastFocus = null;

    function openModal() {
      lastFocus = document.activeElement;
      frame.src = CV_PDF;
      modal.hidden = false;
      modal.classList.add("is-open");
      document.body.classList.add("cv-modal-open");
      modal.querySelector(".cv-modal-close")?.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.hidden = true;
      document.body.classList.remove("cv-modal-open");
      frame.removeAttribute("src");
      lastFocus?.focus();
    }

    openBtn.addEventListener("click", openModal);
    modal.querySelectorAll("[data-cv-close]").forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  function refreshDynamicI18n() {
    if (cachedPubData) {
      renderPublications(cachedPubData.first_author || [], "pub-first-author");
      renderPublications(cachedPubData.second_author || [], "pub-second-author");
      updatePublicationsTimestamp(cachedPubData);
    }
    if (cachedOthersData) renderOtherPublications(cachedOthersData);
    if (cachedCiteDict) renderCitationsChart(cachedCiteDict);
  }

  window.addEventListener("siteLangChange", refreshDynamicI18n);

  // ─── Init ───────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof SiteI18n !== "undefined") SiteI18n.initI18n();
    initGalaxyField();
    initStarfield();
    initParallax();
    initHeader();
    initNavigation();
    initReveal();
    initFooter();
    initPublications();
    initCvViewer();
  });
})();
