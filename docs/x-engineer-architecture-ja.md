# X-Engineer システムアーキテクチャ & AWS パイプライン

## 📌 概要

X-Engineer は、GitHub Pages で静的サイトとしてホストされる日英バイリンガル対応の個人ブログ兼ポートフォリオ Web アプリケーションです。AWS サーバーレスインフラによる候補者・企業問い合わせフォームパイプラインと、ボット対策のための Google reCAPTCHA v2 を備えています。

フロントエンドは Vanilla JavaScript、Tailwind CSS（CDN）、Markdown レンダリング用の Marked.js、コードハイライト用の Highlight.js で構築されており、ビルドステップは不要です。バックエンドは API Gateway、Lambda、DynamoDB、SES を使用した完全サーバーレスアーキテクチャです。

---

## 🏗️ AWS アーキテクチャ図

```
┌──────────────────────────────────────────────────────┐
│                   ユーザーブラウザ                       │
│            GitHub Pages (静的ホスティング)               │
│    index.html (JA/EN)   script.js   reCAPTCHA v2      │
└──────────────────────────────────────────────────────┘
               POST + recaptchaToken
┌──────────────────────────────────────────────────────┐
│          API Gateway: xEngineer-Pipeline-API          │
│           /register [OPTIONS + POST]  CORS: *         │
└──────────────────────────────────────────────────────┘
             Lambda プロキシ統合
┌──────────────────────────────────────────────────────┐
│      Lambda: xEngineer-commitFinalRegistration        │
│       nodejs24.x | 256MB | タイムアウト: 15s          │
│  1: reCAPTCHA 検証 (Google siteverify)               │
│  2: トークン削除 (delete body.recaptchaToken)         │
│  3: UUID + タイムスタンプ生成                          │
│  4: DynamoDB へ保存                                   │
│  5: SES でメール送信 (クライアント + 管理者)           │
└──────────────────────────────────────────────────────┘
┌────────────────────┐  ┌────────────────────────────┐
│     DynamoDB       │  │        Amazon SES           │
│LeadsAndApplications│  │ クライアントメール (確認返信)  │
│   PK: id (UUID)    │  │ 管理者メール (リード通知)     │
│    オンデマンド     │  └────────────────────────────┘
└────────────────────┘
```

---

## 🔧 AWS コンポーネント

### 1. GitHub Pages（フロントエンドホスティング）
- **役割**: 静的 HTML/CSS/JS ファイルをブラウザに配信
- **ドメイン**: `x-engineer.moses20608.click`（CNAME によるカスタムドメイン）
- **コスト**: 無料
- **ビルド**: ビルドステップ不要 — リポジトリからそのまま配信

### 2. Amazon API Gateway（REST API）
- **API ID**: `gqns1d7wza`
- **API 名**: `xEngineer-Pipeline-API`
- **エンドポイント**: `/register`
- **メソッド**:
  - `OPTIONS` — CORS プリフライト用のモック統合、`Access-Control-Allow-Origin: *` を返却
  - `POST` — Lambda プロキシ統合、リクエストボディを Lambda に転送
- **リージョン**: `us-east-1`
- **ステージ**: `prod`

### 3. AWS Lambda — 登録ハンドラー
- **関数名**: `xEngineer-commitFinalRegistration`
- **ランタイム**: `nodejs24.x`（グローバル `fetch` と ES モジュール対応）
- **ハンドラー**: `index.handler`
- **メモリ**: 256 MB
- **タイムアウト**: 15 秒
- **役割**: フォームデータ受信、reCAPTCHA 検証、DynamoDB 保存、SES メール送信
- **依存関係**: AWS SDK v3（Node.js 24 Lambda ランタイムに組み込み — バンドル不要）

### 4. AWS Lambda — メール転送
- **関数名**: `mail-forwarder`
- **ランタイム**: `nodejs20.x`
- **ハンドラー**: `index.handler`
- **役割**: SES メール受信でトリガー — S3 から生メールを取得し管理者 Inbox に転送
- **トリガー**: SES メール受信ルール

### 5. Amazon DynamoDB
- **テーブル名**: `LeadsAndApplications`
- **パーティションキー**: `id`（String — UUID v4）
- **課金モード**: `PAY_PER_REQUEST`（プロビジョニング不要）
- **保存フィールド**: `id`, `submissionType`, `email`, `name`, `payload`（完全 body）, `timestamp`

