# 第79回 目高祭（めこうさい）特設サイト

東京都立目黒高等学校 第79回目高祭の特設サイトです。

## 本番構成

- GitHub: ソースコードの正本
- Cloudflare Workers Static Assets: 公開サイト
- Cloudflare Worker API: 写真管理API
- Cloudflare R2: 写真本体
- Cloudflare D1: 写真のカテゴリ・説明・公開状態・代表写真
- `editor.html`: iPhone向け写真編集画面
- `gallery.html?category=...`: カテゴリ別写真アルバム

公開サイトと写真APIは **同じCloudflare Worker / 同じOrigin** で配信します。

## Cloudflareへ公開する

このリポジトリは既にGitHub上に存在するため、**Deploy to Cloudflareボタンではなく、Cloudflare Dashboardの「Import a repository」から既存リポジトリを直接接続してください。**

詳細手順: `CLOUDFLARE_DEPLOY.md`

Cloudflare側の設定は次だけです。

- Repository: `branzfamily01/mekousai-79`
- Project / Worker name: `mekousai-79`
- Production branch: `main`
- Root directory: repository root
- Build command: 空欄
- Deploy command: `npm run deploy`

Deploy scriptがD1/R2の作成・D1 ID解決・migration・binding・Static Assets deployを自動化します。

## 写真運用

本番化後は `editor.html` を開き、複数写真を選択してカテゴリ別に公開できます。アップロード前にブラウザ側でJPEGへ再圧縮し、EXIF（位置情報等）を除去します。

Secrets `EDITOR_PASSCODE` と `SESSION_SECRET` はCloudflare側だけに保存し、GitHubには保存しません。
