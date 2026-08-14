# 10. アーキテクチャと実装規約（Next.js App Router + TypeScript）

根拠: [sources/02-nextjs-data-security.md](sources/02-nextjs-data-security.md)

---

## ARC-01 データ取得方式は1つに固定する（MUST）

Next.js 公式は3方式（外部HTTP API / Data Access Layer / コンポーネント直アクセス）を挙げ、
**1つを選んで混在させないこと**を推奨している。

→ **本プロジェクトは Data Access Layer (DAL) を採用する。**
Server Component や Server Action の中で直接 SQL / ORM を呼ばない。

理由: 認可の判定箇所が散らばると、抜けが起きても検出できない。DALに集約すれば
「DALの外でDBパッケージと `process.env` がimportされていないか」を機械的に検査できる。

---

## ARC-02 ディレクトリ構成（MUST）

```
app/                      ルーティングとUIのみ。ビジネスロジックを置かない
  (marketing)/            公開ページ
  (app)/                  要認証ページ
  api/                    Route Handler（Webhook等、必要な場合のみ）
  actions/                Server Actions。薄く保ち、DALへ委譲する
data/                     ★ Data Access Layer（server-only）
  auth.ts                 getCurrentUser() など。react cache() でラップ
  <entity>.ts             エンティティごとの読み書き。ここで認可する
  <entity>-dto.ts         クライアントへ渡す形（DTO）
lib/                      ドメインに依存しない純粋なユーティリティ
  validation/             Zod スキーマ
components/
  ui/                     プリミティブ（Button, Input …）。状態を持たない
  <feature>/              機能単位のコンポーネント
db/
  schema.ts               スキーマ定義
  migrations/
tests/
  e2e/                    Playwright
```

**依存の向き（MUST）**: `app` → `data` → `db`。逆向きの import を禁止する。
`components` は `data` を import しない（props で受け取る）。

---

## ARC-03 DALの契約（MUST）

`data/` 配下のすべてのモジュールは:

1. 先頭に `import 'server-only'` を書く
2. 関数の冒頭で **認証を検証**する
3. リソースを操作する関数は **所有権/権限を検証**する
4. **DTO を返す**（DBの行をそのまま返さない）
5. **`process.env` にアクセスしてよいのは DAL だけ**（＋設定モジュール）

```ts
// data/posts.ts
import 'server-only'
import { cache } from 'react'
import { getCurrentUser } from './auth'
import { db } from '@/db'

export const getPostForEdit = cache(async (postId: string) => {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()

  const post = await db.post.findUnique({ where: { id: postId } })
  if (!post) throw new NotFoundError()
  if (post.authorId !== user.id) throw new ForbiddenError()   // ← 所有権チェック

  // DTO: 編集画面が必要とするフィールドだけ
  return { id: post.id, title: post.title, body: post.body }
})
```

**アンチパターン**: `getCurrentUser()` の戻り値を Server Component 間で引き回す。
必要な場所で `cache()` 済みの関数を呼び直す（引き回すとClient Componentに渡す事故が起きる）。

---

## ARC-04 Server / Client 境界（MUST）

- **Server Component が既定**。`'use client'` は対話性が必要な場所にだけ、**ツリーの可能な限り下**に置く。
- Client Component の props は **描画に必要な最小フィールドのみ**を持つ型にする。
  `user: User` のような広い型を受け取らない。
- `NEXT_PUBLIC_` 付き環境変数に秘密を入れない。
- **MAY** `next.config.js` で `experimental.taint` を有効にし、React Taint API を追加の防御層として使う。
  **DALでのフィルタリングの代替にはならない**ため、MUST でも SHOULD でもなく MAY とする。

---

## ARC-05 Server Actions（MUST）

Server Action は **エクスポートされた時点で直接POST可能な公開エンドポイント**である。

```ts
// app/actions/posts.ts
'use server'
import { deletePost } from '@/data/posts'   // 認証・認可はDAL内
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const schema = z.object({ postId: z.string().uuid() })

export async function deletePostAction(input: unknown) {
  const { postId } = schema.parse(input)     // ① 入力検証
  await deletePost(postId)                   // ② DALで認証+認可
  revalidatePath('/posts')
  return { success: true }                   // ③ 戻り値は最小限
}
```

- **MUST** 引数をスキーマ検証する
- **MUST** 認証・認可を DAL 内で行う（ページの `redirect()` に依存しない）
- **MUST** 戻り値は必要最小限。DBレコードをそのまま返さない
- **MUST** 高コストな操作（メール送信、外部API、DB書き込み）にレート制限
- **SHOULD** クロージャで秘密値を閉じ込めない（Next.jsが暗号化するが、それだけに依存しない）

---

## ARC-06 レンダリング中に副作用を起こさない（MUST）

Cookie削除、DB更新、キャッシュ無効化を render 中に行わない。変更は必ず Server Action（POST）経由。

---

## ARC-07 データ取得のパフォーマンス（MUST）

- 独立した取得は **`Promise.all`** で並列化する。逐次 `await` は App Router で最も多いパフォーマンスの誤り。
- `params` / `searchParams` は Promise。**必ず `await` する**。
- 重い部分は `<Suspense>` で切り出し、ページ全体を待たせない。

---

## TS-01 TypeScript 設定（MUST）

`tsconfig.json` で以下を有効にする:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,      // 配列アクセスが undefined になりうることを型で表す
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  }
}
```

- **MUST** `any` を使わない。外部由来の値は `unknown` で受けて絞り込む。
- **MUST** 型アサーション（`as`）は、直前に検証がある場合のみ。`as unknown as T` は禁止。
- **MUST** `@ts-ignore` ではなく `@ts-expect-error` + 理由コメント。
- **MAY** ドメインの識別子には branded type を使い、ID の取り違えを型で防ぐ。

---

## TS-02 状態は判別可能なunionで表す（MUST）

```ts
// NG: ありえない組み合わせが作れる
type State = { isLoading: boolean; data?: Post; error?: Error }

// OK: ありえない状態が型として存在しない
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Post }
  | { status: 'error'; error: AppError }
```

---

## ERR-01 エラーの分類（MUST）

エラーは3種類に分け、扱いを変える。

| 種類 | 例 | ユーザーへの表示 | ログ | 通知 |
|---|---|---|---|---|
| **想定内・ユーザー起因** | 入力不正、重複、権限なし | 具体的なメッセージと次の行動 | info | しない |
| **想定内・外部起因** | 外部APIタイムアウト、決済失敗 | 「時間をおいて再試行」＋問い合わせ導線 | warn | 閾値超過で |
| **想定外** | バグ、未捕捉例外 | 汎用メッセージ + エラーID | error + スタック | **する** |

- **MUST** 想定外エラーの詳細（スタック、SQL、内部パス）をユーザーに出さない。
- **MUST** ユーザーに出すのは **相関可能なエラーID**（ログと突き合わせられるもの）。
- **MUST** 失敗時は安全側に倒す。認可判定が例外で落ちたら「拒否」であって「通過」ではない。

---

## ERR-02 App Router のエラー境界（MUST）

- ルートセグメントごとに `error.tsx` を置き、ページ全体が白画面にならないようにする。
- `not-found.tsx` / `loading.tsx` を用意する。
- グローバルの `global-error.tsx` を用意する。

---

## 決めたら書く

技術選定（ORM、認証、UIライブラリ等）を決めたら、**理由を1行添えて `docs/decisions.md` に追記する**。
後から「なぜこれを選んだか」が分からない選定は、次の変更で正しく判断できない。
