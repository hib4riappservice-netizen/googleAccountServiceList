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

- PR-A（`lib/detect-services.ts`）とPR-B（バックエンド`data/gmail.ts`）は当初想定よりさらに分割し、
  実際には3PR（spec+検出ロジック／DAL／UI）+ 修正2件（`getToken()`のsecret漏れ、タップ対象サイズ、
  Fromヘッダーの引用符エスケープ）で完成した（400行ルールとレビュー指摘の反映のため）。

## 手動確認（2026-08-15、実Googleアカウントで実施）

`pnpm dev`で実施。受け入れ条件1（スキャンして一覧表示）を確認済み。実際に5件のサービス
（Google Gemini / 電子印鑑GMOサイン / "お名前.com" / Supabase / X）が正しく検出・表示された。

途中2件の不具合を実地で発見し修正:

- Gmail APIが403で失敗（Google CloudプロジェクトでGmail API自体が未有効化だったため。
  `scripts/setup-google-oauth.sh`に有効化手順を追記済み）
- お名前.comのFromヘッダーがRFC 5322のエスケープされた引用符を含んでおり、表示名に
  バックスラッシュがそのまま出ていた（`lib/detect-services.ts`で修正済み）

受け入れ条件2〜4（空状態・未サインイン・エラー時表示）はE2E/ユニットテストで担保。

## 検索範囲の見直し（2026-08-17追記）

当初は件名キーワード（"welcome"「登録」等）でGmail検索側を絞り込んでいたが、実際の
登録通知メールの件名パターンが多様すぎて取りこぼしが多いという指摘を受けた。

- **件名フィルタを廃止**し、送受信・下書き・迷惑メールを含む全メール（ゴミ箱のみ除く）を
  検索対象にした（`data/gmail.ts`の`SEARCH_QUERY`を`in:anywhere -in:trash`に変更。
  `in:anywhere`はGmail検索が既定で除外するSpam/Trashの両方を対象に戻す演算子で、
  それ単独では「受信トレイのみ」ではなく送受信・下書きを含む全メールが対象になる
  ことをレビューで確認した）。
- 件名での事前絞り込みが無くなった分、`MAX_RESULTS`を50→200に引き上げた。
- ノイズ対策として、`lib/detect-services.ts`に個人向けフリーメールドメイン
  （Gmail/Yahoo/Outlook/docomo等）の除外リストを追加した。
- 詳細な判断理由は`docs/decisions.md`参照。
