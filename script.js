/**
 * Astronomy Academic Homepage
 * Navigation, scroll reveal, ADS publications
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
    const css = getComputedStyle(document.documentElement);
    const token = (name) => css.getPropertyValue(name).trim();
    const inkColor = token("--ink");
    const labelColor = token("--ink-muted");
    const lineColor = token("--line");
    const yearLabels = years.map(() => inkColor);

    const options = {
      title: {
        text: chartText,
        align: "left",
        margin: 10,
        style: {
          fontSize: "14px",
          fontWeight: "bold",
          color: inkColor,
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
      colors: [token("--azurite"), token("--ochre")],
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
          borderRadius: 2,
          borderRadiusApplication: "end",
          dataLabels: {
            total: {
              enabled: true,
              style: {
                fontSize: "12px",
                fontWeight: 700,
                color: inkColor,
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
          style: { fontSize: "12px", colors: yearLabels },
        },
        axisBorder: { color: lineColor },
        axisTicks: { color: lineColor },
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", colors: [labelColor] },
        },
        title: {
          text: t("pub.chartYaxis"),
          style: { color: inkColor, fontSize: "12px", fontWeight: 600 },
        },
      },
      grid: {
        borderColor: lineColor,
        strokeDashArray: 4,
      },
      legend: {
        position: "right",
        offsetY: 40,
        labels: { colors: inkColor },
        markers: { radius: 12 },
      },
      fill: { opacity: 0.85 },
      tooltip: { enabled: false },
      theme: { mode: "light" },
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
    initHeader();
    initNavigation();
    initReveal();
    initFooter();
    initPublications();
    initCvViewer();
  });
})();
