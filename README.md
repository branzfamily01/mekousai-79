# 第79回 目高祭（めこうさい）特設サイト

東京都立目黒高等学校 第79回目高祭の特設サイトです。現在の本番構成は **Cloudflare Workers Static Assets + D1 + R2** を正とします。GitHubはソースコードの正本・自動デプロイ元として残します。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/branzfamily01/mekousai-79)

## Cloudflare構成

- 公開サイト：Cloudflare Workers Static Assets
- `editor.html`：iPhone向け写真編集画面
- `gallery.html?category=...`：カテゴリ別写真アルバム
- R2 `mekousai-79-media`：写真ファイル本体
- D1 `mekousai-79-gallery`：カテゴリ、日付、コメント、公開状態、代表写真などの台帳
- Worker API：`/api/*`
- 写真配信：`/media/*`

公開サイトと写真APIを同一Originで配信するため、Netlifyや別Worker URLを仲介する必要はありません。

## 写真運用

- iPhoneから複数写真を一括選択可能
- カテゴリ、撮影日、コメント、公開/非公開を指定可能
- 代表写真の変更、編集、削除が可能
- アップロード前にブラウザでJPEGへ再圧縮し、EXIF（位置情報等）を除去
- 写真追加のたびにGitHubを編集したりサイトを再構築したりする必要はありません

## 初回Deploy

上の **Deploy to Cloudflare** から進むと、CloudflareがWrangler設定を読み、D1とR2を自動プロビジョニングしてWorkerへbindingします。設定画面では `EDITOR_PASSCODE` と `SESSION_SECRET` をSecretとして入力してください。実値はGitHubへコミットしません。

D1 migrationは `npm run deploy` の中で自動適用されます。

詳しい手順・確認項目は `CLOUDFLARE_DEPLOY.md` を参照してください。
