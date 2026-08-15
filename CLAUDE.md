# プロジェクト規約

このファイルはプロジェクトルートに置く（またはリンクする）。**意図的に短く保つ。**
詳細は `rules/` を参照し、ここには「常に効く不変のルール」だけを書く。

## 進め方

1. **計画してから書く。** 実装前に、受け入れ条件（Given/When/Then）と触るファイルを提示して合意を取る。
2. **テストを先に書く。** バグ修正は必ず「失敗する回帰テスト」から始める。
3. **1変更1目的。** 差分400行を超えそうなら分割を提案する。
4. **完了と言う前に `pnpm verify` を通す。** 赤い状態を「完了」と呼ばない。
5. 通らなかった項目・落とした要件は**明示して報告する**。黙って落とさない。
6. **停止条件を先に決める。** 機械が緑/赤を返せない条件を「完了」の基準にしない。
7. **同じ失敗が2回続いたら、続けずに一度止めて報告する。** 直し続けるのは進捗ではない。

## 絶対に守ること

- **認可は `data/`（DAL）の中で行う。** 認証（誰か）と認可（このリソースの所有者か）の両方。
  ページの `redirect()` や middleware をセキュリティ境界として扱わない。
- **DBパッケージと `process.env` を `data/` の外で import しない**（設定モジュールを除く）。
- **クライアントに返すのは DTO のみ。** DBレコードやドメインオブジェクトをそのまま渡さない。
  Server Component から Client Component へ広い型のオブジェクトを渡さない。
- **外部入力は境界でスキーマ検証（Zod）を通す。** `searchParams` / `params` / フォーム / ヘッダ / 外部APIすべて。
- **Server Action は公開エンドポイント。** 引数を検証し、アクション経由でも認可が効くようにする。
- **`any` を使わない。** `unknown` から絞り込む。`@ts-ignore` ではなく `@ts-expect-error` + 理由。
- **秘密を `NEXT_PUBLIC_` に入れない。** `.env*` をコミットしない。
- **ログに秘密と個人情報を入れない。**
- **失敗は安全側に倒す。** 認可判定が例外で落ちたら「拒否」。
- **決済・課金確定・メール送信・Webhook受信は冪等にする。** イベントIDを一意制約付きで永続化し、
  2回目を副作用なしで返す。Webhookの再送は障害ではなく正常動作。署名検証だけでは二重課金を防げない。

## 実装の既定

- Server Component が既定。`'use client'` は必要な場所にだけ、ツリーの下の方に置く。
- 独立したデータ取得は `Promise.all` で並列化する。`params` / `searchParams` は `await` する。
- 非同期UIには loading / empty / error の**3つとも**実装する。
- 状態は判別可能なunionで表す（`isLoading` + `data` + `error` の並置にしない）。
- レンダリング中に副作用（Cookie操作、DB更新、revalidate）を起こさない。
- 依存を足す前に「10行で書けないか」を考える。

## UIを触るとき

- Tabキーだけで操作を完走できること。`outline: none` でフォーカスリングを消さない。
- フォーム項目に `<label>` を紐づける。プレースホルダで代用しない。
- 画像に width/height（または aspect-ratio）と適切な `alt`。
- コントラスト比 4.5:1 以上、タップ対象 24×24px 以上、375px幅で崩れない。

## 触ってはいけないもの

- `.env*`、本番の設定値、`db/migrations/` の適用済みマイグレーション
- lockfile の手動編集（コマンド経由で更新する）
- 既存テストを「通すために」書き換えること（仕様変更なら、その旨を先に報告する）

## 詳細ルール

| 参照先 | 内容 |
|---|---|
| `rules/00-principles.md` | 判断に迷ったときの原則 |
| `rules/01-definition-of-done.md` | **合格基準（G0〜G4ゲート）** |
| `rules/10-architecture.md` | ディレクトリ構成・DAL・TypeScript |
| `rules/20-security.md` | セキュリティ（OWASP Top 10:2025対応） |
| `rules/30-testing.md` | テスト戦略 |
| `rules/40-frontend-ux.md` | パフォーマンス・アクセシビリティ・UX |
| `rules/50-japan-compliance.md` | 日本の法令 |
| `rules/60-delivery-ops.md` | CI・リリース・運用 |
| `rules/checklists/feature.md` | 機能完成時チェックリスト |
| `rules/checklists/release.md` | リリース前チェックリスト |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
