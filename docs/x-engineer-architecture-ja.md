# X-Engineer システムアーキテクチャ & AWS パイプライン

## 概要

X-Engineer は、GitHub Pages で静的サイトとして公開している日英バイリンガルのポートフォリオ兼人材サイトです。候補者・企業向けの問い合わせフォームは AWS サーバーレスのパイプラインで処理し、ボット対策に Google reCAPTCHA v2 を使用しています。

| レイヤー | 使用技術 |
|---|---|
| フロントエンド | Vanilla JavaScript、Tailwind CSS（CDN）、Marked.js（Markdown）、Highlight.js（コード）。ビルド不要 |
| ホスティング | GitHub Pages（カスタムドメイン） |
| バックエンド | API Gateway、Lambda、DynamoDB、SES（完全サーバーレス） |
| ボット対策 | Google reCAPTCHA v2（サーバー側で検証） |

## AWS アーキテクチャ

1. **ブラウザ（GitHub Pages）:** `index.html`（JA/EN）、`script.js`、reCAPTCHA v2 ウィジェットを配信します。
2. **リクエスト:** ブラウザが `recaptchaToken` を含む POST を API Gateway に送信します。
3. **API Gateway:** `xEngineer-Pipeline-API`、パス `/register`（OPTIONS と POST）、CORS 有効。
4. **ルーティング:** Lambda プロキシ統合でリクエストを Lambda に転送します。
5. **Lambda:** `xEngineer-commitFinalRegistration` が reCAPTCHA を検証し、トークンを削除し、UUID とタイムスタンプを生成して DynamoDB に保存し、SES でメールを送信します。
6. **保存とメール:** DynamoDB テーブル `LeadsAndApplications`（オンデマンド）、SES によるクライアント宛て確認メールと管理者宛て通知メール。

## AWS コンポーネント

### 1. GitHub Pages（フロントエンドホスティング）

| 項目 | 内容 |
|---|---|
| 役割 | 静的 HTML/CSS/JS をブラウザに配信 |
| ドメイン | `x-engineer.moses20608.click`（CNAME によるカスタムドメイン） |
| コスト | 無料 |
| ビルド | なし。リポジトリのファイルをそのまま配信 |

### 2. Amazon API Gateway（REST API）

| 項目 | 内容 |
|---|---|
| API ID | `gqns1d7wza` |
| API 名 | `xEngineer-Pipeline-API` |
| エンドポイント | `/register` |
| OPTIONS | CORS プリフライト用のモック統合。`Access-Control-Allow-Origin: *` を返却 |
| POST | Lambda プロキシ統合。リクエストボディを Lambda に転送 |
| リージョン / ステージ | `us-east-1` / `prod` |

### 3. AWS Lambda: 登録ハンドラー

| 項目 | 内容 |
|---|---|
| 関数名 | `xEngineer-commitFinalRegistration` |
| ランタイム | `nodejs24.x`（グローバル `fetch` と ES モジュール対応） |
| ハンドラー | `index.handler` |
| メモリ / タイムアウト | 256 MB / 15 秒 |
| 役割 | フォームデータ受信、reCAPTCHA 検証、DynamoDB 保存、SES メール送信 |
| 依存関係 | AWS SDK v3（Node.js 24 ランタイムに組み込み済み。バンドル不要） |

### 4. AWS Lambda: メール転送

| 項目 | 内容 |
|---|---|
| 関数名 | `mail-forwarder` |
| ランタイム | `nodejs20.x` |
| ハンドラー | `index.handler` |
| 役割 | S3 から生メールを取得し、管理者の受信箱へ転送 |
| トリガー | SES メール受信ルール |

### 5. Amazon DynamoDB

| 項目 | 内容 |
|---|---|
| テーブル名 | `LeadsAndApplications` |
| パーティションキー | `id`（String、UUID v4） |
| 課金モード | `PAY_PER_REQUEST`（プロビジョニング不要） |
| 保存フィールド | `id`、`submissionType`、`email`、`name`、`payload`（完全な body）、`timestamp` |

### 6. Amazon SES

| 項目 | 内容 |
|---|---|
| 認証済み送信元 | `mmcldint@mail.moses20608.click` |
| 送信者表示名 | `MM Digital Engagement` |
| 管理者受信箱 | `riadraz@gmail.com` |
| 1 送信あたりのメール | 2 通：クライアント確認メール（日英バイリンガル）と管理者通知メール（生ペイロード含む） |

