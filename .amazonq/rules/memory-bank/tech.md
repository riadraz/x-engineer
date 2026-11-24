# Technology Stack: X-Engineer

## Languages & Runtimes
- HTML5 (single-page app, `index.html`)
- Vanilla JavaScript (ES6+, no framework, no transpiler)
- CSS3 (custom properties / CSS variables, Grid, Flexbox)
- Markdown (articles, docs)
- YAML (GitHub Actions workflows, CloudFormation template)
- JSON (manifest.json for doc registry)
- Node.js (Lambda runtime: `nodejs24.x` for registration, `nodejs20.x` for mail-forwarder)

> **Removed**: Zenn CLI (`zenn-cli`) dependency — Zenn posts managed in separate project.

## Frontend Libraries (CDN, no bundler)
| Library | Version | Purpose |
|---|---|---|
| Tailwind CSS | Play CDN | Utility classes (supplemental) |
| marked.js | latest CDN | Markdown → HTML rendering |
| highlight.js | 11.9.0 | Syntax highlighting in rendered markdown |
| highlight.js theme | github-dark | Code block visual theme |
| Google reCAPTCHA v2 | explicit render | Bot protection on forms |

## reCAPTCHA Configuration
| Item | Location | Visibility |
|---|---|---|
| Site key | `index.html` `<head>` inline script | Public (safe to expose) |
| Secret key | Lambda env var `RECAPTCHA_SECRET_KEY` | Private (set via AWS CLI) |
| Local secrets | `.env` file (gitignored) | Local reference only — not used by any code |
| Rendering | Explicit API (`render=explicit&onload=onRecaptchaLoad`) | 4 widgets: JA/EN × candidate/corporate |
| Server-side verification | Lambda calls Google `siteverify` endpoint | Token verified then stripped from body |

## Build & Package Management
- Package manager: npm
- `package.json` type: `commonjs`
- No bundler (Webpack/Vite/Rollup) — static files served directly
- No transpiler (Babel/TypeScript) — native ES6+ browser JS
- No build step required for frontend deployment

## CI/CD
- Platform: GitHub Actions
- Deploy workflow: `.github/workflows/deploy.yml`
  - Trigger: push to `main` branch
  - Action: uploads entire repo root as GitHub Pages artifact
  - Uses: `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`
- Disabled: `.github/workflows/publish-qiita.yml.disabled` (Qiita cross-post)

## AWS Serverless Backend

### API Gateway
- API ID: `gqns1d7wza`
- API Name: `xEngineer-Pipeline-API`
- Endpoint: `POST https://gqns1d7wza.execute-api.us-east-1.amazonaws.com/prod/register`
- Methods: `OPTIONS` (mock integration, CORS preflight) + `POST` (Lambda proxy integration)
- CORS: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: OPTIONS,POST`
- Region: `us-east-1`, Stage: `prod`

### Lambda — Registration Handler
- Function name: `xEngineer-commitFinalRegistration`
- Runtime: `nodejs24.x` (supports global `fetch` + ES modules; AWS SDK v3 built-in — no bundling needed)
- Handler: `index.handler`
- Memory: 256 MB (increased from 128 MB — cold starts with AWS SDK v3 need more)
- Timeout: 15 seconds (increased from 3s — reCAPTCHA `fetch` to Google adds latency)
- Environment variables:
  - `RECAPTCHA_SECRET_KEY` — **must be set** (no fallback; Lambda returns 500 if missing)
  - `TABLE_NAME` — fallback: `LeadsAndApplications`
  - `VERIFIED_SOURCE_EMAIL` — fallback: `mmcldint@mail.moses20608.click`
  - `SENDER_DISPLAY_NAME` — fallback: `MM Digital Engagement`
  - `ADMIN_INBOX` — fallback: `riadraz@gmail.com`
- Dependencies: AWS SDK v3 (`@aws-sdk/client-ses`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`) — built into Node.js 24 Lambda runtime

