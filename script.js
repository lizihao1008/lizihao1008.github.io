/**
 * Astronomy Academic Homepage
 * Starfield, parallax, navigation, scroll reveal, ADS publications
 */

(function () {
  "use strict";

  const DATA_BASE = "data";
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => motionQuery.matches;

  /** Shared parallax offset for background layers (-1 … 1) */
  const cosmosParallax = { x: 0, y: 0 };

  // ─── Galaxy particle field ──────────────────────────────────────
  function initGalaxyField() {
    const canvas = document.getElementById("galaxy-field");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width, height, minDim, animationId;
    let galaxies = [];
    let animStart = performance.now();

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
        rotSpeed: prefersReducedMotion() ? 0 : (config.rotSpeed ?? 0.1),
        nucleusOffset: config.nucleusOffset ?? 0.2,
        parallaxFactor: config.parallaxFactor || 18,
        particles: [...bulge, ...core, ...arms, ...nucleus],
      };
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      minDim = Math.min(width, height);
      animStart = performance.now();

      const density = width < 768 ? 0.55 : 1;
      galaxies = [
        buildGalaxy({
          cx: 0.78,
          cy: 0.22,
          radius: 0.15,
          count: Math.floor(2000 * density),
          arms: 6,
          armWidth: 0.4,
          bulgeCount: 2000,
          coreCount: 1000,
          rotSpeed: 0.4,
          tightness: 0.64,
          flatten: 0.6,
          parallaxFactor: 22,
        }),
        buildGalaxy({
          cx: 0.18,
          cy: 0.72,
          radius: 0.22,
          count: Math.floor(1500 * density),
          arms: 6,
          armWidth: 0.2,
          bulgeCount: 1000,
          coreCount: 300,
          rotSpeed: -0.01,
          tightness: 0.6,
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
          bulgeCount: 500,
          coreCount: 200,
          rotSpeed: 0.12,
          tightness: 0.8,
          flatten: 0.4,
          parallaxFactor: 8,
        }),
      ];
    }

    const colors = {
      core: [255, 248, 220],
      warm: [255, 220, 160],
      gold: [255, 210, 130],
      purple: [200, 160, 255],
      blue: [122, 162, 255],
    };

    /** Same disk mapping as spiral arms: (r, θ) → flattened ellipse */
    function diskToWorld(px, py, r, angle, rotation, flatten) {
      const a = angle + rotation;
      return {
        x: px + r * Math.cos(a),
        y: py + r * Math.sin(a) * flatten,
      };
    }

    function drawParticle(p, x, y, alphaMul) {
      const a = Math.min(1, p.opacity * alphaMul);
      const [r, g, b] = colors[p.hue] || colors.gold;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
      ctx.fill();
    }

    /**
     * Dark elliptical halo — matches disk via scale(1, ry/rx) + same rotation as arms.
     * Kept subtle so foreground text stays readable.
     */
    function drawEllipticalHalo(g, px, py, rotation) {
      const rx = g.haloRx;
      const ry = g.haloRy;
      if (rx <= 0 || ry <= 0) return;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rotation);
      ctx.scale(1, ry / rx);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, "rgba(26, 54, 195, 0.5)");
      grad.addColorStop(0.35, "rgba(36, 57, 147, 0.32)");
      grad.addColorStop(0.65, "rgba(18, 24, 52, 0.14)");
      grad.addColorStop(0.88, "rgba(5, 8, 22, 0.05)");
      grad.addColorStop(1, "rgba(5, 8, 22, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDiskParticle(p, px, py, rotation, flatten, alphaMul) {
      const { x, y } = diskToWorld(px, py, p.baseR, p.angle, rotation, flatten);
      drawParticle(p, x, y, alphaMul);
    }

    function drawGalaxy(g, px, py, rotation) {
      // 1. Dark elliptical halo (aligned with disk)
      drawEllipticalHalo(g, px, py, rotation);

      // 2. Gaussian bulge + core
      g.particles
        .filter((p) => p.kind === "bulge")
        .forEach((p) => drawDiskParticle(p, px, py, rotation, g.flatten, 0.85));

      // 3. Spiral arms
      g.particles
        .filter((p) => p.kind === "arm")
        .forEach((p) => drawDiskParticle(p, px, py, rotation, g.flatten, 1));

      // 4. Nucleus
      g.particles
        .filter((p) => p.kind === "nucleus")
        .forEach((p) => drawDiskParticle(p, px, py, rotation, g.flatten, 1));
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (now - animStart) / 1000;

      galaxies.forEach((g) => {
        const rotation = g.rotationOffset + elapsed * g.rotSpeed;
        const px = g.cx + cosmosParallax.x * g.parallaxFactor;
        const py = g.cy + cosmosParallax.y * g.parallaxFactor;
        drawGalaxy(g, px, py, rotation);
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
    let meteors = [];
    let width, height, animationId;
    let starAnimStart = performance.now();

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const mobile = width < 768;
      const reduced = prefersReducedMotion();
      const count = Math.floor(((width * height) / 3200) * (mobile ? 0.75 : 1));

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

    function spawnMeteor() {
      if (Math.random() > 0.0025) return;

      const speed = 5 + Math.random() * 9;
      const len = 70 + Math.random() * 120;
      const opacity = 0.45 + Math.random() * 0.45;
      const fromLeft = Math.random() < 0.35;

      let x, y, vx, vy;
      if (fromLeft) {
        x = -30 - Math.random() * 80;
        y = Math.random() * height * 0.55;
        const angle = Math.PI / 6 + Math.random() * (Math.PI / 5);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else {
        x = Math.random() * width;
        y = -30 - Math.random() * 60;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 4);
        vx = Math.cos(angle) * speed * 0.85;
        vy = Math.sin(angle) * speed;
      }

      meteors.push({ x, y, vx, vy, len, opacity });
    }

    function drawMeteor(m) {
      const spd = Math.hypot(m.vx, m.vy) || 1;
      const tx = m.x - (m.vx / spd) * m.len;
      const ty = m.y - (m.vy / spd) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 245, 220, ${m.opacity})`);
      grad.addColorStop(0.35, `rgba(216, 183, 106, ${m.opacity * 0.65})`);
      grad.addColorStop(1, "rgba(216, 183, 106, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 235, ${m.opacity})`;
      ctx.fill();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const elapsed = (performance.now() - starAnimStart) / 1000;

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

      spawnMeteor();
      meteors = meteors.filter((m) => {
        m.x += m.vx;
        m.y += m.vy;
        drawMeteor(m);
        return (
          m.x > -120 &&
          m.x < width + 120 &&
          m.y > -120 &&
          m.y < height + 120
        );
      });

      animationId = requestAnimationFrame(draw);
    }

    function startStarLoop() {
      cancelAnimationFrame(animationId);
      starAnimStart = performance.now();
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

  function renderPublications(papers, containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;

    if (!papers || papers.length === 0) {
      list.innerHTML = '<li class="pub-empty">No publications listed yet.</li>';
      return;
    }

    list.innerHTML = papers
      .map((p) => {
        const title = p.title || "Untitled";
        const authors = (p.authors || []).join(", ");
        const year = p.year || "";
        const journal = p.journal || "";
        const arxiv = p.arxiv_url || (p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : null);
        const doi = p.doi ? `https://doi.org/${p.doi}` : p.doi_url || null;
        const ads = p.bibcode
          ? `https://ui.adsabs.harvard.edu/abs/${p.bibcode}`
          : null;
        const cites = p.citation_count != null ? `<span class="pub-citations">${p.citation_count} citations</span>` : "";

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
        contributing: data.contributing ?? data.second_author ?? 0,
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
      contributing: data.contributing ?? 0,
      time: data.updated_at || data.time || "",
    };
  }

  function formatCiteDate(timeStr) {
    if (!timeStr) return "—";
    const d = new Date(timeStr);
    return Number.isNaN(d.getTime())
      ? timeStr
      : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  async function renderCitationsChart(citeDict) {
    const chartEl = document.querySelector("#chart");
    const metaEl = document.getElementById("citations-meta");
    if (!chartEl) return;

    if (typeof ApexCharts === "undefined") {
      if (metaEl) metaEl.textContent = "Chart library failed to load.";
      return;
    }

    const years = citeDict.years;
    const refereed = citeDict.refereed;
    const nonrefereed = citeDict.nonrefereed;
    const firstAuthor = citeDict.first_author;
    const contributing = citeDict.contributing;
    const updateTime = citeDict.time;
    const totalCites = refereed.reduce((a, b) => a + b, 0) + nonrefereed.reduce((a, b) => a + b, 0);

    if (metaEl) {
      metaEl.textContent = `Total citations: ${totalCites} · Last updated: ${formatCiteDate(updateTime)}`;
    }

    const chartText = `First-author: ${firstAuthor}, Co-author: ${contributing}`;
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
          fontFamily: "Inter, sans-serif",
        },
      },
      series: [
        { name: "Refereed", data: refereed },
        { name: "Non-refereed", data: nonrefereed },
      ],
      chart: {
        type: "bar",
        height: 350,
        stacked: true,
        background: "transparent",
        foreColor: labelColor,
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
        zoom: { enabled: false },
        fontFamily: "Inter, sans-serif",
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
          text: "Citations",
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

  async function initPublications() {
    try {
      const [pubData, citeData] = await Promise.all([
        loadJSON(`${DATA_BASE}/publications.json`),
        loadJSON(`${DATA_BASE}/citations.json`),
      ]);

      renderPublications(pubData.first_author || [], "pub-first-author");
      renderPublications(pubData.second_author || [], "pub-second-author");
      await renderCitationsChart(normalizeCitations(citeData));
    } catch (err) {
      console.warn("Using embedded fallback publication data:", err);
      await renderFallbackPublications();
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
      contributing: 1,
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

  // ─── Init ───────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    initGalaxyField();
    initStarfield();
    initParallax();
    initHeader();
    initNavigation();
    initReveal();
    initFooter();
    initPublications();
  });
})();
