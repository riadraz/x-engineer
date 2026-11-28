# X-Engineer System Architecture & AWS Pipeline

## Overview

X-Engineer is a bilingual (Japanese/English) portfolio and talent site hosted as a static site on GitHub Pages. Candidate and corporate inquiry forms are processed by an AWS serverless pipeline, and Google reCAPTCHA v2 protects against bots.

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript, Tailwind CSS (CDN), Marked.js (markdown), Highlight.js (code); no build step |
| Hosting | GitHub Pages with a custom domain |
| Backend | API Gateway, Lambda, DynamoDB, SES (fully serverless) |
| Bot protection | Google reCAPTCHA v2, verified server-side |

## AWS Architecture

1. **Browser (GitHub Pages):** serves `index.html` (JA/EN), `script.js` and the reCAPTCHA v2 widget.
2. **Request:** the browser sends a POST with `recaptchaToken` to API Gateway.
3. **API Gateway:** `xEngineer-Pipeline-API`, path `/register` (OPTIONS and POST), CORS enabled.
4. **Routing:** Lambda proxy integration forwards the request to Lambda.
5. **Lambda:** `xEngineer-commitFinalRegistration` verifies reCAPTCHA, removes the token, generates a UUID and timestamp, saves to DynamoDB, and sends emails through SES.
6. **Storage and email:** DynamoDB table `LeadsAndApplications` (pay-per-request), plus SES emails to the client (confirmation) and the admin (notification).

## AWS Components

### 1. GitHub Pages (frontend hosting)

| Item | Value |
|---|---|
| Role | Serves static HTML/CSS/JS to the browser |
| Domain | `x-engineer.moses20608.click` (custom domain via CNAME) |
| Cost | Free |
| Build | None; files are served as-is from the repository |

### 2. Amazon API Gateway (REST API)

| Item | Value |
|---|---|
| API ID | `gqns1d7wza` |
| API name | `xEngineer-Pipeline-API` |
| Endpoint | `/register` |
| OPTIONS | Mock integration for CORS preflight; returns `Access-Control-Allow-Origin: *` |
| POST | Lambda proxy integration; forwards the request body to Lambda |
| Region / stage | `us-east-1` / `prod` |

### 3. AWS Lambda: registration handler

| Item | Value |
|---|---|
| Function name | `xEngineer-commitFinalRegistration` |
| Runtime | `nodejs24.x` (global `fetch` and ES modules) |
| Handler | `index.handler` |
| Memory / timeout | 256 MB / 15 seconds |
| Role | Receives form data, verifies reCAPTCHA, stores to DynamoDB, sends emails via SES |
| Dependencies | AWS SDK v3, built into the Node.js 24 runtime (no bundling) |

### 4. AWS Lambda: mail forwarder

| Item | Value |
|---|---|
| Function name | `mail-forwarder` |
| Runtime | `nodejs20.x` |
| Handler | `index.handler` |
| Role | Reads the raw email from S3 and forwards it to the admin inbox |
| Trigger | SES email receiving rule |

### 5. Amazon DynamoDB

| Item | Value |
|---|---|
| Table name | `LeadsAndApplications` |
| Partition key | `id` (String, UUID v4) |
| Billing mode | `PAY_PER_REQUEST` (no provisioned throughput) |
| Stored fields | `id`, `submissionType`, `email`, `name`, `payload` (full body), `timestamp` |

### 6. Amazon SES

| Item | Value |
|---|---|
| Verified sender | `mmcldint@mail.moses20608.click` |
| Sender display name | `MM Digital Engagement` |
| Admin inbox | `riadraz@gmail.com` |
| Emails per submission | Two: client confirmation (bilingual EN/JA) and admin notification (raw payload) |

### 7. Amazon S3

| Item | Value |
|---|---|
| Bucket | `moses-mails` |
| Path | `general-mails/{messageId}` |
| Role | Stores inbound emails received by SES for the mail-forwarder Lambda |

### 8. Google reCAPTCHA v2

| Item | Value |
|---|---|
| Type | "I'm not a robot" checkbox |
| Site key | Embedded in `index.html` (public, safe to expose) |
| Secret key | Lambda environment variable `RECAPTCHA_SECRET_KEY` (private) |
| Verification | Server-side only; Lambda calls Google's `siteverify` endpoint |

## Data Processing Flow

### Form submission pipeline

| Step | Actor | Action | On failure |
|---|---|---|---|
| 1 | User | Clicks "Submit" | n/a |
| 2 | Frontend | Validates fields (`checkValidity`) | Shows error, stops |
| 3 | Frontend | Checks the reCAPTCHA response (`getResponse`) | Shows CAPTCHA error, stops |
| 4 | Frontend | Shows the review pane (without `g-recaptcha-response`) | n/a |
| 5 | User | Clicks "Confirm & Submit" | n/a |
| 6 | Frontend | Sends POST with `recaptchaToken` to API Gateway | n/a |
| 7 | API Gateway | Routes to Lambda (proxy integration) | n/a |
| 8 | Lambda | Verifies reCAPTCHA through Google `siteverify` | Returns 403, stops |
| 9 | Lambda | Removes the token (`delete body.recaptchaToken`) | n/a |
| 10 | Lambda | Generates a UUID and ISO timestamp | n/a |
| 11 | Lambda | Saves to DynamoDB (`PutCommand`) | n/a |
| 12 | Lambda | Sends client and admin emails via SES (`Promise.allSettled`) | n/a |
| 13 | Lambda | Returns 200 with the entry ID | n/a |
| 14 | Frontend | Shows success; resets the form and reCAPTCHA | n/a |

