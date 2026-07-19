# Technology Stack: X-Engineer

## Languages & Runtimes
- HTML5 (single-page app, `index.html`)
- Vanilla JavaScript (ES6+, no framework)
- CSS3 (custom properties / CSS variables, Grid, Flexbox)
- Markdown (articles, docs, Zenn books)
- YAML (GitHub Actions workflows, Zenn book config)
- JSON (manifest.json for doc registry)
- Node.js (tooling only via zenn-cli)

## Frontend Libraries (CDN, no bundler)
| Library | Version | Purpose |
|---|---|---|
| Tailwind CSS | Play CDN | Utility classes (supplemental) |
| marked.js | latest CDN | Markdown → HTML rendering |
| highlight.js | 11.9.0 | Syntax highlighting in rendered markdown |
| highlight.js theme | github-dark | Code block visual theme |

## Build & Package Management
- Package manager: npm
- `package.json` type: `commonjs`
- Key dependency: `zenn-cli ^0.4.8` (article preview and management)
- No bundler (Webpack/Vite/Rollup) — static files served directly
- No transpiler (Babel/TypeScript) — native ES6+ browser JS

## CI/CD
- Platform: GitHub Actions
- Deploy workflow: `.github/workflows/deploy.yml`
  - Trigger: push to `main` branch
  - Action: uploads entire repo root as GitHub Pages artifact
  - Uses: `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`
- Disabled: `.github/workflows/publish-qiita.yml.disabled` (Qiita cross-post)

## Content Management
- Zenn CLI: manages `articles/`, `books/`, `public/` directories
- `docs/manifest.json`: JSON array registry mapping tab IDs to markdown file paths
- Markdown files rendered client-side via fetch + marked.js

## CSS Architecture
- Design tokens via CSS custom properties in `:root` (colors, spacing, typography, border-radius)
- `style.css`: base system (grid, cards, header, footer, forms, tabs, markdown typography)
- `custom-style.css`: theme overrides and component variants
- Responsive breakpoints: 600px (mobile), 768px (tablet), 900px (footer columns)

## Development Commands
```bash
# Install dependencies
npm install

# Zenn article preview (local server)
npx zenn preview

# Create new Zenn article
npx zenn new:article

# Create new Zenn book
npx zenn new:book
```

## Hosting
- GitHub Pages (static, no server-side rendering)
- Custom domain via `CNAME` file
- Permissions: `contents: read`, `pages: write`, `id-token: write`
