# =LOVE 生写真管理 Ver1.0.0

スマートフォンで使える、=LOVE生写真コレクション管理Webアプリです。

## 主な機能

- メンバー別／全メンバーの所持枚数管理
- ヨリ・ヒキ・チュウの登録
- 直筆・欲しい・提供可能一覧
- 未所持一覧、コンプ率、年代別統計
- 現役メンバー／卒業メンバー対応
- 最推し・推し・気になる設定
- JSONバックアップ・復元
- データ不備チェック
- PWA・ホーム画面追加・オフライン閲覧
- 更新通知、データ更新日、使い方、バージョン情報

## iPhoneでアプリとして使う

1. SafariでGitHub Pagesを開く
2. 共有ボタンを押す
3. 「ホーム画面に追加」を選ぶ
4. ホーム画面のアイコンから起動する

## データ保存

所持枚数などはブラウザ内に保存されます。端末変更やSafariデータ削除に備えて、バックアップ画面から定期的にJSONを保存してください。

## ファイル構成

```text
index.html
manifest.webmanifest
service-worker.js
css/style.css
js/app.js
data/events.json
data/members.json
data/positions.json
data/config.json
icons/
```

## Ver0.99から更新するファイル

```text
index.html
css/style.css
js/app.js
data/config.json
manifest.webmanifest
service-worker.js
CHANGELOG.md
README.md
```

`events.json`、`members.json`、`positions.json`、`icons`内の画像は更新不要です。
