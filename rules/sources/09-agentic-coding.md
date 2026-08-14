# Claude Code / エージェント支援開発の運用

出典: https://code.claude.com/docs/en/best-practices （2026-08-11 に本文を取得して確認）

> **注記**: 本ファイルは 2026-08-11 の監査で全面的に書き直した。
> 初版には出典に存在しない記述（「CLAUDE.md は60行程度が公式推奨」「TDD が単独で最も強力なパターン」）が
> 含まれていた。以下は公式ページに実在する内容と、本プロジェクト独自の判断とを明確に分けている。
>
> **追記（2026-08-12）**: この書き直し自体も、2026-06〜07に公開されたループエンジニアリング関連の
> 一次情報（Anthropic「Getting started with loops」、Addy Osmani の一連の記事）を調査範囲に
> 含めていなかった。ループに関する内容は [10-loop-engineering.md](10-loop-engineering.md) に分離した。

---

## 公式ページに実在する内容

### 前提: コンテキストウィンドウが最大の制約

> Most best practices are based on one constraint: Claude's context window fills up fast,
> and performance degrades as it fills.

ほとんどのベストプラクティスがこの1つの制約から導かれている。
コンテキストが埋まると、Claude は以前の指示を「忘れ」たり、間違いを増やしたりする。

**この制約への対処は、節約（`/clear`、CLAUDE.mdを短く保つ）だけでは不十分。**
コンテキストは長時間の作業やループでは必ず尽きる。尽きた後にクリーンな状態から再開できるよう、
判断の根拠を会話の外（`docs/specs/`、`CONTEXT.md`、ADR）に書き出しておくことが要る
（[10-loop-engineering.md](10-loop-engineering.md)、[01-definition-of-done.md](../01-definition-of-done.md) G0）。

### 1. 検証手段を与える（Give Claude a way to verify its work）

公式ページで最初に置かれている項目。

- Claude は「done に見えた」時点で止まる。実行できるチェックが無ければ、
  **人間が検証ループそのものになる**（すべての誤りが、人間が気づくまで放置される）。
- pass/fail を返すものを与えれば、ループは自律的に閉じる ──
  Claude が作業し、チェックを走らせ、結果を読み、通るまで反復する。
- チェックの実体: テストスイート、ビルドの終了コード、リンタ、
  出力をフィクスチャと突き合わせるスクリプト、スクリーンショット比較。
- 成功を主張させるのではなく、**証拠（テスト出力、実行したコマンドとその戻り値）を示させる**。

→ 本ルール群が `pnpm verify` を G1 ゲートの実体として定義しているのはこれに対応する。

### 2. 探索 → 計画 → 実装 → コミット

> Letting Claude jump straight to coding can produce code that solves the wrong problem.

plan mode で探索と実行を分離する。推奨されるのは4フェーズ（Explore / Plan / Implement / Commit）。

ただし公式は**計画のオーバーヘッドにも言及している**:
スコープが明確で修正が小さいもの（typo、ログ1行、変数名の変更）は直接やらせてよい。
**「差分を1文で説明できるなら計画は飛ばす」**。

→ 本ルール群の G0（plan mode で受け入れ条件を合意）は、この但し書きも含めて採用する。

### 3. CLAUDE.md は簡潔に保つ

公式に**行数の規定は無い**。実在するのは次の定性的な指針:

> There's no required format for CLAUDE.md files, but keep it short and human-readable.

> Keep it concise. For each line, ask: *"Would removing this cause Claude to make mistakes?"*
> If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!

失敗パターンとしても明記されている:

> **The over-specified CLAUDE.md.** If your CLAUDE.md is too long, Claude ignores half of it
> because important rules get lost in the noise.

