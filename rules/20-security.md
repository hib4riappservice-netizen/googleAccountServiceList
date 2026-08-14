# 20. セキュリティ

根拠: [sources/01-owasp-top10-2025.md](sources/01-owasp-top10-2025.md) /
[sources/02-nextjs-data-security.md](sources/02-nextjs-data-security.md) /
[sources/03-supply-chain.md](sources/03-supply-chain.md)

OWASP Top 10:2025 の各カテゴリに対応させている。**A01（アクセス制御）と A02（設定ミス）と
A03（サプライチェーン）で全体の大半の事故が起きる**ので、そこに厚みを置く。

---

## A01 アクセス制御（最重要）

- **SEC-01 (MUST)** 認可判定は DAL 内で行う。UI・ミドルウェア・ルーティングだけに依存しない。
  ミドルウェアの認証チェックは **UXのためのショートカット**であり、セキュリティ境界ではない。
- **SEC-02 (MUST)** 認証と認可を両方行う。「ログインしているか」だけでなく
  **「このリソースの所有者か / この操作の権限があるか」** を毎回確認する（IDOR対策）。
- **SEC-03 (MUST)** 拒否をデフォルトにする。明示的に許可されたものだけ通す。
- **SEC-04 (SHOULD)** リソースIDは推測しにくいもの（UUIDv4 / ULID）を使う。
  ただし**これは認可の代わりにならない**。連番IDを隠すのは多層防御の1層でしかなく、
  SEC-02 が正しく実装されていれば連番IDでも不合格理由にはならない。だから MUST ではない。
- **SEC-05 (MUST)** 「他人のリソースを操作しようとすると失敗する」テストを、
  リソースを扱う各エンドポイントに1本ずつ書く（[30-testing.md](30-testing.md)）。
- **SEC-06 (MUST)** SSRF対策: ユーザー入力のURLに対してサーバーからリクエストしない。
  必要な場合はスキーム・ホストの許可リストで制限し、リダイレクトを追わない。

---

## A02 設定ミス

A02 は「2番目に事故が多いカテゴリ」なので、他節と同様に**項目ごとにIDを振る**。
[checklists/release.md](checklists/release.md) の各項目はこのIDを参照する。

### 本番設定

