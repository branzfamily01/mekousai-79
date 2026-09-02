# 第79回 目高祭（めこうさい）特設サイト

東京都立目黒高等学校 第79回目高祭の特設サイト。GitHub Pagesで公開できる静的フロントエンドです。

## 写真運用

- `editor.html`：iPhone向け編集画面。複数写真を選んでカテゴリ別に公開
- `gallery.html?category=...`：カテゴリ別の写真アルバム
- 公開写真はCloudflare Worker + D1 + R2から読み込み、写真追加のたびにGitHub Pagesを再デプロイする必要はありません
- アップロード前にブラウザでJPEGへ再圧縮し、EXIF（位置情報等）を除去します

Cloudflare側の実装は `cloudflare/gallery-worker/` にあります。Secret値はGitHubへ置きません。
