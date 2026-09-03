# 第79回目高祭 — Cloudflare本番化

## 採用構成

1つの **Cloudflare Worker (`mekousai-79`)** で、公開サイトと写真APIを同一Origin配信する。

- Static Assets: `index.html`, `programs.html`, `gallery.html`, `editor.html`, CSS/JS/画像/BGM
- Worker API: `/api/*`
- Photo delivery: `/media/*`
- R2: `mekousai-79-media`（写真本体）
- D1: `mekousai-79-gallery`（写真台帳）
- Secrets: `EDITOR_PASSCODE`, `SESSION_SECRET`

Netlify / GitHub Pages は本番配信には不要。GitHubは正本と自動デプロイ元として残す。

## 推奨：Deploy to Cloudflare で一括作成

READMEの **Deploy to Cloudflare** ボタンから進む。

Cloudflareが `wrangler.toml` を読み、以下を自動プロビジョニング・bindingする構成にしてある。

- R2 bucket `mekousai-79-media`
- D1 database `mekousai-79-gallery`
- Worker `mekousai-79`
- Static Assets

D1 migrationも `npm run deploy` の中で自動適用される。

設定途中でSecretの入力を求められたら、以下を入力する。

- `EDITOR_PASSCODE`: 編集画面用パスコード
- `SESSION_SECRET`: 32文字以上を目安にした十分長いランダム文字列

Secretの実値はGitHubへコミットしない。

## Deploy後の確認

本番URLで次を確認する。

1. `/` が表示される
2. `/programs.html` が表示される
3. `/api/health` が `{ "ok": true, ... }`
4. `/editor.html` でログインできる
5. iPhoneから「準備風景」に写真を3枚アップロード
6. `/gallery.html?category=preparation` に3枚表示
7. 代表写真を変更できる
8. 公開→非公開→再公開できる
9. 1枚削除できる

## 写真追加の日常運用

本番化後は `editor.html` をiPhoneで開くだけ。

1. パスコードでログイン
2. 複数写真を選ぶ
3. カテゴリ・日付・コメントを指定
4. 公開

GitHub / Cloudflare Dashboard / ChatGPTを毎回触る必要はない。

## もしDeploy to Cloudflareを使わない場合

手動でも可能だが、R2作成、D1作成、binding、migration、Secrets設定、Workers Builds接続を個別に行う必要がある。文化祭直前のため、原則として一括Deployを推奨する。
