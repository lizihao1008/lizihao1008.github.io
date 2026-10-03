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
        title: "Zihao Li · Astrophysics",
        description:
          "Zihao Li — PhD candidate at the Cosmic Dawn Center (DAWN), Niels Bohr Institute, University of Copenhagen. JWST slitless spectroscopy, galaxy chemical evolution, and the reionization era.",
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
        subtitle: "PhD Candidate in Astrophysics",
        affiliation:
          "Cosmic Dawn Center (DAWN) · Niels Bohr Institute · University of Copenhagen",
        desc: "I use JWST slitless spectroscopy to study how galaxies build up their metals — from cosmic noon to the epoch of reionization.",
        viewResearch: "View Research",
        downloadCv: "CV (PDF)",
      },
      about: {
        label: "About",
        title: "About Me",
        lead:
          "I am a PhD candidate at the Cosmic Dawn Center (DAWN), Niels Bohr Institute, University of Copenhagen, working with Lise Christensen and Koki Kakiichi. I study the chemical enrichment of galaxies across cosmic time — from metallicity gradients at cosmic noon to metal-poor galaxies and possible first-star signatures near the end of reionization.",
        p2:
          "At DAWN, I work on the data reduction of JWST NIRCam and NIRISS wide-field slitless spectroscopy (WFSS) for the COSMOS-3D survey, and analyse JWST ASPIRE and EIGER spectroscopy of galaxies at z ≈ 5–7. I received my M.Sc. in Astronomy from Tsinghua University, advised by Zheng Cai, and my B.Sc. with honors in Aerospace Engineering from Sichuan University.",
        photoAlt: "Portrait of Zihao Li",
        name: "Name",
        nameVal: "Zihao Li (黎子豪)",
        role: "Position",
        roleVal: "PhD Candidate in Astrophysics",
        affiliation: "Affiliation",
        affiliationVal:
          "Cosmic Dawn Center (DAWN), Niels Bohr Institute, University of Copenhagen",
        research: "Research",
        researchVal:
          "Galaxy chemical evolution · Metallicity gradients · Reionization-era galaxies · JWST slitless spectroscopy",
      },
      research: {
        label: "Research",
        title: "Research Interests",
        keyPapers: "Key papers",
        c1Title: "Metallicity Gradients Across Cosmic Time",
        c1Desc:
          "Spatially resolved gas-phase metallicity from grism spectroscopy, tracing how galaxies assemble from the local Universe to z ≈ 9.",
        c2Title: "Metal Enrichment in the Reionization Era",
        c2Desc:
          "JWST ASPIRE/EIGER spectroscopy combined with chemical evolution models to study metal enrichment, environmental effects, and possible first-star (Pop III) imprints at z ≈ 5–7.",
        c3Title: "JWST Wide-Field Slitless Spectroscopy",
        c3Desc:
          "Data reduction and analysis of JWST NIRCam/NIRISS WFSS for the COSMOS-3D survey, including spatially resolved kinematics of a lensed z = 8.34 disk candidate.",
        c4Title: "Galaxies in Overdense Environments and the IGM",
        c4Desc:
          "How protocluster environments shape galaxy chemistry at cosmic noon, and mapping the intergalactic medium with Lyα forest tomography.",
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
        institutionVal:
          "Cosmic Dawn Center (DAWN), Niels Bohr Institute, University of Copenhagen",
        office: "Office",
        officeVal:
          "02.2.I.112, Niels Bohr Building, Jagtvej 155A, DK-2200 Copenhagen N, Denmark",
        quote:
          "For collaborations, conversations, or questions, feel free to reach out.",
      },
      footer: { rights: "All rights reserved." },
    },
    zh: {
      meta: {
        title: "黎子豪 · 天体物理",
        description:
          "黎子豪，哥本哈根大学尼尔斯·玻尔研究所宇宙黎明中心（DAWN）博士候选人。研究方向：JWST 无缝光谱、星系化学演化与宇宙再电离时期。",
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
        subtitle: "天体物理博士候选人",
        affiliation: "宇宙黎明中心（DAWN）· 尼尔斯·玻尔研究所 · 哥本哈根大学",
        desc: "我利用 JWST 无缝光谱研究星系如何积累金属——从宇宙正午一直追溯到宇宙再电离时期。",
        viewResearch: "研究方向",
        downloadCv: "简历（PDF）",
      },
      about: {
        label: "关于",
        title: "自我介绍",
        lead:
          "我目前是哥本哈根大学尼尔斯·玻尔研究所宇宙黎明中心（DAWN）的博士候选人，合作导师为 Lise Christensen 和 Koki Kakiichi。我的研究聚焦于星系在宇宙历史中的化学增丰——从宇宙正午时期的金属丰度梯度，到再电离末期的贫金属星系及可能的第一代恒星（Pop III）印记。",
        p2:
          "在 DAWN，我参与 COSMOS-3D 巡天中 JWST NIRCam 与 NIRISS 宽视场无缝光谱（WFSS）的数据处理，并分析 JWST ASPIRE 与 EIGER 项目中 z ≈ 5–7 星系的光谱数据。此前，我在清华大学天文系获得硕士学位，导师为蔡峥教授；本科毕业于四川大学空天科学与工程学院航空航天工程专业，获荣誉学士学位。",
        photoAlt: "黎子豪的照片",
        name: "姓名",
        nameVal: "黎子豪（Zihao Li）",
        role: "职位",
        roleVal: "天体物理博士候选人",
        affiliation: "单位",
        affiliationVal: "哥本哈根大学 尼尔斯·玻尔研究所 宇宙黎明中心（DAWN）",
        research: "研究方向",
        researchVal: "星系化学演化 · 金属丰度梯度 · 再电离时期星系 · JWST 无缝光谱",
      },
      research: {
        label: "研究",
        title: "研究兴趣",
        keyPapers: "代表论文",
        c1Title: "金属丰度梯度的宇宙演化",
        c1Desc:
          "利用无缝光谱测量星系空间分辨的气相金属丰度，追踪星系从近邻宇宙到 z ≈ 9 的组装历史。",
        c2Title: "再电离时期的金属增丰",
        c2Desc:
          "结合 JWST ASPIRE/EIGER 光谱与化学演化模型，研究 z ≈ 5–7 星系的金属增丰、环境效应以及可能的第一代恒星（Pop III）印记。",
        c3Title: "JWST 宽视场无缝光谱",
        c3Desc:
          "COSMOS-3D 巡天中 JWST NIRCam/NIRISS WFSS 的数据处理与分析，包括对一个 z = 8.34 引力透镜盘星系候选体的空间分辨动力学研究。",
        c4Title: "高密度环境中的星系与星系际介质",
        c4Desc:
          "研究原星系团环境如何影响宇宙正午时期星系的化学性质，并利用 Lyα 森林层析成像重建星系际介质的三维分布。",
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
        institutionVal: "哥本哈根大学 尼尔斯·玻尔研究所 宇宙黎明中心（DAWN）",
        office: "办公室",
        officeVal:
          "02.2.I.112, Niels Bohr Building, Jagtvej 155A, DK-2200 Copenhagen N, Denmark",
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
