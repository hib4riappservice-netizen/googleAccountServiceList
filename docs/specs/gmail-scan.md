# Gmail走査によるサービス検出

## 1文の説明

サインイン時に取得済みの`gmail.readonly`権限を使い、Gmailのメールヘッダー（件名・送信元のみ、
本文は取得しない）から「登録済みサービス」らしきものを検出し、保存せずその場で一覧表示する。

## 受け入れ条件（Given / When / Then）

- Given gmail.readonly権限でサインイン済みのユーザー / When 「スキャン開始」ボタンを押す /
  Then 検出されたサービス一覧（サービス名相当・送信元ドメイン・件名・受信日）が画面に表示される
- Given サインイン済みだが該当するメールが1件も無いユーザー / When スキャンする /
  Then 「見つかりませんでした」という空状態が表示される（エラー扱いにしない）
- Given 未サインインの訪問者 / When スキャンを試みる（直接Server Actionを叩く等） /
  Then 拒否され、サインインを促すメッセージになる（DAL内で認証確認）
- Given Gmail APIがエラーを返す（トークン失効・レート制限等） / When スキャンする /
  Then 内部情報を含まない一般的なエラーメッセージが表示され、アプリはクラッシュしない

## 個人情報・課金情報の判定

**含む。** Gmailメッセージの件名・送信元アドレス・受信日時（ヘッダーのみ）をGoogle APIから取得する。
**メール本文は取得しない**（Gmail APIの`format=metadata`＋`metadataHeaders=From,Subject`を指定し、
本文を含むペイロード自体を要求しない設計。取得できるものを後から捨てるのではなく、
そもそも要求しない）。取得した内容はレスポンスとして画面に返すのみで、DB・ログ・
セッションのいずれにも保存しない（`rules/50-japan-compliance.md` JP-02、SHOULD「そもそも取らない」
の実践として本文を除外）。`docs/privacy-ops.md`に追記する。

## 触るファイル（分かる範囲で。2PRに分割予定）

**PR-A（バックエンド）**

- `lib/detect-services.ts`（件名/送信元ドメインのキーワードマッチ。純粋関数、ユニットテスト）
- `data/gmail.ts`（`scanRegisteredServices()`。`server-only`、`getToken()`でアクセストークン取得、
  Gmail APIをfetchで呼ぶ。認証チェック、DTOのみ返す）
- `tests/detect-services.test.ts`、`tests/gmail-dal.test.ts`

**PR-B（UI）**

- `app/actions/gmail.ts`（`scanServicesAction()`。DALに委譲）
- `components/gmail/ScanServicesPanel.tsx`（Client Component。ボタン+結果表示。
  loading/empty/error/successの4状態を判別可能なunionで表現）
- `app/page.tsx`（サインイン時にパネルを表示）
- `tests/scan-services-panel.test.tsx`、`tests/e2e/gmail-scan.spec.ts`（実Gmailデータなしでも
  検証できる範囲＝ボタン表示・未サインイン時の非表示のみ。実データでのスキャンは手動確認）

## 依存の追加（SEC-12）

追加なし。Gmail APIは`fetch`で直接呼ぶ（`googleapis`パッケージは重量級で今回の用途には
過剰なため導入しない。SEC-12「10行で書けるものに依存を足さない」）。

## SEC-05（他人のリソース操作の失敗テスト）について

**該当なし。** `data/gmail.ts`はGmail APIの`/users/me/`配下のみを呼び出し、
呼び出し元以外のユーザーIDやリソースIDを一切受け取らない設計のため、IDORが成立する
攻撃面が無い（ユーザーが指定できる値が無い）。今後このDALに他ユーザーのリソースIDを
扱う経路を追加する場合は、この判断を見直しSEC-05のテストを追加すること。

## 停止条件（機械判定可能な形で1行）

`pnpm verify`が緑になり、`tests/detect-services.test.ts`・`tests/gmail-dal.test.ts`が緑になる
（実Gmailアカウントでのスキャン結果の正しさは手動確認）

## ループで実行する場合

- turn上限: 5（既定）
- 作業場: なし
- no-progress条件: 同一テストが2回連続で赤なら停止

## 満たせなかった条件

<実装後に記入>
