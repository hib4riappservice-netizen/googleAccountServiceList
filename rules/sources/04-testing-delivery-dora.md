# テスト戦略とデリバリー（DORA 2025 / テスト戦略 2026）

## DORA: State of AI-assisted Software Development (2025)

出典: https://dora.dev/insights/dora-2025-year-in-review/ /
https://cloud.google.com/resources/content/2025-dora-ai-assisted-software-development-report

年次レポートの名称が "Accelerate State of DevOps" から
**"State of AI-assisted Software Development"** に変更された。

### 指標の変化

従来の4指標（デプロイ頻度 / 変更のリードタイム / 変更失敗率 / 復旧時間）に加え、
2025年に **Rework Rate（手戻り率）** が追加され、準指標として **Reliability** が置かれた。

### AI支援開発に関する核心的な知見

- AI採用は **スループット（開発速度）と明確に正相関** する。
- 一方で **不安定性とも相関** する ── 変更失敗の増加、手戻りの増加、問題解決までのサイクルタイムの長期化。
- 原因は「量」と見られている: **AIはコード生成の速度を上げるが、レビューとデプロイの基盤がそれを吸収しきれない**。
- AIは銀の弾丸ではなく **既存の強み・弱みの増幅器（amplifier）** として機能する。

### この調査から本プロジェクトが取るべき結論

Claude Code を使う個人開発では、**書く速度ではなくレビューと検証がボトルネックになる**。
したがって「合格基準」は人間のレビュー容量を前提にせず、**機械的に落とせるゲート**を主軸に置く必要がある。
これが本ルール群で自動チェックを最優先にしている根拠。

## テスト戦略（2026年の実務的コンセンサス）

- テストピラミッドは依然有効。**逆ピラミッド（遅いE2Eと手動テスト中心）がアンチパターン**。
- 実務的な配分:
  - **ユニット**: ビジネスロジックと純粋関数を網羅的に
  - **統合**: データアクセスとAPIルート
  - **E2E**: ビジネスクリティカルなパスに **20〜30本程度**
- ツールの既定解:
  - **Vitest**（Vite設定を共有、並列実行がデフォルト、Jest比で高速）
  - **Playwright**（E2Eの現代的デファクト）
  - **Testing Library**（「ユーザーが見るもの・すること」をテストし、内部実装をテストしない）
- 2026年の論点は「ピラミッドが正しいか」ではなく **「高価な実行時間をどこに使うか」**。
  AI生成テストとflakyテスト負債が、各層への労力配分を変えた。

出典:
- https://www.pkgpulse.com/guides/vitest-jest-playwright-complete-testing-stack-2026
- https://www.digitalapplied.com/blog/software-testing-strategy-2026-engineering-reference
- https://www.techinterview.org/post/3233475391/frontend-testing-2026-vitest-playwright-visual-regression/

## ルールへの反映

`30-testing.md` 全体、`01-definition-of-done.md`（テスト3層の要求）、
`60-delivery-ops.md`（小さく出す・ロールバック可能にする）。
