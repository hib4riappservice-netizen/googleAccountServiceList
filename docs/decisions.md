# 技術的決定の記録

`rules/60-delivery-ops.md` OPS-04（SHOULD）に基づく。判断とその理由を残す。

---

## 2026-08-14: リポジトリを公開にして GitHub branch ruleset で main を保護する

**背景**: テンプレート（`01_xxx`）からサービス立ち上げ時、非公開リポジトリのままでは
GitHub branch ruleset が作成できない（Free プランは 403 で拒否される。Pro 以上が必要）。

**決定**: リポジトリを公開に変更し、`protect-main` ruleset（`pull_request`必須・
`deletion`禁止・`non_fast_forward`禁止）を作成した。公開前に、コミット履歴と
追跡ファイルにシークレット・認証情報が含まれていないことを確認済み
（`.env*`・鍵ファイルは元々 `.gitignore` 対象、コミットは初期テンプレートコミット1件のみ）。

**理由**: `00-principles.md` P6「人の注意力に依存しない。機械が落とせる形に変換する」に従い、
ローカルフック（`--no-verify`で回避可能）よりサーバー側の強制を優先する。

**`.githooks/pre-commit` は残す。** ruleset は「PRを経由すること」は強制するが、
ローカルの早期フィードバック（コミット前に気づく）の価値は別にあるため。

## 2026-08-12: CSP の `script-src` に `unsafe-inline` を許可する

**背景**: `checklists/release.md` SEC-92「`unsafe-inline` を避けている」を満たすため、
`next.config.ts` で `script-src 'self'` を試した。

**決定**: `script-src 'self' 'unsafe-inline'` を採用する。

**理由**: `next build && next start` の状態で Playwright を使って実測したところ、
`unsafe-inline` を外すと Next.js が RSC のペイロードを渡すために注入するインラインscriptが
CSP違反でブロックされ、ハイドレーションが壊れた（`React error #412`、コンソールにCSP違反2件）。
現時点ではペイロードに機微情報を含む機能（認証・決済等）が無いため、この妥協を許容する。

**見直し条件**: 認証や決済など、XSS経由のインラインscript実行が実害に直結する機能を追加する
タイミングで、`middleware.ts` によるnonceベースのCSPへ移行し、`unsafe-inline` を外す。
