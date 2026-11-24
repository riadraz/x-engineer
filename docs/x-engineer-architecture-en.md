# X-Engineer System Architecture & AWS Pipeline

## 📌 Overview

X-Engineer is a bilingual (Japanese/English) personal blog and portfolio web application hosted as a static site on GitHub Pages. It features a candidate and corporate inquiry form pipeline backed by AWS serverless infrastructure, with Google reCAPTCHA v2 for bot protection.

The frontend is built with vanilla JavaScript, Tailwind CSS (CDN), Marked.js for markdown rendering, and Highlight.js for code highlighting — no build step required. The backend uses API Gateway, Lambda, DynamoDB, and SES in a fully serverless architecture.

---

## 🏗️ AWS Architecture Diagram

```
[1]  USER BROWSER — GitHub Pages (Static Hosting)
     index.html (JA/EN) | script.js | reCAPTCHA v2
[2]  POST + recaptchaToken sent to API Gateway
[3]  API Gateway — xEngineer-Pipeline-API
     /register [OPTIONS + POST]  CORS: *
[4]  Lambda Proxy Integration routes to Lambda
[5]  Lambda: xEngineer-commitFinalRegistration
     nodejs24.x | 256MB | Timeout: 15s
     1: Verify reCAPTCHA (Google siteverify)
     2: Strip token (delete body.recaptchaToken)
     3: Generate UUID + timestamp
     4: Persist to DynamoDB
     5: Send emails via SES (client + admin)
[6]  DynamoDB — LeadsAndApplications | PK: id (UUID) | Pay-per-request
     Amazon SES — Client email (Confirmation) | Admin email (Notification)
```

---

## 🔧 AWS Components

### 1. GitHub Pages (Frontend Hosting)
- **Role**: Serves the static HTML/CSS/JS files to the browser
- **Domain**: `x-engineer.moses20608.click` (custom domain via CNAME)
- **Cost**: Free
- **Build**: No build step — files are served as-is from the repository

### 2. Amazon API Gateway (REST API)
- **API ID**: `gqns1d7wza`
- **API Name**: `xEngineer-Pipeline-API`
- **Endpoint**: `/register`
- **Methods**:
  - `OPTIONS` — Mock integration for CORS preflight, returns `Access-Control-Allow-Origin: *`
  - `POST` — Lambda Proxy Integration, forwards the request body to Lambda
- **Region**: `us-east-1`
- **Stage**: `prod`

### 3. AWS Lambda — Registration Handler
- **Function Name**: `xEngineer-commitFinalRegistration`
- **Runtime**: `nodejs24.x` (supports global `fetch` and ES modules)
- **Handler**: `index.handler`
- **Memory**: 256 MB
- **Timeout**: 15 seconds
- **Role**: Receives form data, verifies reCAPTCHA, stores in DynamoDB, sends emails via SES
- **Dependencies**: AWS SDK v3 (built into the Node.js 24 Lambda runtime — no bundling needed)

### 4. AWS Lambda — Mail Forwarder
- **Function Name**: `mail-forwarder`
- **Runtime**: `nodejs20.x`
- **Handler**: `index.handler`
- **Role**: Triggered by SES email receipt — retrieves raw email from S3 and forwards to admin inbox
- **Trigger**: SES email receiving rule

### 5. Amazon DynamoDB
- **Table Name**: `LeadsAndApplications`
- **Partition Key**: `id` (String — UUID v4)
- **Billing Mode**: `PAY_PER_REQUEST` (no provisioned throughput needed)
- **Stored Fields**: `id`, `submissionType`, `email`, `name`, `payload` (full body), `timestamp`

### 6. Amazon SES (Simple Email Service)
- **Verified Sender**: `mmcldint@mail.moses20608.click`
- **Sender Display Name**: `MM Digital Engagement`
- **Admin Inbox**: `riadraz@gmail.com`
- **Sends two emails per submission**:
  - Client confirmation (bilingual EN/JA)
  - Admin notification with raw payload

### 7. Amazon S3
- **Bucket Name**: `moses-mails`
- **Path**: `general-mails/{messageId}`
- **Role**: Stores incoming emails received by SES for the mail-forwarder Lambda

### 8. Google reCAPTCHA v2
- **Type**: "I'm not a robot" checkbox
- **Site Key**: Embedded in `index.html` (public, safe to expose)
- **Secret Key**: Stored as Lambda environment variable `RECAPTCHA_SECRET_KEY` (private)
- **Verification**: Server-side only — Lambda calls Google's `siteverify` endpoint

---

## 📊 Data Processing Flow

### Form Submission Pipeline

```
[1]  User clicks "Submit"
[2]  Frontend validates fields (checkValidity)  FAIL: show error, stop
[3]  Frontend validates reCAPTCHA (getResponse)  FAIL: show CAPTCHA error, stop
[4]  Show Review Pane (filtered: no g-recaptcha-response)
[5]  User clicks "Confirm & Submit"
[6]  Frontend sends POST to API Gateway + recaptchaToken
[7]  API Gateway routes to Lambda (Proxy Integration)
[8]  Lambda verifies reCAPTCHA via Google siteverify  FAIL: return 403, stop
[9]  Lambda strips token (delete body.recaptchaToken)
[10] Lambda generates UUID + ISO timestamp
[11] Lambda persists to DynamoDB (PutCommand)
[12] Lambda sends emails via SES (Promise.allSettled)
       Client confirmation (bilingual)  Admin notification (raw payload)
[13] Lambda returns 200 + entry ID
[14] Frontend shows success, resets form + reCAPTCHA
```

### Mail Forwarder Pipeline (Inbound)

