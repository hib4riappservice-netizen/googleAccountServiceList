# 30. テストと品質保証

根拠: [sources/04-testing-delivery-dora.md](sources/04-testing-delivery-dora.md) /
[sources/09-agentic-coding.md](sources/09-agentic-coding.md)

---

## なぜテストを厚めに要求するのか

DORA 2025 の調査によれば、AI支援開発は**スループットと正の相関**を持つ一方で、
**変更失敗率・手戻り率の増加**とも相関する。原因は「AIがコード生成の速度を上げるが、
レビューとデプロイの基盤がそれを吸収しきれない」こと。AIは既存の強み・弱みの**増幅器**である。

同時に Anthropic 公式は、エージェントに **「pass/fail を返す検証手段」を与えること**を
最優先の実践として挙げている（"Give Claude a way to verify its work"）。
検証手段が無ければ**人間が検証ループそのものになり**、すべての誤りが人間の気づきを待つことになる。
**本プロジェクトの判断として、その検証手段のうち最も汎用的なものをテストとみなす**
（公式が TDD を名指しで最上位に置いているわけではない ── [sources/09-agentic-coding.md](sources/09-agentic-coding.md)）。

→ 結論: **個人開発 + Claude Code においては、テストは品質保証であると同時に、
エージェントの制御装置である。** 人間のレビュー容量を前提にした基準は破綻する。

---

## TEST-01 テストの3層と配分（MUST）

テストピラミッドを維持する。**逆ピラミッド（遅いE2Eと手動確認が中心）はアンチパターン**。

| 層 | ツール | 対象 | 目安 | 実行時間目標 |
|---|---|---|---|---|
| **ユニット** | Vitest | 純粋なビジネスロジック、変換、バリデーション、計算 | 多数 | 全体で 10秒以内 |
| **統合** | Vitest（テストDB使用） | DAL、Server Action、Route Handler、**認可** | 機能ごとに数本 | 全体で 60秒以内 |
| **E2E** | Playwright | クリティカルパスのみ | **20〜30本** | 全体で 5分以内 |

E2Eを増やしすぎない。**高価な実行時間をどこに使うかが論点**であり、
E2Eは「複数レイヤをまたぐ結合が壊れていないこと」の確認に限定する。

---

## TEST-02 何をテストするか / しないか（MUST）

### 必ずテストする

- **認可**: 「他人のリソースを操作しようとすると失敗する」── リソースを扱う各操作に**1本ずつ必須**
- **バリデーション**: 境界値、不正入力、空、極端に長い値
- **ビジネスルール**: 料金計算、状態遷移、権限マトリクス
- **バグ修正**: 修正前に失敗し、修正後に通る回帰テスト（**修正より先に書く**）
- **クリティカルパス**: サインアップ → ログイン → 主要アクション → ログアウト、（あれば）課金

### テストしない

- フレームワークの機能（Next.jsのルーティングが動くか、など）
- 実装の詳細（内部state、privateメソッド、呼び出し回数）
- 見た目の細部（スナップショットの乱用。壊れやすく、何が悪いか分からない）

> Testing Library の原則: **「ユーザーが見るもの・すること」をテストする。**
> `getByRole` / `getByLabelText` を使い、`data-testid` は最後の手段。

---

## TEST-03 テストの書き方

- **MUST** テスト間で状態を共有しない。**各テストが単独実行でも通る**
  （共有していると、テストの成否が実行順に依存し、ゲートとして信用できなくなる）。
- **MUST** **時刻・乱数・外部APIを固定する**（フェイクタイマー、シード、モックサーバー）。
  固定しないと flaky になり、TEST-04 の問題に直結する。
- **SHOULD** 1テスト1シナリオ（1アサーション主義にはこだわらない）。
- **SHOULD** テスト名は **「何をしたら、どうなる」**。日本語でよい。
  `it('他人の投稿を削除しようとすると Forbidden になる')`
- **MAY** Arrange / Act / Assert を視覚的に分ける。

---

## TEST-04 flaky テストを許さない（MUST）

flakyテストは、テストがない状態より悪い（信頼を壊し、赤を無視する習慣を作る）。