### Mail forwarder pipeline (inbound)

| Step | Actor | Action |
|---|---|---|
| 1 | SES | Receives the inbound email |
| 2 | SES | Stores the raw email in S3 (`moses-mails/general-mails/{messageId}`) |
| 3 | SES | Triggers the `mail-forwarder` Lambda |
| 4 | Lambda | Retrieves the raw email from S3 |
| 5 | Lambda | Parses headers (sender, recipients, subject) |
| 6 | Lambda | Forwards to the admin inbox via SES |

## Security Considerations

### reCAPTCHA (bot protection)

| Item | Detail |
|---|---|
| Frontend | v2 checkbox widget rendered with the explicit API (`render=explicit`) |
| Token transport | Sent in the POST payload as `recaptchaToken` |
| Server-side check | Lambda calls Google's `siteverify` with the secret key; this is the layer that actually blocks bots |
| Token lifecycle | One-time use; expires after about 2 minutes |
| After verification | Token is removed from the body before storage or emailing |

### CORS

- **API Gateway OPTIONS:** returns `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: OPTIONS,POST` and `Access-Control-Allow-Headers: Content-Type,...`.
- **Lambda responses:** every response, including errors, carries `Access-Control-Allow-Origin: *`.
- **Preflight:** handled by the API Gateway mock integration; no Lambda invocation.

### Input sanitization

- **HTML escaping:** the Lambda `escapeHtml()` function sanitizes all user input before it enters email HTML templates.
- **Email validation:** required-field check on the server and HTML5 `type="email"` on the frontend.
- **Token removal:** `recaptchaToken` is removed before DynamoDB storage and admin email.

### IAM (least privilege)

- **Execution role:** `AWSLambdaBasicExecutionRole` (CloudWatch Logs) plus scoped policies for DynamoDB `PutItem` and SES `SendEmail`.
- **No wildcard resources:** the DynamoDB permission is scoped to the specific table ARN.

## Environment Variables

### Lambda: xEngineer-commitFinalRegistration

| Variable | Description | Example / fallback |
|---|---|---|
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret key for server-side verification | None; must be set |
| `TABLE_NAME` | DynamoDB table for lead storage | `LeadsAndApplications` |
| `VERIFIED_SOURCE_EMAIL` | SES verified sender address | `mmcldint@mail.moses20608.click` |
| `SENDER_DISPLAY_NAME` | Display name in the From header | `MM Digital Engagement` |
| `ADMIN_INBOX` | Address for admin notifications | `riadraz@gmail.com` |

### Frontend (hardcoded in HTML/JS)

| Value | Location | Notes |
|---|---|---|
| reCAPTCHA site key | `index.html`, inline script in `<head>` | Public; safe to expose |
| API Gateway URL | `js/script.js`, `LAMBDA_URL` constant | Public; visible in the browser network tab |
| reCAPTCHA secret key | `.env` (local only, gitignored) | Never deployed to the frontend |

## Deployment Guide

### Frontend (GitHub Pages)

- Deploys automatically through GitHub Actions on push to the main branch (`.github/workflows/deploy.yml`).
- No environment variables are needed on GitHub Pages; all values are in the source.

### Lambda code (AWS Console)

1. Open the Lambda function in the AWS Console.
2. Go to **Code** and edit the `index` file.
3. Paste the updated handler code.
4. Click **Deploy**.

### Lambda configuration (AWS CLI)

All settings use `aws lambda update-function-configuration` with `--function-name xEngineer-commitFinalRegistration` and `--region us-east-1`.

| Setting | Option | Example value |
|---|---|---|
| Environment variable | `--environment` | `"Variables={RECAPTCHA_SECRET_KEY=your_secret_key}"` |
| Timeout | `--timeout` | `15` |
| Memory | `--memory-size` | `256` |

### Infrastructure (CloudFormation)

Deploy the full stack with `aws cloudformation deploy` and the template `docs/x-engineer-cloudformation.yaml`.

| Option | Value |
|---|---|
| `--stack-name` | `x-engineer-pipeline` |
| `--capabilities` | `CAPABILITY_NAMED_IAM` |
| `--parameter-overrides` | `RecaptchaSecretKey`, `VerifiedSourceEmail`, `AdminInbox` |

- **Note:** CloudFormation provisions the infrastructure only. Deploy the Lambda handler code separately through the AWS Console or `aws lambda update-function-code`.

## Project Structure

| Path | Description |
|---|---|
| `index.html` | Main page (bilingual JA/EN) |
| `css/style.css` | Core styles |
| `css/custom-style.css` | Custom overrides |
| `js/script.js` | Form logic, language switcher, documentation hub, reCAPTCHA |
| `js/app.js` | Tailwind config, markdown helpers |
| `docs/manifest.json` | Documentation hub tab configuration |
| `docs/aws-iot-ggv2-202608-en.md` / `-ja.md` | AWS IoT Greengrass documents |
| `docs/x-engineer-architecture-en.md` / `-ja.md` | This document and its Japanese version |
| `docs/x-engineer-cloudformation.yaml` | IaC template |
| `aws-backend/xEngineer-commitFinalRegistration` | Lambda handler (registration) |
| `aws-backend/mail-forwarder` | Lambda handler (email forwarding) |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |
| `.env` | Local secrets (gitignored) |
| `CNAME` | GitHub Pages custom domain |
| `package.json` | Project metadata |

**Tags:** #AWS #Lambda #APIGateway #DynamoDB #SES #Serverless #reCAPTCHA #CloudFormation #GitHubPages
