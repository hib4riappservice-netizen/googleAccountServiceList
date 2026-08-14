# サプライチェーン（npm エコシステム）

OWASP Top 10:2025 で **A03 Software Supply Chain Failures** が新設されたことに対応する実務ソース。

## 背景となった攻撃パターン

2025〜2026年に繰り返された典型:

1. メンテナのnpmトークンが窃取される
2. 汚染バージョンが公開される
3. `npm install` の実行から数秒でRAT（遠隔操作ツール）がC2サーバへ通信
4. npm側が削除するまで数時間、その間にインストールした全員が被害

つまり **「新しく公開された直後のバージョン」が最も危険**という時間的な性質がある。

## 有効な防御（コストの低い順）

### 1. Minimum Release Age（最も費用対効果が高い）

公開直後のバージョンを掴まないよう、一定日数経過したバージョンのみインストールする。
npm / pnpm / yarn / bun がネイティブ対応済み。

- 72時間（3日）: 現実的なライン
- 7日以上: より保守的

#### 設定キーと単位はパッケージマネージャごとに違う（重要）

**取り違えると未知の設定として黙って無視され、防御が効いていないことに気づけない。**

| PM | 設定場所 | キー | 単位 | 既定 | 対応版 |
|---|---|---|---|---|---|
| **pnpm** | `pnpm-workspace.yaml` | `minimumReleaseAge` | **分** | v11 以降は 1440（1日） | pnpm 10.16+ |
| pnpm (10.x) | `.npmrc` | `minimum-release-age` | 分 | なし | pnpm 10.x |
| **npm** | `.npmrc` | `min-release-age` | **日** | `null` | npm CLI 11.10.0+ |

npm 公式ドキュメントの記述（2026-08-11 取得）:
> **`min-release-age`** — Default: `null` / Type: `null or Number`.
> 日数で指定する時間枠。設定すると、npm は指定日数より前に公開されたバージョンのみを使って
> 依存ツリーを構築する。該当するバージョンが無い場合、コマンドは失敗する。

出典:
- npm 公式 config: https://docs.npmjs.com/cli/v11/using-npm/config
- pnpm 公式 supply chain security: https://pnpm.io/supply-chain-security
- https://charpeni.com/blog/protecting-against-compromised-packages-with-minimum-release-age

### 2. lockfile の厳格運用

- lockfile をコミットする
- CIでは `npm ci` / `pnpm install --frozen-lockfile` を使い、**CIがlockfileを暗黙に再生成しない**ようにする

### 3. provenance の検証

- `npm audit signatures` をインストール後に実行
- sigstore attestation により、tarball がどのワークフロー実行・コミット・リポジトリから作られたか検証できる

### 4. pnpm を使う場合の追加ハードニング

`minimumReleaseAge`、`blockExoticSubdeps`、`strictDepBuilds`、`allowBuilds`、
（必要なら）`trustPolicy: no-downgrade`

### 5. postinstall スクリプト

依存のライフサイクルスクリプトが最大の実行経路。pnpm の `allowBuilds` などで許可制にする。

## ブラウザ側のサプライチェーン（サードパーティスクリプト）

npm だけがサプライチェーンではない。ブラウザが外部ドメインから読む `<script>` も同じ問題を持つ。

### SRI が使えるものと使えないもの

**SRI（Subresource Integrity）はバージョン固定された配布物にしか使えない。**
提供元が「可変ファイル」として配布しているものにハッシュを固定すると、提供元が更新した瞬間に壊れる。

- **Stripe.js は SRI ハッシュの利用とセルフホストを公式に認めていない。**
  PCI DSS 準拠と Radar の不正検知のため、`js.stripe.com` から直接読ませる方針であり、
  SRI 対応の予定は無いと表明している（代わりに独自のスクリプト管理系で完全性を監視するとしている）。
  参照: https://github.com/stripe/stripe-js/issues/906
- Google の `gtag.js` も同様に可変で、ハッシュ固定は運用不能。

→ したがって SRI を**無条件の MUST にしてはいけない**。
決済ページで Stripe.js を読むことは `50-japan-compliance.md` JP-04（カード番号を自分のサーバーで受けない）
から要請されるため、無条件 SRI は MUST 同士の衝突を生む。

代替の防御: **CSP の `script-src` で読み込み元ホストを許可リスト化する**（SEC-92）。
SRI の一般的な解説: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity

→ ルールへの反映: `20-security.md` SEC-62（本数の上限）／SEC-64（SRIの適用範囲）

---

## GitHub Actions のハードニング

- Action は **コミットSHAでピン留め**する（`@v4` のようなタグは可変）
- `permissions:` を最小化（デフォルトで `contents: read`）
- シークレットは必要なジョブにだけ渡す

## 参考

- https://supabase.com/docs/guides/security/npm-security
- https://dev.to/trknhr/lessons-from-the-spring-2026-oss-incidents-hardening-npm-pnpm-and-github-actions-against-1jnp
- https://github.com/npm/cli/pull/8825

## ルールへの反映

`20-security.md`「依存関係」、`60-delivery-ops.md`「CI」。
