# =LOVE 生写真管理 Ver0.95

## データ管理機能
- バックアップ選択時に形式・値・作成日時を自動確認
- 復元前に作成日時と所持／直筆／欲しい件数を表示
- 2段階確認付きの保存データ全削除
- `events.json`の全イベントに`addedDate`を追加
- `members.json`の`includeEventIds`／`excludeEventIds`で表示例外を設定
- バックアップ画面でデータ不備を自動確認

## 卒業メンバーの例外設定
卒業後発売の商品を表示する場合：

```json
"includeEventIds": ["2026-07-02"]
```

対象期間内の商品を個別に非表示にする場合：

```json
"excludeEventIds": ["2021-02-01"]
```

`excludeEventIds`が優先されます。同じIDを両方に入れるとエラー表示されます。

## Ver0.925から更新するファイル
```text
index.html
css/style.css
js/app.js
data/events.json
data/members.json
data/config.json
CHANGELOG.md
README.md
```

`positions.json`は更新不要です。
