# _shared/ai（横断設計）

AI クライアント。OpenAI Vision クライアント / プロンプト構築 (位置 + 季節 + 履歴注入) / 出力後処理 (構造化抽出) / フォールバック。

## このフォルダに置くドキュメント

- `001_ai_SPEC.md` — プロンプト戦略 + 後処理仕様 + フォールバック方針
- `002_ai_PLAN.md` — 実装計画
- `003_ai_UNIT_TEST.md` — 単体テスト計画 (モック必須)
- `004_ai_E2E_TEST.md` — E2E (本番 API 接続、コスト要監視)
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2, §6 外部連携, §3 NFR (性能 5 秒 / コスト上限)
- 依存: `_shared/types`, `_shared/analytics` (使用量計測)
- 被依存: capture, (将来) memory (レコメンド精度向上時)
- 関連論点: なし (Q12.5 で詳細確定済み)
- 実装コード対応: `src/shared/ai/`, `supabase/functions/identify-plant/`