### 7. Amazon S3

| 項目 | 内容 |
|---|---|
| バケット | `moses-mails` |
| パス | `general-mails/{messageId}` |
| 役割 | SES が受信したメールを mail-forwarder Lambda 用に保存 |

### 8. Google reCAPTCHA v2

| 項目 | 内容 |
|---|---|
| タイプ | 「私はロボットではありません」チェックボックス |
| サイトキー | `index.html` に埋め込み（公開情報。露出しても安全） |
| シークレットキー | Lambda 環境変数 `RECAPTCHA_SECRET_KEY`（非公開） |
| 検証 | サーバー側のみ。Lambda が Google の `siteverify` を呼び出す |

## データ処理フロー

### フォーム送信パイプライン

| 手順 | 担当 | 処理 | 失敗時 |
|---|---|---|---|
| 1 | ユーザー | 「送信」をクリック | なし |
| 2 | フロントエンド | 必須項目を検証（`checkValidity`） | エラー表示して停止 |
| 3 | フロントエンド | reCAPTCHA の応答を確認（`getResponse`） | CAPTCHA エラーを表示して停止 |
| 4 | フロントエンド | 確認ペインを表示（`g-recaptcha-response` を除外） | なし |
| 5 | ユーザー | 「確定して送信」をクリック | なし |
| 6 | フロントエンド | `recaptchaToken` 付きで API Gateway に POST | なし |
| 7 | API Gateway | プロキシ統合で Lambda に転送 | なし |
| 8 | Lambda | Google `siteverify` で reCAPTCHA を検証 | 403 を返して停止 |
| 9 | Lambda | トークンを削除（`delete body.recaptchaToken`） | なし |
| 10 | Lambda | UUID と ISO タイムスタンプを生成 | なし |
| 11 | Lambda | DynamoDB に保存（`PutCommand`） | なし |
| 12 | Lambda | SES でクライアント宛て・管理者宛てメールを送信（`Promise.allSettled`） | なし |
| 13 | Lambda | 200 と entry ID を返却 | なし |
| 14 | フロントエンド | 成功メッセージを表示し、フォームと reCAPTCHA をリセット | なし |

### メール転送パイプライン（受信）

| 手順 | 担当 | 処理 |
|---|---|---|
| 1 | SES | 受信メールを受領 |
| 2 | SES | 生メールを S3 に保存（`moses-mails/general-mails/{messageId}`） |
| 3 | SES | `mail-forwarder` Lambda をトリガー |
| 4 | Lambda | S3 から生メールを取得 |
| 5 | Lambda | ヘッダーを解析（送信元、宛先、件名） |
| 6 | Lambda | SES で管理者の受信箱に転送 |

## セキュリティ考慮事項

### reCAPTCHA（ボット対策）

| 項目 | 内容 |
|---|---|
| フロントエンド | v2 チェックボックスを明示的 API（`render=explicit`）で表示 |
| トークンの送信 | POST ペイロードに `recaptchaToken` として含める |
| サーバー側検証 | Lambda がシークレットキーで Google の `siteverify` を呼び出す。ボットを実際にブロックする重要なレイヤー |
| トークンの有効期間 | 1 回限り。約 2 分で失効 |
| 検証後 | 保存・メール送信の前に body からトークンを削除 |

### CORS

- **API Gateway の OPTIONS:** `Access-Control-Allow-Origin: *`、`Access-Control-Allow-Methods: OPTIONS,POST`、`Access-Control-Allow-Headers: Content-Type,...` を返却します。
- **Lambda のレスポンス:** エラーを含むすべてのレスポンスに `Access-Control-Allow-Origin: *` を付与します。
- **プリフライト:** API Gateway のモック統合で処理し、Lambda は呼び出しません。

### 入力のサニタイズ

- **HTML エスケープ:** Lambda の `escapeHtml()` が、メールの HTML テンプレートに挿入する前にすべての入力をサニタイズします。
- **メール検証:** サーバー側で必須チェック、フロントエンドで HTML5 の `type="email"` を使用します。
- **トークン削除:** `recaptchaToken` は DynamoDB への保存と管理者メール送信の前に削除します。

### IAM（最小権限）

- **実行ロール:** `AWSLambdaBasicExecutionRole`（CloudWatch Logs）に加え、DynamoDB `PutItem` と SES `SendEmail` に限定したポリシー。
- **ワイルドカード不使用:** DynamoDB の権限は特定のテーブル ARN に限定します。

