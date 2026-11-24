# Product Overview: X-Engineer

## Purpose & Value Proposition
X-Engineer is a bilingual (JA/EN) static web portfolio and personal blog that:
1. Serves as a **talent bridge** connecting global engineers with Japanese SIer enterprises
2. Acts as a **personal blog and technical content hub** for AWS/DevOps knowledge
3. Provides **interactive candidate registration and corporate inquiry forms** backed by AWS serverless infrastructure

> **Note**: Zenn CLI and cross-posting features have been removed. X-Engineer is now a standalone personal blog/portfolio. Zenn posts are managed in a separate project.

## Key Features
- **Bilingual UI** (Japanese/English toggle) with language-aware content sections, hero titles, and form labels
- **Interactive forms** — candidate registration and corporate inquiry with:
  - Tab-based form switching (candidate / corporate)
  - Review pane confirmation flow before submission
  - Google reCAPTCHA v2 bot protection (frontend checkbox + server-side verification)
  - Bilingual validation messages
- **Markdown-rendered technical documentation hub** with tabbed navigation, filtered by language
- **AWS serverless backend** — API Gateway + Lambda + DynamoDB + SES pipeline
- **Dynamic grid layout** (4-card top, unified middle doc hub, full-width bottom footer)
- **GitHub Pages deployment** via GitHub Actions CI/CD
- **Copy buttons** on code blocks in rendered documentation

## Target Users
- **Candidates**: Global engineers (JLPT N2+) seeking Japanese enterprise roles; AWS bootcamp participants
- **Enterprises (SIer)**: Japanese IT companies needing cloud-native talent for AWS, DevOps, IaC, FinOps
- **Readers**: Engineers consuming AWS/cloud technical articles on the site itself

## Core Technical Topics Covered
- DR / Backup strategies (RTO/RPO minimization)
- Cloud migration (on-prem to AWS)
- Cost optimization & FinOps
- Multi-account management (AWS Control Tower)
- Observability (CloudWatch, OpenTelemetry, distributed tracing)
- AI-assisted Lambda development
- AWS Amplify full-stack patterns
- IaC with Terraform (pipelines, landing zones)
- Compliance automation (AWS Config, Security Hub)
- XOps pipelines (DevOps + SecOps + GitOps unified CI/CD)
- AWS IoT Greengrass v2 edge computing
- Serverless form pipeline architecture (X-Engineer's own infrastructure)

## Live Site
- GitHub Pages: deployed from `main` branch root directory
- Custom domain: `x-engineer.moses20608.click` (configured via `CNAME` file)
- Social presence: GitHub (`riadraz/x-engineer`), Qiita (`riadraz`), Zenn (`riadraz`)

## Security
- Google reCAPTCHA v2 — "I'm not a robot" checkbox on all 4 forms (JA candidate, JA corporate, EN candidate, EN corporate)
- Server-side token verification in Lambda (calls Google siteverify API)
- Token stripped from body after verification — never persisted in DynamoDB or admin email
- HTML escaping in Lambda for all user input before email template injection
- CORS enabled on API Gateway (OPTIONS mock integration + Lambda response headers)
- IAM least-privilege role for Lambda (scoped DynamoDB PutItem + SES SendEmail)
