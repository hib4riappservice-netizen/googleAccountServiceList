# ループエンジニアリング / ハーネスエンジニアリング

出典（2026-08-12 に本文を取得して確認）:
- https://claude.com/blog/getting-started-with-loops （Anthropic 公式）
- https://addyosmani.com/blog/loop-engineering/ （Addy Osmani）
- https://addyo.substack.com/p/own-the-outer-loop （Addy Osmani）
- https://addyosmani.com/blog/agent-harness-engineering/ （Addy Osmani）

> **注記**: このファイルは 2026-08-12 に新設した。本ルール群は 2026-08-11 策定で、
> 上記いずれの一次情報（2026-06-07〜07 公開）も参照範囲に含めていなかった
> （[09-agentic-coding.md](09-agentic-coding.md) も同様の欠落があった）。
> `README.md` のメンテナンス規律（「出典に実在しない記述を『公式が言っている』と書かない」）に従い、
> 以下は実際にページに書かれている文と、本プロジェクト独自の判断とを明確に分けている。

---

## ハーネスエンジニアリングとループエンジニアリングの関係

Osmani は別記事で、エージェントを次のように定義している:

> "Agent = Model + Harness. If you're not the model, you're the harness." — Viv Trivedy の引用
> "A decent model with a great harness beats a great model with a bad harness."

ハーネスは「システムプロンプト・`CLAUDE.md`・スキル・ツール・フック・可観測性」など、
**エージェントが安全確実に動くための土台全般**を指す。ループはその上に乗る**制御方式の一つ**。

**本ルール群はこれまでハーネスに属する（`pnpm verify`、CI、DAL境界などの検証手段）。
ループはこのファイルで初めて明示的に扱う。**

---

## 公式ページに実在する内容

### ループの定義

> "loops as agents repeating cycles of work until a stop condition is met" — Anthropic

Osmani も同義に定義している:

> "Loop engineering is replacing yourself as the person who prompts the agent.
> You design the system that does it instead."

### 5つの構成要素（Osmani）

> "1. Automations that go off on a schedule and do discovery and triage by themselves.
> 2. Worktrees so two agents working in paralell dont step on each other.
> 3. Skills to write down the project knowledge the agent would otherwise just guess.
> 4. Plugins and connectors to plug the agent into the tools you already use.
> 5. Sub-agents so one of them has the idea and a different one checks it."

### worktree による隔離

> "A git worktree fixes it, its a separate working directory on its own branch sharing
> the same repo history, so one agent's edits literally can not touch the other one's checkout."

### 停止条件と turn 上限（Anthropic `/goal`）

> "/goal get the homepage Lighthouse score to 90 or above, stop after 5 tries."
>
> "Each time Claude tries to stop, an evaluator model checks your condition and sends it
> back to work until the goal is met or a number of turns you define is reached."

**turn上限の具体的な数値（例: 5）は Anthropic の使用例であり、公式が定める既定値ではない。**
本プロジェクトが LOOP-01 で採用する初期値は、この使用例に準じた**プロジェクトの判断**である。

### 検証はループの外にある人間の責務（Own the Outer Loop）

> "The model may write the line, but the Verdict is mine."
> "Engineers own the outer loop."
>
> "Inside the system: we collect inputs... The agent loop investigates the task, implements
> a plan, and verifies the result. Then, evidence crosses that boundary. A human, who owns
> the dependent system, sees the evidence and decides whether to proceed."
>
> "Someone must be able to explain exactly what changed, why it was safe,
> and what will happen if they're wrong."

→ G0（何を作るか）と、機械判定できない G2/G3 の項目（本ルール群でいう「人間項目」）は、
**ループの外に置くべきものである、という設計上の裏付け**になる。

### アンチパターン

> "When the loop runs itself its very tempting to stop having an opinion and
> just take whatever it gives back."
>
> "Verification is still on you. A loop running unattended is also
> a loop making mistakes unattended."

---

## 本プロジェクトが採る方針（上記からの導出）

1. **ループはハーネスの上に乗る。** ハーネス（`pnpm verify`・CI・DAL境界の強制）が
   先に緑/赤を返せる状態でなければ、ループの停止条件は書けない
   （[01-definition-of-done.md](../01-definition-of-done.md) G1 が前提）。
2. **5要素のうち Worktrees と Sub-agents（敵対的レビュー）を MUST にする。**
   Automations（scheduled routine）と Plugins/Connectors は、
   反復タスクの量が出てから導入する（時期尚早に増やさない）。
3. **turn 上限は Anthropic の使用例（5）を初期値として採用する。** プロジェクト固有の判断であり、
   タスクの性質によって調整してよい（[70-loop-engineering.md](../70-loop-engineering.md) LOOP-01）。
4. **検証（Verdict）は人間が持つ。** ループが「緑」と報告しても、それは実行の証拠であって、
   承認そのものではない。G0 の合意と、機械判定できない項目の最終確認は、常に人間側に置く。
5. **停止条件を書けないタスクをループに載せない。** 判定できないままループを回すのは、
   Osmani が警告する「意見を持つのをやめて、返ってきたものをそのまま受け取る」状態に直結する。

---

## ルールへの反映

`70-loop-engineering.md`（新設）、`01-definition-of-done.md`（G0成果物の永続化・停止条件）、
`60-delivery-ops.md`（worktree運用）、`09-agentic-coding.md`（敵対的レビューの位置づけ）。