- **MUST** flaky を見つけたら **その場で直すか、削除する**。「たまに落ちる」を放置しない。
- **MUST** `test.skip` / `test.only` をコミットしない（lintで落とす）。
- **MUST** E2E で固定の `waitForTimeout` を使わない。**条件待ち**（`expect(locator).toBeVisible()`）を使う。
- **SHOULD** CI のリトライは1回まで。それで通るなら flaky として記録する。

---

## TEST-05 カバレッジの扱い（SHOULD）

- カバレッジは **指標であって目標ではない**。数字合わせのテストを書かない。
- 目安: `data/`（DAL）と `lib/`（ドメインロジック）は **80%以上**。UI層には数値目標を置かない。
- カバレッジが低い箇所より、**「認可のテストがない箇所」を先に潰す**。
- **`data/` が生まれた時点で**、CIにカバレッジしきい値のジョブを追加する（SHOULDのまま。
  数値を強制すると数字合わせのテストを誘発するため、閾値割れはブロックではなく可視化に留める）。
  それまでは対象コードが存在しないため、この項目は判定不能として扱う。

---

## TEST-06 開発の進め方（SHOULD、ただし下記はMUST）

推奨サイクル:

```
1. 受け入れ条件を Given/When/Then で書く       ← G0
2. 失敗するテストを書く（red）
3. 通す最小限の実装を書く（green）
4. 整える（refactor）── テストは緑のまま
5. G2 の7項目で自己レビュー
```

- **MUST** バグ修正は必ず「失敗する回帰テストを書く」から始める（これだけは例外なし）。
- **SHOULD** 新機能もテストから始める。少なくとも**受け入れ条件をテスト名として先に書く**。

---

## TEST-07 コマンド（MUST）

`package.json` に以下を用意し、**Claude Code がいつでも実行できる**ようにする。

```jsonc
{
  "scripts": {
    "typecheck":  "tsc --noEmit",
    "lint":       "eslint . --max-warnings 0",
    "format:check": "prettier --check .",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:e2e":   "playwright test",
    "build":      "next build",
    "verify":     "pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build",
    "verify:full": "pnpm verify && pnpm test:e2e"
  }
}
```

`pnpm verify` が **G1 ゲートの実体**。これが緑でない状態を「実装完了」と呼ばない。

**`pnpm verify` に `test:e2e` を含めない（MUST の理由がある非対称）。**
E2Eは `next build && next start` を要し、フィードバックが遅い（[TEST-01](#test-01-テストの3層と配分must)
で全体5分以内と定めている）。日常のイテレーションでは `verify` の速さを優先する。

- **MUST** クリティカルパスに触れる変更には **`pnpm verify:full` を使う**。`verify` だけを
  停止条件にすると、E2Eを一度も走らせずに「完了」と判定できてしまう。
- **MUST** G3（リリース前）は常に `verify:full` 相当（CIの `test:e2e` ジョブ）で判定する。
- **MUST** [70-loop-engineering.md](70-loop-engineering.md)のループでは、**turn単位の内部反復**と
  **マージ前のゲート**を区別する。turn単位は対象を絞った高速なテスト（例:
  `pnpm test <file>`）でよいが、**マージする前には必ずCI全体（`verify:full`相当）を通す**。
  内部反復まで`verify:full`にすると、E2Eの遅さ（[TEST-01](#test-01-テストの3層と配分must)）が
  turn上限（[70-loop-engineering.md](70-loop-engineering.md) LOOP-01）を圧迫する。
  （2026-08-13追記: 初版は全ての停止条件に`verify:full`を要求しており、実際の
  最初のループ実行〔`docs/specs/parse-shortstat.md`〕がこれに反する形になった。
  ループの内部反復とマージゲートは別物として整理し直した）

---

## TEST-08 CIで落とす（MUST）

CIで必ず実行する: `typecheck` / `lint` / `format:check` / `test` / `build` / `test:e2e`。

- **MUST** 赤のままマージしない。
- **MUST** CI で `--frozen-lockfile` を使う（[20-security.md](20-security.md) SEC-10）。
- **SHOULD** E2E は本流ブランチとリリース前に走らせる（毎コミットでは重い場合）。
