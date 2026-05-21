# Astronomy Academic Homepage

个人学术静态主页 — 浪漫主义深空风格，适合天文学博士使用。

**主题：** 在宇宙的寂静中寻找秩序，在星光的余晖里书写科学。

## 项目结构

```
astronomy-homepage/
├── index.html          # 主页面
├── style.css           # 样式与动画
├── script.js           # 交互、星空、论文数据加载
├── config/
│   └── ads_config.json # ADS API 作者查询配置
├── data/
│   ├── publications.json  # 论文列表（由脚本更新）
│   └── citations.json     # 每年引用量（由脚本更新）
├── scripts/
│   └── ads_metrics.py  # 从 NASA ADS 拉取 citations + publications
├── assets/
│   └── cv.pdf          # 请放入你的简历 PDF
└── .github/workflows/
    └── update-ads.yml  # 每日自动更新 ADS 数据
```

## 本地预览

1. 将 `assets/cv.pdf` 替换为你的简历（当前目录下需自行添加）。
2. 用浏览器直接打开 `index.html`，或使用本地服务器：

```bash
cd astronomy-homepage
python3 -m http.server 8080
# 访问 http://localhost:8080
```

> 使用 `file://` 打开时，`data/*.json` 可能因浏览器 CORS 限制无法加载；页面会自动使用内置占位数据。推荐使用本地服务器预览。

## 部署到 GitHub Pages

1. 将 `astronomy-homepage` 目录推送到 GitHub 仓库。
2. 在仓库 **Settings → Pages** 中：
   - Source: **Deploy from a branch**
   - Branch: `main` / folder: `/`（若项目在子目录，选 `/docs` 或将文件放在仓库根目录）
3. 若站点在子目录 `astronomy-homepage/`，将整个文件夹内容作为仓库根目录，或配置 Pages 指向该文件夹。

### ADS 每日自动更新

1. 在 [ADS](https://ui.adsabs.harvard.edu/user/settings/token) 申请 API Token。
2. 在 GitHub 仓库 **Settings → Secrets → Actions** 中添加：
   - Name: `ADS_TOKEN`
   - Value: 你的 token
3. 编辑 `config/ads_config.json`（已预设 ORCID 与第一作者名）：

```json
{
  "orcid": "0000-0001-5951-459X",
  "author_query": "orcid:0000-0001-5951-459X",
  "first_author_name": "Li, Zihao",
  "max_papers": 200
}
```

4. GitHub Actions 每天 UTC 06:00 运行 `scripts/ads_metrics.py`，更新：
   - `data/citations.json` — ApexCharts 引用图表（years / refereed / nonrefereed / first_author / contributing / time）
   - `data/publications.json` — 一作 / 二作论文列表（按 ADS 作者顺位筛选）

也可手动触发：**Actions → Update ADS Data → Run workflow**。

本地测试：

```bash
cd my_website
pip install -r requirements.txt
export ADS_TOKEN="your-token-here"
python scripts/ads_metrics.py
```

也可将 token 写入 `config/.ads_token`（该文件已在 `.gitignore` 中，不会提交）。

## 自定义内容

在 `index.html` 中修改占位信息：姓名、单位、邮箱、社交链接等。

## 技术说明

- 纯 HTML / CSS / 原生 JavaScript，无框架
- Canvas 星空、星云渐变、流星、视差
- Publications 通过静态 JSON 展示（避免浏览器直接调用 ADS API 的 CORS 与 token 暴露问题）
- 响应式布局，支持移动端导航

## 许可

按需自由修改用于个人学术主页。
