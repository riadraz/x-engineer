# Project Structure: X-Engineer

## Directory Layout
```
x-engineer/
├── index.html              # Single-page app entry point (bilingual, grid layout)
├── package.json            # Node.js manifest; zenn-cli dependency
├── package-lock.json
├── CNAME                   # Custom domain for GitHub Pages
├── .gitignore
│
├── js/
│   ├── script.js           # Core UI logic (tabs, markdown rendering, lang toggle)
│   └── app.js              # Form handling, validation, review/confirm flow
│
├── css/
│   ├── style.css           # Base layout styles (grid, cards, header, footer)
│   └── custom-style.css    # Theme overrides and component-specific styles
│
├── docs/                   # Technical markdown articles (rendered in-page)
│   ├── manifest.json       # Tab/document registry for the doc hub
│   ├── aws-security.md
│   ├── aws-well-architected-ja.md
│   ├── cost-optimization.md
│   ├── db-migration.md
│   ├── greengrass-v2-intro-ja.md
│   ├── iot-core-mqtt-bestpractice-ja.md
│   └── lambda-edge-kiosk-ja.md
│
├── articles/               # Zenn/Qiita cross-post article sources (.md)
│   ├── 185209a79d6ef9.md
│   ├── 654ef8ec255893.md
│   ├── example-article1.md
│   └── example-article2.md
│
├── books/                  # Zenn book format content
│   └── a59b538ac31c3d/
│       ├── config.yaml
│       ├── example1.md
│       └── example2.md
│
├── public/                 # Zenn public articles
│   ├── 166db6b8cf4e292268bb.md
│   └── 3ced1a6532d634f921e7.md
│
├── images/                 # Static image assets
│
├── .github/
│   └── workflows/
│       ├── deploy.yml                  # GitHub Pages auto-deploy on push to main
│       └── publish-qiita.yml.disabled  # Qiita cross-post (disabled)
│
└── .amazonq/
    └── rules/
        └── memory-bank/               # Amazon Q memory bank documentation
```

## Core Components & Relationships

### index.html → js/script.js → docs/manifest.json → docs/*.md
The main page loads `script.js` which reads `manifest.json` to build the tabbed documentation hub, fetches markdown files, and renders them via `marked.js` with `highlight.js` syntax highlighting.

### index.html → js/app.js
`app.js` handles all interactive form logic: tab switching between candidate/corporate forms, field validation, review pane display, and final submission flow.

### CSS Architecture
- `style.css`: structural grid system, card components, header/footer layout
- `custom-style.css`: visual theming, color overrides, component variants

### Content Pipeline
```
articles/*.md  ──► Zenn CLI ──► zenn.dev
               ──► (disabled) publish-qiita.yml ──► qiita.com
               ──► GitHub Pages (index.html doc hub)
```

## Architectural Patterns
- **Single Page Application (SPA)**: One HTML file with JS-driven content switching
- **Language Toggle Pattern**: Dual content blocks (`lang="ja"` / `lang="en"`) toggled via CSS class `hidden`
- **Tab-driven Doc Hub**: Dynamic tab generation from `manifest.json` registry
- **Static Site + CDN**: No backend; Tailwind CSS via CDN, marked.js via CDN, highlight.js via CDN
- **GitHub Pages CI/CD**: Push to `main` → auto-deploy entire repo root
