# =LOVE 生写真管理 Ver0.96

## PWA機能
- iPhoneのSafariで共有ボタンから「ホーム画面に追加」
- ホーム画面に専用アイコンを表示
- ホーム画面から起動するとブラウザの枠を省いたアプリ表示
- 一度オンラインで開けば、通信がない状態でも閲覧可能
- 新版が公開された場合は画面内に更新案内を表示

## キャッシュ更新
CSS・JavaScript・JSONはVer0.96のURLで読み込み、Service Workerのキャッシュ名もバージョンごとに変更しています。

## Ver0.95から更新するファイル
```text
index.html
css/style.css
js/app.js
data/config.json
manifest.webmanifest
service-worker.js
icons/icon-192.png
icons/icon-512.png
icons/apple-touch-icon.png
CHANGELOG.md
README.md
```

`events.json`、`members.json`、`positions.json`は更新不要です。
