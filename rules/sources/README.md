# sources — 一次調査ソース

`C:\projects\rules` 配下のルール群を導出した根拠。調査日: **2026-08-11**。

ルール本体を変更するときは、まずここに根拠を追記してから `../` の該当ファイルを直す。
根拠のないルールは書かない（後で誰も判断を再現できなくなるため）。

| ファイル | 領域 | 主な出典 |
|---|---|---|
| [01-owasp-top10-2025.md](01-owasp-top10-2025.md) | セキュリティ全般 | OWASP Top 10:2025 |
| [02-nextjs-data-security.md](02-nextjs-data-security.md) | 実装（Next.js） | Next.js 公式 Data Security ガイド |
| [03-supply-chain.md](03-supply-chain.md) | 依存関係・サプライチェーン | npm/pnpm、2025-2026 のOSSインシデント教訓 |
| [04-testing-delivery-dora.md](04-testing-delivery-dora.md) | テスト・デリバリー | DORA 2025、テスト戦略 2026 |
| [05-web-vitals.md](05-web-vitals.md) | パフォーマンス | web.dev / Core Web Vitals |
| [06-wcag22-a11y.md](06-wcag22-a11y.md) | アクセシビリティ | WCAG 2.2 |
| [07-japan-legal.md](07-japan-legal.md) | 日本の法令 | 個人情報保護法、電気通信事業法、特商法 |
| [08-japan-accessibility.md](08-japan-accessibility.md) | 日本のアクセシビリティ | JIS X 8341-3:2016、デジタル庁ガイドブック |
| [09-agentic-coding.md](09-agentic-coding.md) | Claude Code 運用 | Anthropic 公式ベストプラクティス |

## 注意事項

- 検索経由の二次情報（ブログ等）は「傾向の裏取り」にのみ使い、規範は必ず一次ソース（W3C / OWASP / 公式ドキュメント / 官公庁）に紐付ける。
- 法令の記述は要約であり、法的助言ではない。金銭が絡む機能を実装する前に一次条文・公式ガイドラインを確認すること。