### Lambda — Mail Forwarder
- Function name: `mail-forwarder`
- Runtime: `nodejs20.x`
- Handler: `index.handler`
- Trigger: SES email receiving rule
- Flow: SES receives email → stores in S3 (`moses-mails/general-mails/{messageId}`) → Lambda retrieves + forwards to `riadraz@gmail.com`

### DynamoDB
- Table: `LeadsAndApplications` (us-east-1)
- Partition key: `id` (String — UUID v4)
- Billing mode: `PAY_PER_REQUEST`
- Stored fields: `id`, `submissionType`, `email`, `name`, `payload` (full body without recaptchaToken), `timestamp`

### Amazon SES
- Verified sender: `mmcldint@mail.moses20608.click`
- Display name: `MM Digital Engagement`
- Sends 2 emails per submission: client confirmation (bilingual EN/JA) + admin notification (with raw payload)
- Admin inbox: `riadraz@gmail.com`

### IAM
- IAM user: `moses20608` (Account: `794038213894`)
- Lambda execution role: `AWSLambdaBasicExecutionRole` + scoped DynamoDB `PutItem` + SES `SendEmail`
- GitHub Pages permissions: `contents: read`, `pages: write`, `id-token: write`

## Infrastructure as Code
- CloudFormation template: `docs/x-engineer-cloudformation.yaml`
- Provisions: API Gateway (REST API + OPTIONS/POST + CORS), Lambda function (with env vars), DynamoDB table, IAM execution role (scoped policies), CloudWatch log group, SES email identity
- Parameters: `RecaptchaSecretKey`, `VerifiedSourceEmail`, `AdminInbox`, `LambdaMemorySize`, `LambdaTimeout`, `LogRetentionDays`
- Note: Lambda handler code deployed separately (CloudFormation provisions infra only)
- Deploy command:
  ```bash
  aws cloudformation deploy --template-file docs/x-engineer-cloudformation.yaml \
    --stack-name x-engineer-pipeline --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides RecaptchaSecretKey=... VerifiedSourceEmail=... AdminInbox=...
  ```

## CSS Architecture
- Design tokens via CSS custom properties in `:root` (colors, spacing, typography, border-radius)
- `style.css`: base system (grid, cards, header, footer, forms, tabs, markdown typography)
- `custom-style.css`: theme overrides and component variants
- Inline `<style>` in index.html: `#tabs, #tabs-en` grid layout (3 columns)
- Responsive breakpoints: 600px (mobile), 768px (tablet), 900px (footer columns)

## Development Commands
```bash
# Install dependencies (if needed)
npm install

# Generate docs/manifest.json from docs/ folder
node generate-manifest.js

# Set Lambda environment variable
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 \
  --environment "Variables={RECAPTCHA_SECRET_KEY=your_key}"

# Update Lambda timeout and memory
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 --timeout 15 --memory-size 256

# Deploy Lambda code (zip)
cd aws-backend && zip function.zip xEngineer-commitFinalRegistration && \
aws lambda update-function-code \
  --function-name xEngineer-commitFinalRegistration \
  --zip-file fileb://function.zip

# Deploy infrastructure via CloudFormation
aws cloudformation deploy --template-file docs/x-engineer-cloudformation.yaml \
  --stack-name x-engineer-pipeline --capabilities CAPABILITY_NAMED_IAM
```

## Key Constraints
- **No `process.env` in browser JS**: Static site on GitHub Pages — `process` is undefined in browser. Hardcode public values (Lambda URL, reCAPTCHA site key) directly in source.
- **AWS SDK v3 built into Node.js 24 runtime**: No need to bundle `@aws-sdk/*` packages in Lambda deployment.
- **Lambda timeout must accommodate reCAPTCHA fetch**: The `siteverify` call to Google adds ~1-3s latency. 15s timeout + 256MB memory recommended.
- **reCAPTCHA tokens expire after ~2 minutes**: If user takes too long on the review pane, the token may expire. The server-side verification will reject it.
