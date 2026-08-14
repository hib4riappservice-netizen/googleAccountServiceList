# googleAccountServiceList

Googleアカウントに紐づくサービスの一覧を管理するWebサービス。

**現在準備中です。** 最初の機能はまだ実装されていません。

このリポジトリは [`01_xxx`](https://github.com/hib4riappservice-netizen/01_xxx) テンプレートから作成されました。
品質基準（ゲート・チェックリスト）とそれを自動で守る仕組みは、テンプレートからそのまま引き継いでいます。

---

## 開発の進め方を知る

| 読む順 | ファイル                                 | 内容                                                                     |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| 1      | **[docs/OVERVIEW.md](docs/OVERVIEW.md)** | **全体像。何を基準にしていて、何が自動で守られるか**（非エンジニア向け） |
| 2      | [docs/PLAYBOOK.md](docs/PLAYBOOK.md)     | 運用手順書。何をどの順番でやるか                                         |
| 3      | [docs/AGENTS.md](docs/AGENTS.md)         | AIエージェント5体の分担                                                  |
| 4      | [rules/README.md](rules/README.md)       | 品質基準の本体（詳しく知りたいとき）                                     |
| 5      | [docs/decisions.md](docs/decisions.md)   | このサービス固有の技術的決定の記録                                       |

---

## 中身

```
rules/          品質基準（合格ラインの定義）。11ファイル
.claude/        AIエージェントの定義
scripts/        自動チェックのスクリプト
.github/        GitHub上で自動実行される検査
docs/           このリポジトリの説明書と、決定の記録
app/ lib/ tests/  アプリ本体
```

---

## セットアップ

```bash
git clone https://github.com/hib4riappservice-netizen/googleAccountServiceList.git
cd googleAccountServiceList
pnpm install
git config core.hooksPath .githooks
```

## 開発中に使うコマンド

```bash
pnpm dev             # 開発サーバーを起動（画面を見ながら作る）
pnpm verify          # 完成前の自己点検（型・書式・テスト・ビルド）
pnpm verify:full     # 上記 + ブラウザでの実動作テスト
```

`pnpm verify` が緑にならないうちは「完成」と呼びません。
理由は [docs/OVERVIEW.md](docs/OVERVIEW.md) に書いてあります。
