# Core Web Vitals

出典: https://web.dev/articles/defining-core-web-vitals-thresholds / https://web.dev/vitals/

## 「良好（good）」のしきい値（2026年時点で変更なし）

| 指標 | 意味 | good | 要改善 | 不良 |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | 読み込み速度 | **≤ 2.5s** | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | 応答性 | **≤ 200ms** | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | 視覚的安定性 | **≤ 0.1** | ≤ 0.25 | > 0.25 |

## 評価方法

- Google は **実ユーザーデータの75パーセンタイル** で評価する。
  つまり「訪問の75%が good であること」が合格条件。
- ランキングシグナルとして機能する（page experience）。
- ラボ計測（Lighthouse）とフィールド計測（CrUX / RUM）は別物。**ラボで良くてもフィールドで悪いことがある**。
  個人開発では初期はラボ計測をゲートに使い、実ユーザーが付いたら RUM に切り替えるのが現実的。

## 個人開発で効きやすい打ち手

- LCP: 画像の最適化（`next/image`）、ヒーロー画像の `priority`、フォントの `next/font` によるセルフホスト
- CLS: 画像・埋め込みに明示的な width/height または aspect-ratio、フォントの `font-display: swap` + サイズ調整
- INP: クライアントJSの削減（Server Component をデフォルトにする）、長いタスクの分割

## ルールへの反映

`40-frontend-ux.md`、`checklists/release.md`。
