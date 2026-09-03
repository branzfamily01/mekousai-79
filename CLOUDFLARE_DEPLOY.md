# 第79回目高祭 — Cloudflare本番化

## 採用構成

1つの **Cloudflare Worker (`mekousai-79`)** で、公開サイトと写真APIを同一Origin配信します。

- Static Assets: 公開HTML / CSS / JS / 画像 / BGM
- Worker API: `/api/*`
- Photo delivery: `/media/*`
- R2: `mekousai-79-media`（写真本体）
- D1: `mekousai-79-gallery`（写真台帳）
- Secrets: `EDITOR_PASSCODE`, `SESSION_SECRET`

GitHubは正本と自動デプロイ元として残します。Netlify / GitHub Pages は本番配信には不要です。

## 重要：Deploy to Cloudflareボタンは使わない

このリポジトリはすでに `branzfamily01/mekousai-79` として存在しています。Deploy to Cloudflareボタンはテンプレートを新しいGitHubリポジトリへ複製する仕組みのため、同名リポジトリ競合が起こります。

**Cloudflare Dashboardから既存リポジトリを直接Importしてください。**

## 初回作業（Cloudflare Dashboard）

1. Workers & Pages → Create application
2. **Import a repository** を選択
3. GitHubの `branzfamily01/mekousai-79` を選択
4. Worker / Project name: `mekousai-79`
5. Production branch: `main`
6. Root directory: repository root
7. Build command: 空欄
8. Deploy command: `npm run deploy`
9. Save and Deploy

`npm run deploy` は以下を自動実行します。

- 公開サイト用ファイルだけを `.cloudflare-static` にまとめる
- D1 `mekousai-79-gallery` が無ければ作成
- R2 `mekousai-79-media` が無ければ Standard で作成
- 実際のD1 Database IDを取得して一時Wrangler設定を生成
- D1 migrationを適用
- Static Assets + Worker API + D1 + R2 bindingをまとめてdeploy

したがって、通常はD1 IDを手作業でGitHubへ書き込む必要はありません。

## Secrets（初回deploy後に設定）

Cloudflare Dashboard → Worker `mekousai-79` → Settings → Variables and Secrets で次を登録します。

- `EDITOR_PASSCODE`: 写真編集ページで担当者が入力するパスコード
- `SESSION_SECRET`: セッション署名用の十分長いランダム文字列

値はGitHubへコミットしません。`SESSION_SECRET` に既にCloudflare側で値が入っている場合は、サンプル値でなければそのままで構いません。

Secrets設定後、Workerを再deployするか、GitHubの `main` へ新しいcommitをpushして再buildしてください。

## 動作確認

本番URLで次を確認します。

- `/` が表示される
- `/programs.html` が表示される
- `/api/health` が `{ "ok": true, ... }` を返す
- `/editor.html` でログインできる
- iPhoneから写真を3枚アップロード
- `/gallery.html?category=preparation` に3枚表示される
- 代表写真変更
- 非公開 → 再公開
- 1枚削除

## 日常の写真追加

本番化後は `editor.html` をiPhoneで開くだけです。

1. パスコードでログイン
2. 複数写真を選択
3. カテゴリ・日付・コメントを指定
4. 公開

写真追加のたびにGitHub / Cloudflare Dashboard / ChatGPTを触る必要はありません。
