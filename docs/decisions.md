# 技術的決定の記録

`rules/60-delivery-ops.md` OPS-04（SHOULD）に基づく。判断とその理由を残す。

---

## 2026-08-14: Googleサインイン実装時の技術決定（まとめ）

`docs/specs/google-signin.md` の実装に伴う決定。P9に従い自分で判断し記録する。

- **認証ライブラリ**: `next-auth`（Auth.js）v5系（`5.0.0-beta.32`）。App Router向け実装
  がv5系にしかなく、SEC-50上ライブラリ利用が前提のため。betaは認識済み、追従予定。
- **アクセストークンは`jwt()`のみで保持し`session()`には含めない**: `session()`は
  `/api/auth/session`経由でブラウザに返るため、含めるとXSS時にトークンを窃取されうる。
  後続機能は`next-auth/jwt`の`getToken()`で直接読む。
- **`access_type=offline`+`prompt=consent`を付与**: `refresh_token`は初回同意時にしか
  発行されず、今つけないと後続機能で全ユーザーに再同意を強制することになる。
- **`trustHost: true`**: 配信ドメイン未確定で`AUTH_URL`未設定だと本番相当環境で
  `UntrustedHost`エラーになる（実測）。ドメイン確定後は`AUTH_URL`に移行する。
- **CSPのnonce移行は見送り、別PRに切り出す**: 2026-08-12の決定の見直し条件
  （認証機能追加）に該当したが、400行ルールに収めるため今回のPRには含めない。
- **`server-only`を依存に追加**: ARC-03が要求するimportだが`package.json`に無かった
  （`data/`ファイルがこれまで無く未検出だった）。VitestはNext.js固有の解決を持たず
  例外になるため、依存追加と`tests/setup.ts`でのモックが両方必要だった。
  `01_xxx`側の同じ抜けは別途検討。

## 2026-08-14: 技術判断を人間に振らない運用ルール（P9）を追加する

**背景**: 依頼者（CEO）は設計・実装・セキュリティの専門知識を前提にできない。
「これでいいですか」と技術的な選択肢を尋ねられても判断できず、かつ最終責任は
依頼者が持つという状況で、Googleサインイン機能の要件定義中、技術的な実装方法まで
依頼者に質問していたことが判明した。

**決定**: `rules/00-principles.md` に **P9** を新設した。人間に判断を仰ぐのは
「お金」「個人情報の取扱い方針」「機械判定できない最終確認・最終承認」の3種類だけとし、
それ以外の技術判断（ライブラリ選定、DAL/型設計、検出アルゴリズム等）はエージェントが
`rules/` を基準に自分で決め、`docs/decisions.md` に理由を記録する。人間に見せる前に、
`pnpm verify` とレビュー3体の Critical/High 指摘をすべて解消するまで自律的に繰り返す。
`rules/70-loop-engineering.md`（LOOP-04/05）、`.claude/agents/spec-writer.md`、
`docs/PLAYBOOK.md` をP9に合わせて更新した。テンプレート（`01_xxx`）にも同じ変更を適用済み。

**理由**: `00-principles.md` P6「人の注意力に依存しない」の応用。専門知識のない依頼者に
技術的な合否判定を委ねること自体が、機能しない基準になる。

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
