# 技術的決定の記録

`rules/60-delivery-ops.md` OPS-04（SHOULD）に基づく。判断とその理由を残す。

> **このリポジトリをテンプレートとして複製した場合の扱い**
>
> 以下の記録は2種類に分かれる。
>
> - **[汎用]** — このテンプレートを使う限り、どのサービスでも同じ判断になる。**残す**
> - **[固有]** — テンプレート元（`01_xxx`）でのみ起きた出来事。**新サービスでは削除してよい**
>
> 新しいサービスを立ち上げたら、[固有] の項目を消してから使い始めること。

---

## [固有] 2026-08-12: ブランチ保護をローカルフックで代替する

> この決定は下記「2026-08-13: GitHub branch ruleset」で置き換え済み。
> 経緯を残すために保持している。新サービスでは不要。

**背景**: DEV-01 (MUST)「`main` に直接コミットしない」をサーバー側（GitHub branch
ruleset）で強制しようとしたが、非公開リポジトリでは GitHub Pro 以上が必要
（Free プランは 403 で拒否される）。

**決定**: `.githooks/pre-commit` でローカルに同等のゲートを実装する。
`git config core.hooksPath .githooks` で有効化し、`main` ブランチでの
コミットを拒否する。緊急時は `ALLOW_COMMIT_ON_MAIN=1` で解除できる。

**理由**: `00-principles.md` P6「人の注意力に依存しない。機械が落とせる形に
変換する」に従う。サーバー側で強制できないなら、次善としてローカルで
機械的に落とす。

**既知の限界**: `core.hooksPath` はクローンごとのローカル設定であり、
リポジトリに含めても自動では有効化されない。新しく clone した環境では
`git config core.hooksPath .githooks` を手動で実行する必要がある
（`README.md` のセットアップ手順に明記すること）。また `git commit --no-verify`
で回避できる — これは Git 標準機能であり、フック自体では防げない。
真の強制が必要になったら、リポジトリを Public にするか GitHub Pro に
アップグレードして ruleset を使う。

## [汎用] 2026-08-12: CSP の `script-src` に `unsafe-inline` を許可する

**背景**: `checklists/release.md` SEC-92「`unsafe-inline` を避けている」を満たすため、
`next.config.ts` で `script-src 'self'` を試した。

**決定**: `script-src 'self' 'unsafe-inline'` を採用する。

**理由**: `next build && next start` の状態で Playwright を使って実測したところ、
`unsafe-inline` を外すと Next.js が RSC のペイロードを渡すために注入するインラインscriptが
CSP違反でブロックされ、ハイドレーションが壊れた（`React error #412`、コンソールにCSP違反2件）。
現時点ではペイロードに機微情報を含む機能（認証・決済等）が無いため、この妥協を許容する。

**見直し条件**: 認証や決済など、XSS経由のインラインscript実行が実害に直結する機能を追加する
タイミングで、`middleware.ts` によるnonceベースのCSPへ移行し、`unsafe-inline` を外す。

## [汎用] 2026-08-13: GitHub branch ruleset で main を保護する（ローカルフックから移行）

> **新サービスでは、この ruleset を手動で作成し直す必要がある。**
> GitHubのテンプレート複製では ruleset が引き継がれない（`docs/PLAYBOOK.md` 参照）。

**背景**: 2026-08-12の決定で「非公開リポジトリではGitHub Pro必須のため、
`.githooks/pre-commit`で代替する」とした。その後リポジトリを公開に変更した。

**決定**: `protect-main` ruleset（`pull_request`必須・`deletion`禁止・`non_fast_forward`禁止）を
作成した。**サーバー側への直接pushを実際に試し、`GH013: Repository rule violations`で
拒否されることを実測確認済み。**

**理由**: 公開リポジトリになった時点で、2026-08-12の決定が記録した「見直し条件」
（Publicにするか GitHub Pro にアップグレードする）が満たされたのに、
しばらく対応されていなかった（別セッションの監査で指摘された）。
ローカルフック（`.githooks/pre-commit`）は`--no-verify`で回避できる弱い防御であり、
サーバー側の強制に置き換えられるなら置き換えるべき。

**`.githooks/pre-commit` は残す。** ruleset は「PRを経由すること」は強制するが、
ローカルの早期フィードバック（コミット前に気づく）の価値は別にあるため。

## [固有] 2026-08-13: PR#2（Next.js基盤整備）が400行ルールに違反していたことを記録する

**発覚経緯**: 監査（loop-auditor-2、指摘A-2）で、`scripts/check-diff-size.mjs`導入
（PR#6）より前にマージされたPR#2の差分を同じ計測方法で測ったところ **405行**
（`git diff --shortstat 92115bd e4c9c4f -- . ':(exclude)pnpm-lock.yaml' ...`）で、
`01-definition-of-done.md` G0「差分400行以内・例外なし」に違反していたことが判明した。

**対応しない。** 理由: PR#2は`check-diff-size.mjs`が存在する前にマージされており、
当時は機械判定できなかった（G1の実体である`pnpm verify`自体がPR#2で初めて作られている）。
今からこのコミットを分割・書き換えるのは、履歴の書き換えという別のコストを払うだけで
実益が無い。**記録として残し、繰り返さないことを優先する。**

**再発防止**: `check-diff-size.mjs`は現在CIに接続済みで、以降のすべてのPRに対して
機械的に強制される（PR#3〜#9で実際に機能したことを確認済み）。
