# 01_xxx — Webサービス開発のテンプレート

**このリポジトリは「雛形」です。** 実際のサービスは、ここから複製して作ります。

Next.js（Webアプリを作る道具）でサービスを作るときに、
**品質基準と、それを自動で守る仕組みが最初から入った状態**で始められるようにしてあります。

---

## 最初に読むもの

| 読む順 | ファイル                                 | 内容                                                                     |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| 1      | **[docs/OVERVIEW.md](docs/OVERVIEW.md)** | **全体像。何を基準にしていて、何が自動で守られるか**（非エンジニア向け） |
| 2      | [docs/PLAYBOOK.md](docs/PLAYBOOK.md)     | 運用手順書。何をどの順番でやるか                                         |
| 3      | [docs/AGENTS.md](docs/AGENTS.md)         | AIエージェント5体の分担                                                  |
| 4      | [rules/README.md](rules/README.md)       | 品質基準の本体（詳しく知りたいとき）                                     |

---

## 中身

```
rules/          品質基準（合格ラインの定義）。11ファイル
.claude/        AIエージェントの定義
scripts/        自動チェックのスクリプト
.github/        GitHub上で自動実行される検査
docs/           このリポジトリの説明書と、決定の記録
app/ lib/ tests/  アプリ本体（雛形の状態）
```

---

## このテンプレートから新しいサービスを作る

```bash
gh repo create <新しいサービス名> --template hib4riappservice-netizen/01_xxx --private --clone
cd <新しいサービス名>
pnpm install
git config core.hooksPath .githooks
```

詳しい手順とその後の進め方は [docs/PLAYBOOK.md](docs/PLAYBOOK.md) にあります。

---

## 開発中に使うコマンド

```bash
pnpm dev             # 開発サーバーを起動（画面を見ながら作る）
pnpm verify          # 完成前の自己点検（型・書式・テスト・ビルド）
pnpm verify:full     # 上記 + ブラウザでの実動作テスト
```

`pnpm verify` が緑にならないうちは「完成」と呼びません。
理由は [docs/OVERVIEW.md](docs/OVERVIEW.md) に書いてあります。