- **SEC-90 (MUST)** `NODE_ENV=production`。デバッグ・詳細エラー表示が無効
- **SEC-91 (MUST)** HTTPS 強制（HSTS 有効）
- **SEC-92 (MUST)** セキュリティヘッダがすべて設定されている:
  - `Content-Security-Policy`（nonce ベース。`unsafe-inline` を避ける）
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY` または CSP の `frame-ancestors 'none'`
  - `Permissions-Policy`（使わない機能を無効化）
- **SEC-93 (MUST)** CORS が `*` でない。許可オリジンを明示
- **SEC-94 (MUST)** 認証Cookieが `HttpOnly` + `Secure` + `SameSite=Lax`
- **SEC-95 (MUST)** 本番DBの接続ユーザーが最小権限。DDL権限を持たせない
- **SEC-96 (MUST)** ストレージの公開バケットに非公開ファイルが入っていない
- **SEC-97 (MUST)** 管理画面・シードデータ・テスト用アカウントが本番に存在しない
- **SEC-98 (MUST)** `/.env`、`/.git`、ソースマップが公開されていない

### シークレット

- **SEC-99 (MUST)** リポジトリにシークレットを置かない。`.env*` を `.gitignore`。
  **履歴にも無いこと**を gitleaks 等で確認する
- **SEC-100 (MUST)** `NEXT_PUBLIC_` 接頭辞の変数に秘密を入れない
- **SEC-101 (MUST)** `process.env` にアクセスするのは DAL / 設定モジュールのみ（[10-architecture.md](10-architecture.md)）
- **SEC-102 (MUST)** 漏れたら **rotate する**。「消したから大丈夫」ではない

---

## A03 サプライチェーン

- **SEC-10 (MUST)** lockfile をコミットする。CI では `pnpm install --frozen-lockfile`（npmなら `npm ci`）。
  **CI が lockfile を暗黙に再生成しないこと**。
- **SEC-11 (MUST)** リリース遅延（minimum release age）を **3日以上**に設定する。
  公開直後の汚染バージョンを掴む窓を閉じる。攻撃の多くは公開から数時間で削除されるまでの間に起きている。
  **設定キーと単位はパッケージマネージャごとに異なる。取り違えると黙って無視される**ので下記のとおり書く。
- **SEC-12 (MUST)** 依存を追加したPRの本文に、次の4点を記載する（`docs/third-party.md` にも追記）:
  パッケージ名 / 週間DL数 / 最終公開日 / 直接依存の数。
  **最終公開日が12か月以上前、または週間DL数が1万未満**の場合は、それでも採用する理由を書く。
  **10行で書けるものに依存を足さない。**
- **SEC-13 (MUST)** `pnpm audit` の critical / high を未対応のままリリースしない。
- **SEC-14 (SHOULD)** インストール後に `npm audit signatures` で provenance を検証する。
- **SEC-15 (MAY)** pnpm の場合の追加ハードニング: `blockExoticSubdeps`、`strictDepBuilds`、`allowBuilds`。
  postinstall スクリプトを許可制にする。SEC-10/11 が効いていれば無くても事故にはならない追加層。
- **SEC-16 (MUST)** GitHub Actions は **コミットSHAでピン留め**する。`permissions:` を最小化する
  （既定 `contents: read`）。

### SEC-11 の設定方法（パッケージマネージャ別）

```yaml
# pnpm（推奨）: pnpm-workspace.yaml
minimumReleaseAge: 4320        # ★分単位★ = 3日。pnpm 11 以降の既定は 1440（1日）
```

```ini
# npm: .npmrc
min-release-age=3              # ★日単位★かつキー名が別。npm CLI 11.10.0 以降。既定は null
```

> pnpm 10.x で `.npmrc` に書く場合はケバブケースの `minimum-release-age`（分単位）。
> **キー名を間違えると未知の設定として黙って無視され、防御が効いていないことに気づけない。**
> 「設定した」ではなく **解決値を出力して確認する**こと:
>
> ```bash
> pnpm config list | grep -i releaseAge
> ```
> ```bash
> npm config get min-release-age
> ```

---

## A04 暗号

- **SEC-20 (MUST)** パスワードは自前で扱わない。認証プロバイダ（Auth.js / Clerk / Supabase Auth 等）を使う。
  自前で保存する場合は **argon2id または bcrypt(cost≥12)**。SHA/MD5 は不可。
- **SEC-21 (MUST)** 通信はすべて HTTPS。混在コンテンツなし。
- **SEC-22 (MUST)** 乱数は `crypto.randomUUID()` / `crypto.getRandomValues()`。`Math.random()` を
  セキュリティ用途に使わない。
- **SEC-23 (MUST)** トークン・秘密の比較は時間一定比較（`crypto.timingSafeEqual`）。

---

## A05 インジェクション

- **SEC-30 (MUST)** SQL はパラメータ化クエリ / ORM のクエリビルダを使う。文字列連結でクエリを作らない。
  タグ付きテンプレート（`` sql`SELECT * FROM user WHERE slug = ${slug}` ``）は安全な実装のもののみ。
- **SEC-31 (MUST)** `dangerouslySetInnerHTML` を使わない。使う場合は **DOMPurify でサニタイズ**し、
  なぜ必要かをコメントに残す。
- **SEC-32 (MUST)** ユーザー入力を `eval` / `new Function` / シェルコマンドに渡さない。
- **SEC-33 (MUST)** リダイレクト先をユーザー入力から決めない（オープンリダイレクト）。
  必要なら相対パスのみ許可し、許可リストで検証する。
- **SEC-34 (MUST)** ファイルパスをユーザー入力から組み立てない（パストラバーサル）。

---

## A06 安全でない設計

- **SEC-40 (MUST)** すべての書き込み系エンドポイントに **上限**がある: レート制限、サイズ上限、件数上限。
  「無制限に呼べる」機能は設計の欠陥。
- **SEC-41 (MUST)** 特に厳しく制限する: ログイン試行、パスワードリセット、メール送信、
  サインアップ、外部API呼び出し、ファイルアップロード。
- **SEC-42 (MUST)** ファイルアップロードは、拡張子ではなく **実際のMIME/マジックバイト**で検証し、
  サイズ上限を設け、**アプリのオリジンとは別のドメイン/バケット**から配信する。
- **SEC-43 (SHOULD)** 機能を作る前に3つ問う: 「誰が悪用できるか」「一番高くつく操作は何か」
  「一番機密性の高いデータはどこか」。

---

## A07 認証

- **SEC-50 (MUST)** 認証はライブラリ/サービスに任せる。自作しない。
- **SEC-51 (MUST)** セッションは HttpOnly Cookie。ログイン時にセッションIDを再生成（セッション固定対策）。
- **SEC-52 (MUST)** ログアウトでサーバー側のセッションを無効化する。
- **SEC-53 (MUST)** パスワードリセットのトークンは、単回使用・短期有効・十分なエントロピー。
  「ユーザーが存在するか」を応答から推測させない。
- **SEC-54 (MUST)** ログイン試行にレート制限とロックアウト。
- **SEC-55 (MUST)** パスワードマネージャの貼り付けを妨げない（WCAG 2.2 の 3.3.8 でもある）。

---

## A08 完全性

- **SEC-60 (MUST)** Webhook（Stripe等）は **署名を検証**する。生のボディで検証する。
- **SEC-61 (MUST)** 決済の成否をクライアントからの申告で判断しない。**サーバーが Webhook / API で確認する**。
- **SEC-62 (MUST)** サードパーティ由来の `<script>` は **3本以内**（本数の規範はここに一本化。
  PERF-03 はこれを参照する）。**上限に例外はない。**
  4本目を足す前に、**既存の3本のうちどれを削るか**を PR 本文に書く。**削れないなら追加しない。**
  （この上限は事故防止より、[50-japan-compliance.md](50-japan-compliance.md) JP-03 の
  **外部送信の公表漏れ防止**に効いている。タグが増えるほど公表事項の更新が漏れる。）
- **SEC-63 (MUST)** 安全でないデシリアライズをしない（ユーザー入力から任意オブジェクトを復元しない）。
- **SEC-64 (MUST)** **SRI はバージョン固定された配布物にのみ必須**（自前CDN、固定URLのライブラリ等）。
  提供元が可変ファイルとして配布し **SRI を許可していないもの（Stripe.js、gtag.js 等）は対象外**とし、
  代わりに CSP の `script-src` で読み込み元ホストを許可リスト化する（SEC-92）。
  > Stripe.js は SRI ハッシュの利用とセルフホストを**公式に認めていない**（PCI DSS 準拠と Radar の
  > 不正検知のため js.stripe.com から直接読ませる方針で、SRI 対応の予定は無いと表明している）。
  > SRI を無条件 MUST にすると、[50-japan-compliance.md](50-japan-compliance.md) JP-04 の
  > 「カード番号を自分のサーバーで受けない」MUST と**構造的に両立しなくなる**。

---

## A09 ログと検知

- **SEC-70 (MUST)** 未捕捉例外がエラー監視サービスに届き、**通知先が生きている**（テストイベントで確認）。
- **SEC-71 (MUST)** 構造化ログ（JSON）で以下を記録: タイムスタンプ、レベル、リクエストID、
  ユーザーID、操作、結果。
- **SEC-72 (MUST)** セキュリティ上重要なイベントを記録: ログイン成功/失敗、パスワード変更、
  権限変更、削除、課金、認可拒否。
- **SEC-73 (MUST)** ログに入れてはいけないもの: パスワード、トークン、APIキー、
  Cookie全体、クレジットカード情報、個人情報の本文。
- **SEC-74 (SHOULD)** 認可拒否が短時間に多発したら通知する（攻撃の兆候）。

---

## A10 例外条件の扱い

- **SEC-80 (MUST)** エラー時のフォールバックは **安全側**に倒す。
  認可チェックが例外で落ちたときに「通す」実装は重大な欠陥。
- **SEC-81 (MUST)** `catch` して握りつぶさない。最低限ログに残す。
  握りつぶす場合は理由をコメントに書く。
- **SEC-82 (MUST)** 外部API呼び出しにタイムアウトを設定する（無期限に待たない）。
- **SEC-83 (MUST)** エラーメッセージから内部構造を漏らさない（テーブル名、ファイルパス、スタック）。
- **SEC-84 (MUST)** **冪等性**。決済・課金確定・メール送信・外部Webhookの受信ハンドラは、
  同一イベントID（または クライアント発行の冪等キー）を **一意制約付きで永続化**し、
  2回目以降を副作用なしで返す。
  **同一イベントを2回送っても結果が変わらないテストを1本置く。**
  決済プロバイダのWebhookは at-least-once 配信であり、**再送は障害ではなく正常動作**である。
  SEC-60（署名検証）を満たしただけでは二重課金・二重付与を防げない。

---

## 自己レビューの最短手順

変更をレビューするとき、この順で見る（[sources/02-nextjs-data-security.md](sources/02-nextjs-data-security.md) の公式監査観点）:

1. **`data/`（DAL）** — DBパッケージと `process.env` が DAL の外で import されていないか
2. **`'use server'` のファイル** — 引数を検証しているか / アクション内で再認可しているか /
   **所有権**を確認しているか / 戻り値を絞っているか
3. **`'use client'` のファイル** — props が private data を期待していないか / 型が広すぎないか
4. **`app/[param]/`** — params を検証しているか
5. **`proxy.ts` / `route.ts`** — 権限が強い。重点的に見る
