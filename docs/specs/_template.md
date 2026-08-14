<!--
  G0 (rules/01-definition-of-done.md) の成果物テンプレート。
  コピーして docs/specs/<slug>.md として保存する（例: docs/specs/delete-own-post.md）。
  会話コンテキストにのみ存在する計画は G0 を満たさない。
-->

# <機能名>

## 1文の説明

<作る機能を1文で。言えないなら分割する>

## 受け入れ条件（Given / When / Then）

- Given <前提> / When <操作> / Then <結果>（正常系）
- Given <前提> / When <操作> / Then <結果>（主要な異常系。最低1本）

## 個人情報・課金情報の判定

<含む / 含まない。含む場合は rules/50-japan-compliance.md を先に読んだこと>

## 触るファイル（分かる範囲で）

-

## 停止条件（機械判定可能な形で1行）

<例: `pnpm test tests/xxx.test.ts` が緑になる>

## ループで実行する場合

- turn上限: <既定5。rules/70-loop-engineering.md LOOP-01>
- 作業場: <git worktree のパス>
- no-progress条件: 同一テストが2回連続で赤なら停止（既定）

## 満たせなかった条件

<実装後に記入。黙って落とさない>
