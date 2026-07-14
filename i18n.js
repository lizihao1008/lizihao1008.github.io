/**
 * Site i18n — default English, optional 中文
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "site-lang";
  const DEFAULT_LANG = "en";

  const I18N = {
    en: {
      meta: {
        title: "Zihao Li · Astronomy",
        description:
          "Personal academic homepage — Astronomy Ph.D. researcher studying the cosmos.",
      },
      lang: { toZh: "中文", toEn: "EN" },
      nav: {
        menu: "Main navigation",
        toggle: "Toggle menu",
        scrollDown: "Scroll down",
        switchToZh: "Switch to Chinese",
        switchToEn: "Switch to English",
        home: "Home",
        about: "About",
        research: "Research",
        publications: "Publications",
        cv: "CV",
        contact: "Contact",
      },
      hero: {
        tagline: "「Your silence is that of a star」",
        subtitle: "Astronomer · Observer of the Cosmos",
        desc: "I study the origin, structure, and evolution of the Universe.",
        viewResearch: "View Research",
        downloadCv: "Download CV",
      },
      about: {
        label: "About",
        title: "About Me",
        lead:
          "I'm currently a PhD student at Cosmic DAWN Center, Niels Bohr Institute, University of Copenhagen. I'm actively engaged in data reduction for JWST NIRCam/NIRISS WFSS. At Cosmic DAWN Center, I'm working with Lise Christensen and Koki Kakichi, focusing on COSMOS-3D survey. At Copenhagen, I study the first generation of stars and the reionization of the Universe. I received my Master degree at Department of Astronomy, Tsinghua University, advised by Prof. Zheng Cai. Prior to that, I earned my Bachelor's degree with honors in Aerospace Engineering from the School of Aeronautics and Astronautics at Sichuan University.",
        p2:
          "Since my earliest memories, I have looked up at the stars. Along the path of academic pursuit, I have been blessed with the support of many people, to whom I am deeply grateful.",
        photoAlt: "Portrait of Zihao Li",
        name: "Name",
        nameVal: "黎子豪 / Zihao Li",
        role: "Title",
        roleVal: "Ph.D. student in Astronomy",
        affiliation: "Affiliation",
        affiliationVal: "Niels Bohr Institute, University of Copenhagen",
        research: "Research",
        researchVal:
          "Galaxy formation · High-z galaxies · Reionization · Cosmic Web",
      },
      research: {
        label: "Research",
        title: "Research Interests",
        c1Title: "Galaxy Formation and Evolution",
        c1Desc:
          "How galaxies form, grow, and transform across cosmic time.",
        c2Title: "High-redshift Universe",
        c2Desc:
          "Distant galaxies and the first structures in the early Universe.",
        c3Title: "Cosmological Simulations",
        c3Desc:
          "Numerical models of dark matter, gas, and galaxies.",
        c4Title: "Observational Astronomy",
        c4Desc:
          "Telescope data, spectroscopy, imaging, and multi-wavelength analysis.",
      },
      pub: {
        label: "Publications",
        title: "Publications",
        desc:
          'Citation metrics from <a href="https://ui.adsabs.harvard.edu/" target="_blank" rel="noopener noreferrer">NASA ADS</a>.',
        descUpdated:
          'Data source: <a href="https://ui.adsabs.harvard.edu/" target="_blank" rel="noopener noreferrer">NASA ADS</a>.',
        loadingCitations: "Loading citation data…",
        loadingPubs: "Loading publications…",
        firstAuthor: "First Author",
        secondAuthor: "Second Author",
        otherSelected: "Other Selected",
        empty: "No publications listed yet.",
        citations: "{n} citations",
        chartFail: "Chart library failed to load.",
        totalCites: "Total citations: {total} · Last updated: {date}",
        chartTitle: "First-author: {first}, Second-author: {second}",
        chartRefereed: "Refereed",
        chartNonRefereed: "Non-refereed",
        chartYaxis: "Citations",
        chartAria: "Stacked bar chart of citations per year",
      },
      cv: {
        label: "Curriculum Vitae",
        title: "CV",
        phd: "Ph.D. in Astronomy",
        phdPlace: "University of Copenhagen, Denmark",
        msc: "M.Sc. in Astronomy",
        mscPlace: "Tsinghua University, China",
        bsc: "B.Sc. in Aerospace Engineering",
        bscPlace: "Sichuan University, China",
        awards: "Awards & Honors",
        award1:
          "Cosmic Dawn Center PhD Fellowship, University of Copenhagen, 2024–2027",
        award2: "MITACS Research Fellow, University of Victoria, 2020",
        skills: "Technical Skills",
        skill1: "Data Analysis",
        skill2: "Data Visualization",
        skill3: "Pipeline Development",
        view: "View Full CV",
        download: "Download Full CV",
        modalTitle: "Curriculum Vitae",
        modalClose: "Close CV viewer",
      },
      contact: {
        label: "Contact",
        title: "Contact",
        email: "Email",
        institution: "Institution",
        institutionVal: "Niels Bohr Institute, University of Copenhagen",
        office: "Office",
        officeVal: "02.2.I.112, Niels Bohr Building, Copenhagen N",
        quote:
          "For collaborations, conversations, or questions, feel free to reach out.",
      },
      footer: { rights: "All rights reserved." },
    },
    zh: {
      meta: {
        title: "黎子豪",
        description: "个人学术主页",
      },
      lang: { toZh: "中文", toEn: "EN" },
      nav: {
        menu: "主导航",
        toggle: "打开菜单",
        scrollDown: "向下滚动",
        switchToZh: "切换到中文",
        switchToEn: "切换到英文",
        home: "首页",
        about: "关于",
        research: "研究",
        publications: "论文",
        cv: "简历",
        contact: "联系",
      },
      hero: {
        tagline: "「你的沉默，是星的沉默」",
        subtitle: "天文学家",
        desc: "我研究宇宙的起源、结构与演化。",
        viewResearch: "研究方向",
        downloadCv: "下载简历",
      },
      about: {
        label: "关于",
        title: "自我介绍",
        lead:
          "我目前在哥本哈根大玻尔研究所攻读天文学博士，从事空间望远镜数据处理与科学分析。在哥本哈根大学，我师从Lise Christensen 和 Koki Kakichi。我主要参与 COSMOS-3D 无缝光谱巡天，重点研究方向是第一代恒星，宇宙再电离等问题。我曾在清华大学天文系攻读硕士学位，导师为蔡峥教授；此前毕业于四川大学航空航天工程系，获工学学士学位（吴玉章学院荣誉学士学位）。",
        // p2:
        //   "余自有识以来，恒仰观星汉；学术求索之途，幸承诸君襄助。前者寄余神思，后者成余所学。",
        photoAlt: "照片",
        name: "姓名",
        nameVal: "黎子豪 / Zihao Li",
        role: "职位",
        roleVal: "天文学博士生",
        affiliation: "单位",
        affiliationVal: "哥本哈根大学·玻尔研究所",
        research: "研究方向",
        researchVal: "星系形成 · 高红移星系 · 再电离 · 宇宙大尺度结构",
      },
      research: {
        label: "研究",
        title: "研究兴趣",
        c1Title: "星系形成与演化",
        c1Desc:
          "星系如何在宇宙中诞生、成长与死亡。",
        c2Title: "高红移宇宙",
        c2Desc:
          "早期宇宙中的首批结构，例如重子物质与暗物质的分布等。",
        c3Title: "宇宙学模拟",
        c3Desc:
          "暗物质、气体与星系的解析或数值模型。",
        c4Title: "观测天文学",
        c4Desc: "望远镜数据、光谱、成像与多波段分析等。",
      },
      pub: {
        label: "论文",
        title: "发表论文",
        desc:
          '数据来源： <a href="https://ui.adsabs.harvard.edu/" target="_blank" rel="noopener noreferrer">NASA ADS</a>。',
        descUpdated:
          '数据来源： <a href="https://ui.adsabs.harvard.edu/" target="_blank" rel="noopener noreferrer">NASA ADS</a>。',
        loadingCitations: "正在加载引用数据…",
        loadingPubs: "正在加载论文列表…",
        firstAuthor: "第一作者",
        secondAuthor: "第二作者",
        otherSelected: "部分其他论文",
        empty: "暂无论文记录。",
        citations: "引用数 {n}",
        chartFail: "图表库加载失败。",
        totalCites: "总引用：{total} · 最近更新：{date}",
        chartTitle: "第一作者：{first}，第二作者：{second}",
        chartRefereed: "Refereed",
        chartNonRefereed: "Non-refereed",
        chartYaxis: "引用次数",
        chartAria: "按年份统计的引用次数堆叠柱状图",
      },
      cv: {
        label: "简历",
        title: "简历",
        phd: "天文学博士",
        phdPlace: "哥本哈根大学，丹麦",
        msc: "天文学硕士",
        mscPlace: "清华大学，中国",
        bsc: "航空航天工程学士",
        bscPlace: "四川大学，中国",
        awards: "荣誉与奖项",
        award1: "宇宙黎明中心博士奖学金，哥本哈根大学，2024–2027",
        award2: "MITACS 研究学者，维多利亚大学，2020",
        skills: "技术技能",
        skill1: "数据分析",
        skill2: "数据可视化",
        skill3: "流水线开发",
        view: "查看完整简历",
        download: "下载完整简历",
        modalTitle: "个人简历",
        modalClose: "关闭简历预览",
      },
      contact: {
        label: "联系",
        title: "联系方式",
        email: "邮箱",
        institution: "机构",
        institutionVal: "哥本哈根大学·玻尔研究所",
        office: "办公室",
        officeVal: "02.2.I.112, Niels Bohr Building, Copenhagen N",
        quote: "欢迎合作交流。",
      },
      footer: { rights: "版权所有。" },
    },
  };

  let currentLang = DEFAULT_LANG;

  function getNested(obj, key) {
    return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  function t(key, vars) {
    let str = getNested(I18N[currentLang], key) ?? getNested(I18N.en, key) ?? key;
    if (vars && typeof str === "string") {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return str;
  }

  function getLang() {
    return currentLang;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (typeof val === "string") el.textContent = val;
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      const val = t(key);
      if (typeof val === "string") el.innerHTML = val;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr");
      spec.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    const titleEl = document.querySelector("title");
    if (titleEl) titleEl.textContent = t("meta.title");
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.description"));

    const langBtn = document.getElementById("lang-toggle");
    const langLabel = document.querySelector(".lang-toggle-label");
    if (langLabel) {
      langLabel.textContent = currentLang === "en" ? t("lang.toZh") : t("lang.toEn");
    }
    if (langBtn) {
      langBtn.setAttribute(
        "aria-label",
        currentLang === "en" ? t("nav.switchToZh") : t("nav.switchToEn")
      );
    }
  }

  function setLang(lang) {
    if (!I18N[lang]) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {
      /* ignore */
    }
    applyStaticTranslations();
    global.dispatchEvent(new CustomEvent("siteLangChange", { detail: { lang } }));
  }

  function initI18n() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && I18N[saved]) currentLang = saved;
    } catch (_) {
      /* ignore */
    }
    applyStaticTranslations();

    const langBtn = document.getElementById("lang-toggle");
    langBtn?.addEventListener("click", () => {
      setLang(currentLang === "en" ? "zh" : "en");
    });
  }

  global.SiteI18n = { t, getLang, setLang, initI18n, applyStaticTranslations };
})(window);
