# Development Guidelines: X-Engineer

## Code Quality Standards

### JavaScript Conventions
- **No framework**: Pure vanilla JS (ES6+) — no React, Vue, or Angular
- **Entry points**: `script.js` wraps all logic in `DOMContentLoaded`; `app.js` only runs Tailwind config init (createTabs disabled)
- **Async pattern**: Always use `async/await` with `try/catch/finally` for fetch operations
- **Error handling**: Log errors via `console.error()` and display user-facing fallback HTML inline
- **DOM queries**: Use `document.querySelectorAll` + `forEach` for node lists; `getElementById` for single elements
- **No `process.env` in frontend**: Browser JavaScript has no `process` object — hardcode public values (Lambda URL, reCAPTCHA site key) directly in source

### Naming Conventions
- Functions: descriptive camelCase verbs — `loadMarkdown`, `createTabs`, `loadPost`, `addCopyButtons`, `executeFormReviewRouting`, `renderDocument`, `setupFormSet`, `setupDocHub`
- Variables: camelCase, semantically named — `tabsContainer`, `currentActiveFormId`, `fieldLabelMapping`, `reviewHTML`, `currentRecaptchaToken`
- CSS classes: kebab-case BEM-like — `.tab-button.active`, `.form-display-pane`, `.form-validation-alert`
- HTML `data-*` attributes used as selector tokens — `data-lang`, `data-doc`, `data-form`, `data-recaptcha-container`, `data-widget-id`

### Comment Style
- Section headers use `// --- SECTION NAME ---` pattern (all caps, dashes)
- Inline comments explain *why*, not *what* — e.g., `// Token verified — strip it from the body so it's never persisted or emailed`
- JSDoc-style block comments for complex functions (used in `script.js` `renderDocument`)

---

## Architectural Patterns

### Bilingual Language System (JA/EN)
The entire site has full bilingual support. All content, forms, and docs exist in both languages:

**Language Switcher** (in `script.js`):
```js
// Toggles: post-ja/post-en, hero-title-ja/en, hero-desc-ja/en
postEn.classList.toggle('hidden', !isEn);
postJa.classList.toggle('hidden', isEn);
heroTitleEn.classList.toggle('hidden', !isEn);
heroTitleJa.classList.toggle('hidden', isEn);
```

**ID Suffix Pattern** — all form/doc elements use `''` for JA, `'-en'` for EN:
```
JA:  candidate-form, candidate-form-pane, candidate-error-msg, review-confirm-btn, tabs, content
EN:  candidate-form-en, candidate-form-pane-en, candidate-error-msg-en, review-confirm-btn-en, tabs-en, content-en
```

**i18n strings object** — all user-facing messages are bilingual:
```js
const i18n = {
  ja: { required: '必須項目をすべて入力してください。', captcha: 'CAPTCHA認証を完了してください。', ... },
  en: { required: 'Please fill in all required fields.', captcha: 'Please complete the CAPTCHA verification.', ... },
};
```

**Error message ID fix**: Use `formId.replace(\`-form${suffix}\`, '')` to get the form prefix, then construct error ID as `${formPrefix}-error-msg${suffix}`. This correctly resolves `candidate-form-en` → `candidate-error-msg-en` (not `candidate-en-error-msg`).

### Active State Toggle Pattern
Used consistently across tabs, language switcher, and form tabs:
```js
document.querySelector('.selector.active').classList.remove('active');
element.classList.add('active');
```
For form tab buttons scoped within a language group, use `document.querySelectorAll(`${scope} .form-tab-btn.active`)` to avoid removing active state from the other language's tabs.

### Visibility Toggle Pattern
Show/hide via CSS class `hidden` (defined as `display: none !important`):
```js
element.classList.remove('hidden'); // show
element.classList.add('hidden');    // hide
```
Never use `element.style.display` directly — always use the `.hidden` class.

### Form Set Setup Pattern (Bilingual)
`setupFormSet(lang)` is called once for 'ja' and once for 'en'. Each call:
1. Scopes all selectors to `#post-ja` or `#post-en`
2. Gets all panes/buttons by suffixed IDs
3. Attaches form tab switch listeners (scoped to the language container)
4. Attaches form submit listeners
5. Handles review pane display + Lambda submission
6. Manages reCAPTCHA validation and reset

### reCAPTCHA Integration
**Frontend** (`index.html` + `script.js`):
- reCAPTCHA v2 explicit rendering via inline callback in `<head>`:
  ```js
  window.onRecaptchaLoad = function () {
    document.querySelectorAll('[data-recaptcha-container]').forEach(function (el) {
      var widgetId = grecaptcha.render(el, { sitekey: siteKey });
      el.setAttribute('data-widget-id', widgetId);
    });
  };
  ```
- API script loaded with `?render=explicit&onload=onRecaptchaLoad` (async defer)
- Validation in `executeFormReviewRouting` before showing review pane:
  ```js
  currentRecaptchaToken = grecaptcha.getResponse(widgetId);
  if (!currentRecaptchaToken) { errorEl.textContent = msg.captcha; return; }
  ```
