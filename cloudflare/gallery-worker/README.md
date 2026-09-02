# 目高祭 写真公開バックエンド

公開サイトは GitHub Pages のまま維持し、写真だけ Cloudflare Worker + D1 + R2 で追加・配信します。

- Worker: 認証・公開API・写真配信の門番
- D1: 写真のカテゴリ、日付、コメント、公開状態、代表写真の台帳
- R2: 写真ファイル本体
- Secrets: `EDITOR_PASSCODE`, `SESSION_SECRET`（GitHubには保存しない）

## 初回設定

1. R2 bucket `mekousai-79-media` を Standard で作成
2. D1 database `mekousai-79-gallery` を作成
3. D1 の database ID を `wrangler.toml` の `REPLACE_WITH_D1_DATABASE_ID` に設定
4. `schema.sql` を D1 に実行
5. Worker secrets に `EDITOR_PASSCODE` と十分長いランダムな `SESSION_SECRET` を設定
6. Worker を deploy
7. 発行された `https://...workers.dev` をリポジトリ直下の `site-config.js` に設定

`EDITOR_PASSCODE` や `SESSION_SECRET` の値はコミットしないでください。