### 6. Amazon SES（Simple Email Service）
- **認証済み送信元**: `mmcldint@mail.moses20608.click`
- **送信者表示名**: `MM Digital Engagement`
- **管理者 Inbox**: `riadraz@gmail.com`
- **送信メール（1 送信あたり 2 通）**:
  - クライアント確認メール（日英バイリンガル）
  - 管理者通知メール（生ペイロード含む）

### 7. Amazon S3
- **バケット名**: `moses-mails`
- **パス**: `general-mails/{messageId}`
- **役割**: SES が受信したメールを mail-forwarder Lambda 用に保存

### 8. Google reCAPTCHA v2
- **タイプ**: "私はロボットではありません" チェックボックス
- **サイトキー**: `index.html` に埋め込み（公開 — 露出しても安全）
- **シークレットキー**: Lambda 環境変数 `RECAPTCHA_SECRET_KEY` として保存（非公開）
- **検証**: サーバーサイドのみ — Lambda が Google の `siteverify` エンドポイントを呼び出し

---

## 📊 データ処理フロー

### フォーム送信パイプライン

```
[1]  ユーザーが「送信」をクリック
[2]  フロントエンド: 必須項目チェック (checkValidity)  失敗: エラー表示、停止
[3]  フロントエンド: reCAPTCHA 検証 (getResponse)  失敗: CAPTCHA エラー表示、停止
[4]  確認ペイン表示 (g-recaptcha-response 除外済み)
[5]  ユーザーが「確定して送信」をクリック
[6]  フロントエンド: API Gateway に POST + recaptchaToken 送信
[7]  API Gateway: プロキシ統合で Lambda に転送
[8]  Lambda: Google siteverify で reCAPTCHA 検証  失敗: 403 返却、停止
[9]  Lambda: body から recaptchaToken を削除
[10] Lambda: UUID + ISO タイムスタンプ生成
[11] Lambda: DynamoDB に保存 (PutCommand)
[12] Lambda: SES でメール送信 (Promise.allSettled)
       クライアント確認 (バイリンガル)  管理者通知 (生ペイロード含む)
[13] Lambda: 200 + entry ID 返却
[14] フロントエンド: 成功メッセージ表示、フォーム + reCAPTCHA リセット
```

### メール転送パイプライン（受信）

```
[1] SES が受信メールを受領
[2] SES が S3 に生メール保存 (moses-mails/general-mails/{messageId})
[3] SES が mail-forwarder Lambda をトリガー
[4] Lambda が S3 から生メール取得
[5] Lambda がヘッダー解析 (送信元, 宛先, 件名)
[6] Lambda が SES で riadraz@gmail.com に転送
```

---

## 🔒 セキュリティ考慮事項

### reCAPTCHA（ボット対策）
- **フロントエンド**: reCAPTCHA v2 チェックボックスウィジェット（明示的 API `render=explicit` でレンダリング）
- **トークン転送**: POST ペイロードに `recaptchaToken` として含める
- **サーバー側検証**: Lambda がシークレットキーで `https://www.google.com/recaptcha/api/siteverify` を呼び出し — ボットを実際にブロックする重要なレイヤー
- **トークンライフサイクル**: 一回限り、約2分で有効期限切れ
- **検証後**: トークンは body から削除（`delete body.recaptchaToken`）し、永続化・メール送信前に除外

### CORS（クロスオリジンリソース共有）
- **API Gateway OPTIONS メソッド**: `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: OPTIONS,POST`、`Access-Control-Allow-Headers: Content-Type,...` を返却
- **Lambda レスポンスヘッダー**: 全レスポンス（エラー含む）に `Access-Control-Allow-Origin: *` を含む
- **プリフライト処理**: API Gateway のモック統合で OPTIONS を処理、Lambda 呼び出し不要

### 入力サニタイゼーション
- **HTML エスケープ**: Lambda の `escapeHtml()` 関数がメール HTML テンプレート注入前に全ユーザー入力をサニタイズ
- **メール検証**: email 必須チェック、フロントエンドで HTML5 `type="email"` 
- **トークン削除**: `recaptchaToken` は DynamoDB 保存・管理者メール送信前に body から削除

