# Next.js 公式「データセキュリティの考え方」

出典: https://nextjs.org/docs/app/guides/data-security （Next.js 16.3 時点 / 最終更新 2026-08-10）

App Router / React Server Components は「どこでデータに触るか」を変えた。従来のフロントエンドの前提が
そのままでは通用しないため、公式が明示している規範をそのまま採用する。

## データ取得の3方式（混ぜない）

公式は3つを挙げ、**1つを選んで混在させないこと**を推奨している。監査者・開発者の双方にとって期待値が明確になるため。

1. **External HTTP APIs** — 既存の大規模アプリ向け。Server Component からも Zero Trust で既存APIを叩く。
2. **Data Access Layer (DAL)** — **新規プロジェクトの推奨**。
3. **Component-Level Data Access** — プロトタイプ・学習用。事故りやすい。

→ 本プロジェクトは新規なので **DAL を採用**する。

## Data Access Layer の要件（公式の定義）

DALは以下を満たす内部ライブラリ:

- **サーバーでのみ動く**（`import 'server-only'`）
- **認可チェックを行う**
- **安全で最小限の DTO を返す**

補足として公式が明記している重要点:

> 秘密鍵は環境変数に置くべきだが、**`process.env` にアクセスするのは DAL だけ**にする。

`getCurrentUser()` を `react` の `cache()` でラップし、Server Component 間で user オブジェクトを
引き回さない（引き回すと Client Component に渡してしまう事故が起きる）。

## 漏洩の典型パターン

Server Component が DB の行をそのまま Client Component に渡すと、**オブジェクト全体が JSON として
クライアントバンドルに埋め込まれ、DevTools やページソースで誰でも読める**。
「画面に出していないから安全」は成立しない。

対策:
- Client Component の props は「描画に必要な最小フィールド」だけを受ける型にする。
- 広すぎる型シグネチャ（`user: User` のような）自体をレビュー対象にする。
- 追加防御として React Taint API（`experimental_taintObjectReference` / `experimental_taintUniqueValue`、
  `next.config.js` の `experimental.taint`）。ただし**これは追加の層であって、DALでのフィルタの代替ではない**。

## Server Actions のセキュリティ

- Server Action は **エクスポートされた時点で直接 POST 可能なエンドポイント**。UI経由でしか呼ばれないと考えてはいけない。
- Next.js 側の内蔵防御: 暗号化された非決定的なアクションID（ビルド間で再計算、最大14日キャッシュ）、未使用アクションのデッドコード除去、
  POST限定 + Origin/Host ヘッダ一致チェック（CSRF対策）。
- **それでも、各アクション内で認証・認可を自分で検証する必要がある。**
- **ページレベルの認証チェックは、そのページ内で定義された Server Action には及ばない。** アクション内で `auth()` を再実行する。
- 認証（ログインしているか）だけでなく **認可（このリソースを操作してよいか＝所有権チェック）** を行う（IDOR対策）。
- 戻り値はシリアライズされてクライアントに渡る。**DBレコードをそのまま返さない**（`{ success: true }` のように必要最小限）。
- 高コストな操作（メール送信、DB書き込み）には**レート制限**を検討。
- クロージャで閉じ込めた変数はクライアントを往復する（Next.jsが自動暗号化するが、**暗号化だけに依存しない**）。

## 入力の検証

`searchParams` / `params` / フォームデータ / ヘッダはすべて改ざん可能。
`searchParams.isAdmin === 'true'` のような判定は脆弱。**毎回サーバー側で権限を再検証する**。
`/[param]/` のブラケット付きフォルダは「ユーザー入力」であるとみなして検証する。

## レンダリング中の副作用の禁止

Cookie削除・DB更新・キャッシュ無効化を render 中に行わない。Next.js は render 中の Cookie設定 /
revalidate を明示的に禁止している。変更は必ず Server Action（POST）経由。

## 公式が挙げる監査観点（そのままレビュー項目に使える）

- **DAL**: 分離されたDALの運用があるか。DBパッケージと環境変数がDAL外でimportされていないか。
- **`"use client"` ファイル**: propsが private data を期待していないか。型シグネチャが広すぎないか。
- **`"use server"` ファイル**: 引数を検証しているか。アクション内で再認可しているか。リソースの所有権を確認しているか。
  戻り値をクライアントに必要な分だけに絞っているか。DBアクセスを `server-only` なDALに委譲しているか。
- **`/[param]/`**: paramsを検証しているか。
- **`proxy.ts` / `route.ts`**: 権限が強い。重点的に監査する。

## ルールへの反映

`10-architecture.md`（DAL採用）、`20-security.md`（認可・入力検証・Server Actions）、
`checklists/feature.md`（監査観点をそのままチェック項目化）。
