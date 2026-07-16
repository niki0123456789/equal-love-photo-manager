# =LOVE 生写真管理 Ver1.04

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


## Ver1.04
- 絞り込みをボトムシートへ集約
- 選択中条件をチップ表示
- 一覧ごとの並び順を統一
- 復元・全削除前の自動バックアップ履歴
- Schema Version・event_id移行対応
- Excel/CSV/JSONデータ更新ツール


## Ver1.04
- メンバー別クイック入力モード
- イベント単位の全メンバー×ヨリ・チュウ・ヒキチェック表
- イベントカード・クイック入力・チェック表から一括操作
- 3種所持済み、未所持を欲しい追加、欲しい解除、所持数リセット
- 一括操作の直前に自動バックアップ


## Ver1.04
- クイック入力・イベント表は初期状態を古い順に変更
- 両画面に古い順／新しい順の並び替えを追加
- クイック入力の移動ボタンを「前へ／次へ」に変更
- TOP右上の歯車へ推し設定・バックアップ・使い方・バージョン情報を集約
- 推し設定の有無に関係なくメンバーを五十音順で表示
- 推しメンをバッジ・枠・リボンで明示
