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

## 残るCloudflare側の初回作業

### 1. R2

R2 bucket を作る。

- name: `mekousai-79-media`
- storage class: Standard

### 2. D1

D1 database を作る。

- name: `mekousai-79-gallery`

作成後の Database ID を `wrangler.toml` の `REPLACE_WITH_D1_DATABASE_ID` と置き換える。

### 3. D1 schema

リポジトリルートで次を1回実行する。

```bash
npm install
npm run db:init
```

またはCloudflare DashboardのD1 Consoleで `cloudflare/gallery-worker/schema.sql` の内容を実行する。

### 4. Secrets

WorkerのSecretsに以下を登録する。値はGitHubへコミットしない。

- `EDITOR_PASSCODE`: 編集画面用パスコード
- `SESSION_SECRET`: 十分長いランダム文字列

### 5. GitHub連携Deploy

Cloudflare Dashboard → Workers & Pages → Create application → Import a repository から
`branzfamily01/mekousai-79` を選択。

- Production branch: `main`
- Root directory: repository root
- Build command: empty
- Deploy command: `npx wrangler deploy`

### 6. 動作確認

本番URLで以下を確認する。

- `/` が表示される
- `/programs.html` が表示される
- `/api/health` が `{ "ok": true, ... }`
- `/editor.html` でログインできる
- iPhoneから写真を3枚アップロード
- `/gallery.html?category=preparation` に3枚表示
- 代表写真変更
- 非公開→再公開
- 1枚削除

## 写真追加の日常運用

本番化後は `editor.html` をiPhoneで開くだけ。

1. パスコードでログイン
2. 複数写真を選ぶ
3. カテゴリ・日付・コメントを指定
4. 公開

GitHub / Cloudflare Dashboard / ChatGPTを毎回触る必要はない。