### IAM（最小権限）
- **Lambda 実行ロール**: `AWSLambdaBasicExecutionRole`（CloudWatch Logs）+ DynamoDB `PutItem` と SES `SendEmail` のスコープ付きポリシー
- **ワイルドカードリソースアクセスなし**: DynamoDB 権限は特定テーブル ARN にスコープ

---

## ⚙️ 環境変数

### Lambda: xEngineer-commitFinalRegistration

| 変数 | 説明 | 例 / フォールバック |
|------|------|-------------------|
| `RECAPTCHA_SECRET_KEY` | サーバー側検証用 Google reCAPTCHA シークレットキー | *(フォールバックなし — 必須設定)* |
| `TABLE_NAME` | リード保存用 DynamoDB テーブル名 | `LeadsAndApplications` |
| `VERIFIED_SOURCE_EMAIL` | SES 認証済み送信元メールアドレス | `mmcldint@mail.moses20608.click` |
| `SENDER_DISPLAY_NAME` | From ヘッダーの表示名 | `MM Digital Engagement` |
| `ADMIN_INBOX` | 管理者通知用メールアドレス | `riadraz@gmail.com` |

### フロントエンド（HTML/JS にハードコード）

| 値 | 配置場所 | 備考 |
|----|---------|------|
| reCAPTCHA サイトキー | `index.html` `<head>` インラインスクリプト | 公開 — 露出しても安全 |
| API Gateway URL | `js/script.js` `LAMBDA_URL` 定数 | 公開 — ブラウザのネットワークタブで確認可能 |
| reCAPTCHA シークレットキー | `.env`（ローカルのみ、gitignore 対象） | フロントエンドには配置しない |

---

## 🚀 デプロイガイド

### フロントエンド（GitHub Pages）
フロントエンドは main ブランチへのプッシュ時に GitHub Actions で自動デプロイされます（`.github/workflows/deploy.yml` 参照）。GitHub Pages に環境変数は不要 — 全値はソースにハードコード済みです。

### Lambda コード（AWS コンソール）
1. AWS コンソールで該当 Lambda を開く
2. **Code** → `index` ファイルを編集
3. 更新したハンドラーコードを貼り付け
4. **Deploy** をクリック

### Lambda 設定
タイムアウト、メモリ、環境変数は CLI で更新:
```bash
# 環境変数の設定
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 \
  --environment "Variables={RECAPTCHA_SECRET_KEY=your_secret_key}"

# タイムアウトとメモリの更新
aws lambda update-function-configuration \
  --function-name xEngineer-commitFinalRegistration \
  --region us-east-1 \
  --timeout 15 \
  --memory-size 256
```

### インフラ（CloudFormation）
`docs/x-engineer-cloudformation.yaml` の CloudFormation テンプレートでインフラ全体をデプロイ:
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

> **注意**: CloudFormation はインフラをプロビジョニングします。Lambda ハンドラーコードは AWS コンソールまたは `aws lambda update-function-code` で別途デプロイが必要です。

---

## 📁 プロジェクト構成

```
x-engineer/
├── index.html              # メインページ (バイリンガル JA/EN)
├── css/
│   ├── style.css           # コアスタイル
│   └── custom-style.css    # カスタムオーバーライド
├── js/
│   ├── script.js           # フォームロジック、言語切替、ドキュメントハブ、reCAPTCHA
│   └── app.js              # Tailwind 設定、Markdown ヘルパー
├── docs/
│   ├── manifest.json        # ドキュメントハブタブ設定
│   ├── aws-iot-ggv2-202608-en.md
│   ├── aws-iot-ggv2-202608-ja.md
│   ├── x-engineer-architecture-en.md   # ← 英語版ドキュメント
│   ├── x-engineer-architecture-ja.md   # ← 本ドキュメント
│   └── x-engineer-cloudformation.yaml  # ← IaC テンプレート
├── aws-backend/
│   ├── xEngineer-commitFinalRegistration  # Lambda ハンドラー (登録)
│   └── mail-forwarder                     # Lambda ハンドラー (メール転送)
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages デプロイ
├── .env                    # ローカルシークレット (gitignore 対象)
├── .gitignore
├── CNAME                   # GitHub Pages カスタムドメイン
└── package.json
```

---
**タグ:** #AWS #Lambda #APIGateway #DynamoDB #SES #サーバーレス #reCAPTCHA #CloudFormation #GitHubPages
