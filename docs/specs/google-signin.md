# Googleサインイン基盤（gmail.readonlyスコープを含む）

## 1文の説明

Auth.js（next-auth v5）で Google OAuth サインイン/サインアウトを実装する。サインイン時に
`gmail.readonly` スコープも同時に要求し、後続のスキャン機能（別spec）がアクセストークンを使えるようにする。

## 受け入れ条件（Given / When / Then）

- Given 未ログインの訪問者 / When トップページを開く / Then 「Googleでサインイン」ボタンが表示される
- Given 未ログインの訪問者 / When 「Googleでサインイン」を押し、Google側の同意画面で許可する /
  Then セッションが確立し、トップページに表示名とサインアウトボタンが表示される
- Given ログイン済みユーザー / When サインアウトボタンを押す / Then セッションが失効し、未ログイン表示に戻る
- Given OAuth同意画面がテストモードで、テストユーザーとして未登録のGoogleアカウントでサインインを試みる /
  When Google側の同意画面に到達する / Then Google側でアクセスが拒否され、
  アプリ側は汎用エラーページ（内部情報を含まない）を表示する（500にしない）

## 個人情報・課金情報の判定

**含む。** Googleから氏名・メールアドレス・プロフィール画像URLを取得する。DB保存は行わず、
Auth.jsの暗号化JWTセッション（HttpOnly Cookie）にのみ保持する。`rules/50-japan-compliance.md`
JP-02を読んだ。テストモードであっても実在のGoogleアカウントの個人情報を扱うため、
最小限のプライバシーポリシー・利用規約・お問い合わせ導線をこのPRで用意する（JP-01）。

## 触るファイル（分かる範囲で）

- `package.json`（`next-auth@beta`（v5 / Auth.js）追加。理由は下記「依存の追加」参照）
- `auth.ts`（Auth.js設定。Google provider、`authorization.params.scope` に
  `openid email profile https://www.googleapis.com/auth/gmail.readonly`、JWTセッション戦略・DBアダプタ無し）
- `app/api/auth/[...nextauth]/route.ts`（Route Handler）
- `data/auth.ts`（`getCurrentUser()`。`server-only`、`react cache()` でラップ。DTOのみ返す）
- `components/auth/SignInButton.tsx` / `SignOutButton.tsx`
- `app/page.tsx`（サインイン状態で表示切り替え）
- `app/privacy/page.tsx`・`app/terms/page.tsx`・`app/contact/page.tsx`（最小限の静的ページ）
- `app/error.tsx` 経由でOAuth拒否時の表示を確認
- `.env.example`（`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`）
- `tests/auth.test.tsx`、`tests/e2e/auth.spec.ts`

## 依存の追加（SEC-12・`docs/third-party.md`にも記載）

- `next-auth`（Auth.js, v5系） / 週間DL数: 約580万 / 最終公開: 2026-07-20（12か月以内） /
  直接依存の数: 9。採用理由・betaを使う判断は `docs/decisions.md` 参照。
- `server-only` / 週間DL数: 約1147万 / 最終公開: 2022-09-03（**12か月以上前**） / 直接依存の数: 0。
  採用理由: Vercel公式の2行の型安全ガードパッケージで、`rules/10-architecture.md` ARC-03が
  要求する`import 'server-only'`の実体（DAL規約自体は既存だが依存追加が漏れていたテンプレートの
  不備。詳細は`docs/decisions.md`）。ロジックが無く更新の必要が無いため最終公開日の古さは
  採用理由として妥当と判断した。

## 停止条件（機械判定可能な形で1行）

`pnpm verify` が緑になり、かつ `tests/e2e/auth.spec.ts`（サインイン→サインアウトのE2E、
テストユーザーのGoogleアカウントを使用）が緑になる

## ループで実行する場合

- turn上限: 5（既定。rules/70-loop-engineering.md LOOP-01）
- 作業場: なし（対話的に実装。ループ実行はしない）
- no-progress条件: 同一テストが2回連続で赤なら停止（既定）

## 満たせなかった条件

- **PRを2分割**（400行ルール）。`app/privacy`・`app/terms`・`app/contact`は別PR。
  それまでフッター等からのリンクは無い（直接URLでは到達可能）。
- **`tests/e2e/auth.spec.ts` は実アカウントでの同意完了までは自動化していない**
  （CIに実認証情報を置かない方針、Googleログイン自動化の不安定さのため）。ボタン表示・
  Google認可エンドポイントへの遷移・エラー出し分けのみ検証。実アカウントでの通し確認は
  Google Cloud側の認証情報発行後に手動で行う。
- SEC-05（他人のリソース操作の失敗テスト）は**該当なし**。DALは現状セッション読み取りのみで
  所有権判定の対象リソースが無いため。