含めるべきもの／除くべきものの対比表も示されている。含める側の例:
Claude が推測できない Bash コマンド、既定と異なるコードスタイル、テストの実行方法、
リポジトリの作法、プロジェクト固有のアーキテクチャ判断、環境の癖、非自明な落とし穴。
除く側の例: コードを読めば分かること、言語の標準的な慣習、詳細なAPIドキュメント、
頻繁に変わる情報、「きれいなコードを書く」のような自明な指針。

**本プロジェクトの運用値（公式値ではない）**: `CLAUDE.md` は **60〜80行**を目安とする。
超えたら、行ごとに「これを消したら Claude が間違えるか」を問うて削る。
時々しか関係しない知識は Skills に、必ず実行させたいものは Hooks に逃がす。

### 4. 敵対的レビューのステップを置く（Add an adversarial review step）

> The longer Claude works unattended, the more an independent check matters
> before you count the work as done.

新しいコンテキストで動くサブエージェントは、**変更を生んだ推論を見ずに差分と基準だけを見る**ため、
結果をそれ自体として評価できる。

**重要な但し書き**（公式が明記している）:

> A reviewer prompted to find gaps will usually report some, even when the work is sound,
> because that is what it was asked to do. Chasing every finding leads to over-engineering:
> extra abstraction layers, defensive code, and tests for cases that can't happen.
> Tell the reviewer to flag only gaps that affect correctness or the stated requirements,
> and treat the rest as optional.

→ レビュアーには「正しさと明示された要件に影響する欠陥だけを挙げよ」と指示する。
すべての指摘を潰そうとすると過剰設計になる。

### 5. 失敗パターン

- **The kitchen sink session**: 無関係なタスクを混ぜる → `/clear`
- **Correcting over and over**: 2回修正して直らなければ `/clear` して指示を書き直す
- **The over-specified CLAUDE.md**: 上記
- **The trust-then-verify gap**: もっともらしいがエッジケースを扱わない実装。
  → **検証できないものを出荷しない**
- **The infinite exploration**: スコープなしの調査 → サブエージェントに逃がす

---

## DORA 2025 との接続（[04-testing-delivery-dora.md](04-testing-delivery-dora.md) 参照）

- AIはスループットを上げるが、**変更失敗率と手戻り率を上げる**方向にも作用する。
- 原因は「レビューとデプロイの基盤が生成速度を吸収できない」こと。
- AIは **既存の強み・弱みの増幅器**。

---

## 本プロジェクトが採る方針（上記からの導出）

1. **人間のレビュー容量を前提にした合格基準を作らない。** 機械的ゲート（型・lint・テスト・CI）を主軸にする。
   ── 公式の「検証手段を与える」＋ DORA の「レビュー基盤が吸収できない」から。
2. **1回の変更を小さく保つ。** レビュー可能な粒度を超えたら分割する。
3. **テストを先に書く。** これは公式が TDD を名指しで推奨しているからではなく、
   公式の言う「pass/fail を返すチェック」として**テストが最も汎用的だから**である。
   本プロジェクトの判断として、バグ修正の回帰テストのみ MUST、新機能は SHOULD とする。
   ただし**ループで実装する場合、新機能にも成功テストが無ければループが回らない**。
   G0で書いた停止条件をそのままテスト名にする運用にすれば、この非対称は実務上ほぼ解消する
   （[10-loop-engineering.md](10-loop-engineering.md)、[30-testing.md](../30-testing.md) TEST-06）。
4. **完了前にサブエージェントの独立レビューを通す。** ただし指摘の取捨は上記の但し書きに従う。
   無人ループの場合、このレビューは任意の推奨ではなく**停止条件の判定機構そのもの**になる
   （[10-loop-engineering.md](10-loop-engineering.md) LOOP-03。実装した本人に採点させない）。
5. **手戻り率を意識する。** 「一度出したものを直し続けている」状態は、
   速度が出ているのではなく品質ゲートが機能していない兆候。

---

## ルールへの反映

`README.md`（このルール群の運用方法）、`CLAUDE.md`、`00-principles.md`、`30-testing.md`。