```
[1] Inbound email arrives at SES
[2] SES stores raw email in S3 (moses-mails/general-mails/{messageId})
[3] SES triggers mail-forwarder Lambda
[4] Lambda retrieves raw email from S3
[5] Lambda parses headers (sender, recipients, subject)
[6] Lambda forwards to riadraz@gmail.com via SES
```

---

## 🔒 Security Considerations

### reCAPTCHA (Bot Protection)
- **Frontend**: reCAPTCHA v2 checkbox widget rendered via explicit API (`render=explicit`)
- **Token transport**: Token included in POST payload as `recaptchaToken`
- **Server-side verification**: Lambda calls `https://www.google.com/recaptcha/api/siteverify` with the secret key — this is the critical layer that actually blocks bots
- **Token lifecycle**: One-time use, expires after ~2 minutes
- **Post-verification**: Token is stripped from the body (`delete body.recaptchaToken`) before persistence or emailing

### CORS (Cross-Origin Resource Sharing)
- **API Gateway OPTIONS method**: Returns `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: OPTIONS,POST`, `Access-Control-Allow-Headers: Content-Type,...`
- **Lambda response headers**: All Lambda responses (including errors) include `Access-Control-Allow-Origin: *`
- **Preflight handling**: API Gateway mock integration for OPTIONS, no Lambda invocation needed

### Input Sanitization
- **HTML escaping**: Lambda `escapeHtml()` function sanitizes all user input before injection into email HTML templates
- **Email validation**: Required field check for email; HTML5 `type="email"` on frontend
- **Token stripping**: `recaptchaToken` removed from body before DynamoDB persistence and admin email

### IAM (Least Privilege)
- **Lambda execution role**: `AWSLambdaBasicExecutionRole` (CloudWatch Logs) + scoped policies for DynamoDB `PutItem` and SES `SendEmail`
- **No wildcard resource access**: DynamoDB permission scoped to the specific table ARN

---

## ⚙️ Environment Variables

### Lambda: xEngineer-commitFinalRegistration

| Variable | Description | Example / Fallback |
|----------|-------------|-------------------|
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret key for server-side verification | *(no fallback — must be set)* |
| `TABLE_NAME` | DynamoDB table name for lead storage | `LeadsAndApplications` |
| `VERIFIED_SOURCE_EMAIL` | SES verified sender email address | `mmcldint@mail.moses20608.click` |
| `SENDER_DISPLAY_NAME` | Display name in the From header | `MM Digital Engagement` |
| `ADMIN_INBOX` | Email address for admin notifications | `riadraz@gmail.com` |

### Frontend (Hardcoded in HTML/JS)

| Value | Location | Notes |
|-------|----------|-------|
| reCAPTCHA site key | `index.html` `<head>` inline script | Public — safe to expose |
| API Gateway URL | `js/script.js` `LAMBDA_URL` constant | Public — visible in browser network tab |
| reCAPTCHA secret key | `.env` (local only, gitignored) | Never deployed to frontend |

---

## 🚀 Deployment Guide

### Frontend (GitHub Pages)
The frontend deploys automatically via GitHub Actions on push to the main branch (see `.github/workflows/deploy.yml`). No environment variables are needed on GitHub Pages — all values are hardcoded in the source.

### Lambda Code (AWS Console)
1. Open the Lambda in AWS Console
2. Navigate to **Code** → edit the `index` file
3. Paste the updated handler code
4. Click **Deploy**

### Lambda Configuration
Update timeout, memory, and environment variables via CLI:
```bash
# Set environment variable
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 \
  --environment "Variables={RECAPTCHA_SECRET_KEY=your_secret_key}"

# Update timeout and memory
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 \
  --timeout 15 \
  --memory-size 256
```

### Infrastructure (CloudFormation)
Deploy the full infrastructure stack using the CloudFormation template in `docs/x-engineer-cloudformation.yaml`:
```bash
aws cloudformation deploy \
  --template-file docs/x-engineer-cloudformation.yaml \
  --stack-name x-engineer-pipeline \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      RecaptchaSecretKey=your_secret_key \
      VerifiedSourceEmail=mmcldint@mail.moses20608.click \
      AdminInbox=riadraz@gmail.com
```

> **Note**: CloudFormation provisions the infrastructure. Lambda handler code must be deployed separately via the AWS Console or `aws lambda update-function-code`.

---

## 📁 Project Structure

```
x-engineer/
├── index.html              # Main page (bilingual JA/EN)
├── css/
│   ├── style.css           # Core styles
│   └── custom-style.css    # Custom overrides
├── js/
│   ├── script.js           # Form logic, language switcher, doc hub, reCAPTCHA
│   └── app.js              # Tailwind config, markdown helpers
├── docs/
│   ├── manifest.json        # Documentation hub tab configuration
│   ├── aws-iot-ggv2-202608-en.md
│   ├── aws-iot-ggv2-202608-ja.md
│   ├── x-engineer-architecture-en.md   # ← This document
│   ├── x-engineer-architecture-ja.md    # ← Japanese version
│   └── x-engineer-cloudformation.yaml  # ← IaC template
├── aws-backend/
│   ├── xEngineer-commitFinalRegistration  # Lambda handler (registration)
│   └── mail-forwarder                     # Lambda handler (email forwarding)
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages deployment
├── .env                    # Local secrets (gitignored)
├── .gitignore
├── CNAME                   # GitHub Pages custom domain
└── package.json
```

---
**Tags:** #AWS #Lambda #APIGateway #DynamoDB #SES #Serverless #reCAPTCHA #CloudFormation #GitHubPages
