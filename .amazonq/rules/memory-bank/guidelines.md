# Development Guidelines: X-Engineer

## Code Quality Standards

### JavaScript Conventions
- **No framework**: Pure vanilla JS (ES6+) — no React, Vue, or Angular
- **Entry points**: `script.js` wraps logic in `DOMContentLoaded`; `app.js` uses `window.onload`
- **Async pattern**: Always use `async/await` with `try/catch/finally` for fetch operations
- **Error handling**: Log errors via `console.error()` and display user-facing fallback HTML inline
- **DOM queries**: Use `document.querySelectorAll` + `forEach` for node lists; `getElementById` for single elements

### Naming Conventions
- Functions: descriptive camelCase verbs — `loadMarkdown`, `createTabs`, `loadPost`, `addCopyButtons`, `executeFormReviewRouting`, `renderDocument`
- Variables: camelCase, semantically named — `tabsContainer`, `currentActiveFormId`, `fieldLabelMapping`, `reviewHTML`
- CSS classes: kebab-case BEM-like — `.tab-button.active`, `.form-display-pane`, `.form-validation-alert`
- HTML `data-*` attributes used as selector tokens — `data-lang`, `data-doc`, `data-form`

### Comment Style
- Section headers use `// --- SECTION NAME ---` pattern (all caps, dashes)
- Inline comments explain *why*, not *what* — e.g., `// Pulls clean text string from /docs/[file].md directly`
- JSDoc-style block comments for complex functions (used in `script.js` `renderDocument`)

---

## Architectural Patterns

### Active State Toggle Pattern
Used consistently across tabs, language switcher, and form tabs:
```js
document.querySelector('.selector.active').classList.remove('active');
element.classList.add('active');
```

### Visibility Toggle Pattern
Show/hide via CSS class `hidden` (defined as `display: none !important`):
```js
element.classList.remove('hidden'); // show
element.classList.add('hidden');    // hide
```
Never use `element.style.display` directly — always use the `.hidden` class.

### Async Fetch + Render Pattern
Standard pattern for all markdown loading:
```js
async function loadMarkdown(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load');
    return await res.text();
  } catch (err) {
    console.error(err);
    return `# Error\n\nCould not load ${url}`;
  }
}
```
After fetching, always pass through `marked.parse()` before setting `innerHTML`.

### Tab System Pattern
Tabs are driven by `data-*` attributes; active state managed by toggling `.active` class:
```js
element.onclick = () => loadPost(post);
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.classList.toggle('active', btn.textContent === post.title);
});
```

### Manifest-Driven Content Pattern
`docs/manifest.json` is the single source of truth for the doc hub. Adding a new document = adding one entry to the JSON array:
```json
{ "id": "new-doc", "title": "表示タイトル", "file": "docs/new-doc.md" }
```

### Form Validation Pattern
1. Use HTML5 `novalidate` on `<form>` to suppress native UI
2. Call `formElement.checkValidity()` manually in JS
3. Show custom error via `#formId-error-msg` element (`.form-validation-alert`)
4. Apply custom business rules after native validation passes
5. On success, transition to review pane — never submit directly to a server

---

## CSS Design System

### CSS Custom Properties (always use tokens, never hardcode values)
```css
--color-accent: #2563eb;     /* primary blue */
--color-main: #1a1a1a;       /* body text */
--color-mute: #4b5563;       /* secondary text */
--color-border: #e5e7eb;     /* borders */
--spacing-sm: 16px;
--spacing-md: 24px;
--spacing-lg: 40px;
--border-radius: 12px;
```

### Grid Layout Conventions
- Top section: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`
- Middle section: `repeat(auto-fit, minmax(320px, 1fr))`
- Tabs: `repeat(3, 1fr)` fixed columns, grows downward
- Footer: `2fr 1.5fr 1.5fr` three-column, collapses to `1fr` at 900px

### Typography
- Japanese content: `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif` with `line-height: 1.85`, `letter-spacing: 0.04em`
- English content: `Inter, ui-sans-serif, system-ui` with `line-height: 1.65`, `letter-spacing: -0.011em`
- Code blocks: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

---

## Content & Documentation Conventions

### Adding a New Technical Document
1. Create `docs/your-doc-ja.md` (Japanese preferred, suffix `-ja` for Japanese)
2. Add entry to `docs/manifest.json`
3. Document auto-appears as a tab in the doc hub — no JS changes needed

### Article Cross-Posting
- Place Zenn articles in `articles/` with Zenn-format frontmatter
- Use `npx zenn preview` to validate locally before pushing
- GitHub Actions deploys the static site on every push to `main`

### Bilingual Content
- Japanese content lives in `#post-ja` (`lang="ja"`)
- English content lives in `#post-en` (`lang="en"`, hidden by default)
- Hero text uses `#hero-desc-ja` / `#hero-desc-en` pair
- Always implement both language blocks when adding new sections

---

## Key Anti-Patterns to Avoid
- Do NOT use `element.style.display` — use `.hidden` class toggle
- Do NOT hardcode color/spacing values in CSS — use CSS custom properties
- Do NOT add new doc tabs by modifying JS — update `manifest.json` only
- Do NOT use `innerHTML` with unsanitized user input — only use it for `marked.parse()` output or trusted template strings
- Do NOT submit forms directly — always route through the review pane confirmation flow