## 環境変数

### Lambda: xEngineer-commitFinalRegistration

| 変数 | 説明 | 例 / フォールバック |
|---|---|---|
| `RECAPTCHA_SECRET_KEY` | サーバー側検証用の reCAPTCHA シークレットキー | なし。必ず設定 |
| `TABLE_NAME` | リード保存用の DynamoDB テーブル名 | `LeadsAndApplications` |
| `VERIFIED_SOURCE_EMAIL` | SES 認証済みの送信元アドレス | `mmcldint@mail.moses20608.click` |
| `SENDER_DISPLAY_NAME` | From ヘッダーの表示名 | `MM Digital Engagement` |
| `ADMIN_INBOX` | 管理者通知用アドレス | `riadraz@gmail.com` |

### フロントエンド（HTML/JS にハードコード）

| 値 | 配置場所 | 備考 |
|---|---|---|
| reCAPTCHA サイトキー | `index.html` の `<head>` 内インラインスクリプト | 公開情報。露出しても安全 |
| API Gateway URL | `js/script.js` の `LAMBDA_URL` 定数 | 公開情報。ブラウザのネットワークタブで確認可能 |
| reCAPTCHA シークレットキー | `.env`（ローカルのみ、gitignore 対象） | フロントエンドには配置しない |

## デプロイガイド

### フロントエンド（GitHub Pages）

- main ブランチへの push 時に GitHub Actions で自動デプロイされます（`.github/workflows/deploy.yml`）。
- GitHub Pages に環境変数は不要です。すべての値はソースに記載されています。

### Lambda コード（AWS コンソール）

1. AWS コンソールで該当の Lambda 関数を開きます。
2. **Code** を開き、`index` ファイルを編集します。
3. 更新したハンドラーコードを貼り付けます。
4. **Deploy** をクリックします。

### Lambda 設定（AWS CLI）

すべて `aws lambda update-function-configuration` に `--function-name xEngineer-commitFinalRegistration` と `--region us-east-1` を付けて実行します。

| 設定 | オプション | 値の例 |
|---|---|---|
| 環境変数 | `--environment` | `"Variables={RECAPTCHA_SECRET_KEY=your_secret_key}"` |
| タイムアウト | `--timeout` | `15` |
| メモリ | `--memory-size` | `256` |

### インフラ（CloudFormation）

`aws cloudformation deploy` とテンプレート `docs/x-engineer-cloudformation.yaml` で全体をデプロイします。

| オプション | 値 |
|---|---|
| `--stack-name` | `x-engineer-pipeline` |
| `--capabilities` | `CAPABILITY_NAMED_IAM` |
| `--parameter-overrides` | `RecaptchaSecretKey`、`VerifiedSourceEmail`、`AdminInbox` |

- **注意:** CloudFormation が作成するのはインフラのみです。Lambda のハンドラーコードは AWS コンソールまたは `aws lambda update-function-code` で別途デプロイしてください。

## プロジェクト構成

| パス | 説明 |
|---|---|
| `index.html` | メインページ（バイリンガル JA/EN） |
| `css/style.css` | コアスタイル |
| `css/custom-style.css` | カスタムオーバーライド |
| `js/script.js` | フォーム処理、言語切替、ドキュメントハブ、reCAPTCHA |
| `js/app.js` | Tailwind 設定、Markdown ヘルパー |
| `docs/manifest.json` | ドキュメントハブのタブ設定 |
| `docs/aws-iot-ggv2-202608-en.md` / `-ja.md` | AWS IoT Greengrass 関連ドキュメント |
| `docs/x-engineer-architecture-en.md` / `-ja.md` | 本ドキュメントと英語版 |
| `docs/x-engineer-cloudformation.yaml` | IaC テンプレート |
| `aws-backend/xEngineer-commitFinalRegistration` | Lambda ハンドラー（登録） |
| `aws-backend/mail-forwarder` | Lambda ハンドラー（メール転送） |
| `.github/workflows/deploy.yml` | GitHub Pages デプロイ |
| `.env` | ローカルのシークレット（gitignore 対象） |
| `CNAME` | GitHub Pages のカスタムドメイン |
| `package.json` | プロジェクト情報 |

**タグ:** #AWS #Lambda #APIGateway #DynamoDB #SES #サーバーレス #reCAPTCHA #CloudFormation #GitHubPages
