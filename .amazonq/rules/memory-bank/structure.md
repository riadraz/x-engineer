# Project Structure: X-Engineer

## Directory Layout
```
x-engineer/
├── index.html              # Single-page app (bilingual JA/EN, grid layout, reCAPTCHA)
├── package.json            # Node.js manifest
├── package-lock.json
├── CNAME                   # Custom domain for GitHub Pages
├── .gitignore              # Includes: node_modules, .DS_Store, .env
├── .env                    # Local secrets (gitignored) — reCAPTCHA keys, Lambda URL
│
├── js/
│   ├── script.js           # Single source of truth: forms, lang switcher, doc hub, reCAPTCHA, copy buttons
│   └── app.js              # Tailwind config init only (createTabs disabled)
│
├── css/
│   ├── style.css           # Base layout styles (grid, cards, header, footer)
│   └── custom-style.css    # Theme overrides and component-specific styles
│
├── docs/                   # Technical markdown articles (rendered in-page)
│   ├── manifest.json       # Tab/document registry (language-filtered by -ja/-en suffix)
│   ├── aws-iot-ggv2-202608-en.md    # AWS IoT Greengrass V2 (English)
│   ├── aws-iot-ggv2-202608-ja.md    # AWS IoT Greengrass V2 (Japanese)
│   ├── x-engineer-architecture-en.md  # X-Engineer AWS architecture (English)
│   ├── x-engineer-architecture-ja.md  # X-Engineer AWS architecture (Japanese)
│   └── x-engineer-cloudformation.yaml  # IaC template for full serverless stack
│
├── aws-backend/            # AWS Lambda handler source code
│   ├── xEngineer-commitFinalRegistration  # Registration Lambda (reCAPTCHA verify, DynamoDB, SES)
│   └── mail-forwarder                     # Email forwarding Lambda (S3 → SES)
│
├── generate-manifest.js    # Script to auto-generate docs/manifest.json from docs/
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

> **Removed**: `articles/`, `books/`, `public/` folders (Zenn CLI content) — Zenn posts are now managed in a separate project.

## Core Components & Relationships

### index.html → js/script.js → docs/manifest.json → docs/*.md
The main page loads `script.js` which reads `manifest.json`, filters docs by language (`-ja` / `-en` suffix), builds the tabbed documentation hub for both JA and EN containers (`#tabs` / `#tabs-en`), fetches markdown files, and renders them via `marked.js` with `highlight.js` syntax highlighting and copy buttons.

### index.html → js/script.js (form logic + reCAPTCHA)
All form logic lives in `script.js` inside `DOMContentLoaded`:
- `setupFormSet('ja')` and `setupFormSet('en')` — bilingual form handling
- Tab switching between candidate/corporate forms (scoped per language)
- Field validation + reCAPTCHA verification before review pane
- Review pane display (filtered: no `g-recaptcha-response`)
- Lambda submission with `recaptchaToken` in payload
- reCAPTCHA widget reset after successful submission
- Language switcher toggles: `post-ja`/`post-en`, `hero-title-ja`/`hero-title-en`, `hero-desc-ja`/`hero-desc-en`
- `setupDocHub('ja')` and `setupDocHub('en')` — bilingual doc hub with language-filtered manifest

### js/app.js (minimal role)
- `initTailwind()` — sets Tailwind config (runs immediately)
- `window.onload = createTabs` — **DISABLED** — script.js now handles tab creation for both languages
- `addCopyButtons()` — referenced but no longer called by app.js; script.js has its own `addCopyButtons` function

### index.html → reCAPTCHA (Google)
- Inline callback `onRecaptchaLoad` in `<head>` renders all `[data-recaptcha-container]` widgets explicitly
- API script: `https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaLoad`
- 4 widgets total: JA candidate, JA corporate, EN candidate, EN corporate

### aws-backend/ → AWS Lambda
- `xEngineer-commitFinalRegistration` — handler code for the registration Lambda (deploy via AWS Console or `update-function-code`)
- `mail-forwarder` — handler code for the email forwarding Lambda

### CSS Architecture
- `style.css`: structural grid system, card components, header/footer layout
- `custom-style.css`: visual theming, color overrides, component variants
- Inline `<style>` in index.html targets both `#tabs` and `#tabs-en` for grid layout

## Architectural Patterns
- **Single Page Application (SPA)**: One HTML file with JS-driven content switching
- **Bilingual Toggle Pattern**: Dual content blocks (`lang="ja"` / `lang="en"`) toggled via CSS class `hidden`; all element IDs use `''` (JA) or `'-en'` (EN) suffix
- **Form Set Pattern**: `setupFormSet(lang)` called twice — all form logic scoped per language
- **Tab-driven Doc Hub**: Dynamic tab generation from `manifest.json` registry, filtered by language
- **Static Site + CDN**: No backend on frontend; Tailwind CSS via CDN, marked.js via CDN, highlight.js via CDN
- **Serverless Backend**: API Gateway → Lambda → DynamoDB + SES (no EC2, no containers)
- **GitHub Pages CI/CD**: Push to `main` → auto-deploy entire repo root