- `g-recaptcha-response` field filtered from review pane display
- Token sent to Lambda as `payload.recaptchaToken`
- Widget reset after successful submission: `grecaptcha.reset(widgetId)`

**Backend** (Lambda):
- Token verified via `fetch("https://www.google.com/recaptcha/api/siteverify")`
- Returns 403 if token missing or invalid, 500 if Google service unavailable
- After verification: `delete body.recaptchaToken` — token never persisted in DynamoDB or admin email

### Async Fetch + Render Pattern
Standard pattern for all markdown loading:
```js
async function renderDocument(filePath) {
  contentArea.innerHTML = `<p>${msg.loading}</p>`;
  try {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(res.status);
    const raw = await res.text();
    const md = raw.replace(/^---[\s\S]*?---\n?/, '');
    contentArea.innerHTML = marked.parse(md);
    contentArea.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    addCopyButtons(contentArea);
  } catch (err) { /* error display */ }
}
```

### Manifest-Driven Content Pattern (Language-Filtered)
`docs/manifest.json` entries use IDs ending with `-ja` or `-en`. The doc hub filters by language:
```js
const filtered = docs.filter(doc => doc.id.endsWith(`-${lang}`));
```
Adding a new bilingual doc pair:
```json
{ "id": "doc-name-en", "title": "English Title", "file": "docs/doc-name-en.md" },
{ "id": "doc-name-ja", "title": "日本語タイトル", "file": "docs/doc-name-ja.md" }
```

### Form → Lambda Submission Pattern
- Scope form tab button selectors to language container (`#post-ja` or `#post-en`)
- Remap frontend field names to Lambda's expected payload before `fetch()`:
  - Candidate: `{ fullName, email, contact, jlptLevel, awsExperience, githubUrl }`
  - Corporate: `{ companyName, email, contact, sector, projectRequirements }`
- Add `payload.recaptchaToken = currentRecaptchaToken`
- Lambda uses `body.companyName === undefined` to distinguish candidate vs corporate — never include `companyName` in candidate payload
- API Gateway endpoint: `https://gqns1d7wza.execute-api.us-east-1.amazonaws.com/prod/register`
- Lambda function: `xEngineer-commitFinalRegistration` (us-east-1, nodejs24.x, 256MB, 15s timeout)
- DynamoDB table: `LeadsAndApplications`
- SES admin inbox: `riadraz@gmail.com`
- SES verified sender: `mmcldint@mail.moses20608.click`

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
- Tabs: `repeat(3, 1fr)` fixed columns — inline `<style>` targets both `#tabs` and `#tabs-en`
- Footer: `2fr 1.5fr 1.5fr` three-column, collapses to `1fr` at 900px

### Typography
- Japanese content: `"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif` with `line-height: 1.85`, `letter-spacing: 0.04em`
- English content: `Inter, ui-sans-serif, system-ui` with `line-height: 1.65`, `letter-spacing: -0.011em`
- Code blocks: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

---

## Content & Documentation Conventions

### Adding a New Technical Document (Bilingual)
1. Create `docs/your-doc-en.md` (English) and `docs/your-doc-ja.md` (Japanese)
2. Add two entries to `docs/manifest.json` — one with `-en` suffix ID, one with `-ja`
3. Docs auto-appear as tabs in the correct language view — no JS changes needed

### Bilingual Doc Pairs
- Docs come in language pairs: `*-en.md` and `*-ja.md`
- Each file gets its own manifest entry with a distinct `id` (must end with `-en` or `-ja`) and `title`

### Bilingual Content Sections
- Japanese content lives in `#post-ja` (`lang="ja"`)
- English content lives in `#post-en` (`lang="en"`, hidden by default)
- Hero title uses `#hero-title-ja` / `#hero-title-en` pair
- Hero description uses `#hero-desc-ja` / `#hero-desc-en` pair
- Always implement both language blocks with matching structure and `-en` suffixed IDs

---

## Key Anti-Patterns to Avoid
- Do NOT use `element.style.display` — use `.hidden` class toggle
- Do NOT hardcode color/spacing values in CSS — use CSS custom properties
- Do NOT add new doc tabs by modifying JS — update `manifest.json` only
- Do NOT use `innerHTML` with unsanitized user input — only use it for `marked.parse()` output or trusted template strings
- Do NOT submit forms directly — always route through the review pane confirmation flow
- Do NOT use `process.env` in frontend JavaScript — browsers have no `process` object; this will throw `ReferenceError` and crash the entire `DOMContentLoaded` handler
- Do NOT leave `recaptchaToken` in the body — strip it after verification before persistence/emailing
- Do NOT show `g-recaptcha-response` in the review pane — filter it from `Object.entries(data)`
- Do NOT use `aws-sdk` v2 — the Lambda uses AWS SDK v3 (`@aws-sdk/client-ses`, `@aws-sdk/client-dynamodb`)
