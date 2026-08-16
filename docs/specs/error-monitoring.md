# エラー監視（Sentry）

## 1文の説明

本番で発生した未捕捉例外（サーバー・クライアント双方）をSentryへ自動送信し、
利用者からの申告に頼らず把握できるようにする。

## 受け入れ条件（Given / When / Then）

- Given サーバー側のルートハンドラ/RSCレンダリングで未捕捉の例外が発生する /
  When リクエストが処理される / Then Sentryにイベントが1件記録される
  （`mechanism: auto.function.nextjs.on_request_error`、実機で確認済み）。
- Given `app/error.tsx` または `app/global-error.tsx` の境界で例外を捕捉する /
  When 画面がエラー表示にフォールバックする / Then 利用者にはエラーIDのみを見せ
  （ERR-01は変更しない）、裏側でSentryにも同じ例外を送信する。
- Given CSPの`connect-src`がSentryの送信先ホストを許可していない /
  When クライアント側で例外が起きる / Then ブラウザがブロックし送信されない
  （実装時に発見。`next.config.ts`の`connect-src`にDSNのホストを動的に追加して解消）。

## 個人情報・課金情報の判定

含まない。`sendDefaultPii`は未設定（既定false）のためIPアドレスやCookieは送信しない。
`Sentry.setUser()`も呼んでいないため利用者を識別する情報は付与されない。
送信されるのはエラーメッセージ・スタックトレース・URL・環境名程度。詳細は
`docs/privacy-ops.md`に追記した。

## 触るファイル（分かる範囲で）

- `instrumentation.ts`（新規）: server/edge向けのSentry初期化を登録するNext.js標準フック
- `instrumentation-client.ts`（新規）: ブラウザ向けのSentry初期化
- `sentry.server.config.ts` / `sentry.edge.config.ts`（新規）: 実際の`Sentry.init()`
- `next.config.ts`: `withSentryConfig`でラップ、CSP `connect-src`にDSNホストを追加
- `app/error.tsx` / `app/global-error.tsx`: `Sentry.captureException`を追加
  （UI・ERR-01/ERR-02の文言は変更しない）
- `.env.example`: `NEXT_PUBLIC_SENTRY_DSN`のプレースホルダを追加

## 停止条件（機械判定可能な形で1行）

`pnpm verify`が緑になる（typecheck/lint/format/test/build）。

## 満たせなかった条件

- ソースマップアップロード（`SENTRY_AUTH_TOKEN`）は今回スコープ外。無くてもビルドは
  成功し送信自体は機能するが、Sentry上のスタックトレースは圧縮後のコードで表示される
  （実機確認: `app:///_next\server\chunks\...`のような圧縮済みパスが出る）。
  読みやすさが問題になった時点で別途トークンを発行して追加する。
- `pnpm test`をローカルで単体実行する場合、シェルに`AUTH_SECRET`が無いと
  `data/gmail.ts`/`data/auth.ts`のテストが落ちる（`.env.local`はVitestが自動読み込みしない
  ため）。これは本PRで発生させた問題ではなく、確認中に見つかった既存の挙動。
  CI側は`secrets.AUTH_SECRET`が環境変数として渡っており影響しない。別issueとして扱う。

## 手動検証記録（2026-08-16）

- Sentry無料プラン（Developer、14日間のBusiness機能トライアル後に自動移行、
  カード未登録のため課金リスクなし）でアカウント作成、org: `hib4ri`、
  project: `javascript-nextjs`を作成。GitHub App連携も導入（リポジトリ限定・
  コード改変不可の権限のみ）。
- `next start`で一時的なテストルート（`GET /api/sentry-test`が例外を投げる）を作り、
  `curl`でアクセス→Sentry Issuesに実際にイベントが記録されることを確認
  （Issue: `JAVASCRIPT-NEXTJS-1`、`Unhandled`、`environment: production`）。
  確認後、テストルートは削除済み。
