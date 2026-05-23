# 改修: _shared/ai レート制限 (SEC-001) + SSRF 防御強化 (SEC-003)

- **issue / slug**: `sec_001-003_rate_limit_ssrf`
- **実施日**: 2026-05-23
- **対象機能**: [../README.md](../README.md)
- **基準 SPEC**: [../001_ai_SPEC.md](../001_ai_SPEC.md)
- **改修要望**: `/flow:secure --list-findings` で dispatch された 2 件の SEC findings を `_shared/ai` SPEC/PLAN/UNIT_TEST に反映する
  - [SEC-001] [論点-011] Critical: レート制限 (O27_rate_limit_scope) 未設計
  - [SEC-003] [論点-013] High: AI Vision SSRF 防御 (O24_input_validation) 未明示
- **入力 seed**: [../../../_pending/sec_001-003_rate_limit_ssrf/000_TRIGGER.md](../../../_pending/sec_001-003_rate_limit_ssrf/000_TRIGGER.md)
- **状態**: 設計完了 (実装は `/flow:tdd _shared/ai` で実施)

## このフォルダに置くドキュメント

- `001_REVISE_SPEC.md` — 変更仕様書 (変更前 vs 変更後、認可契約、入力契約、レート制限契約、SSRF guard)
- `002_REVISE_PLAN.md` — 変更計画書 (ファイル変更 / 新規 / 削除、横断連携)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (追加 / 修正 / 削除)
- `004_REVISE_E2E_TEST.md` — E2E テスト計画 (変更 UC + リグレッション)
- (MIGRATION なし — 実装未着手のためデータ移行不要、新規 `webhook_dedupe` テーブルは `_shared/db` 設計内追加)

## 関連

- L1 レポート: [../../../SECURITY_REVIEW_20260523.md](../../../SECURITY_REVIEW_20260523.md) §2.2
- L2 チェックリスト: [../902_ai_IMPL_SECURITY_CHECKLIST.md](../902_ai_IMPL_SECURITY_CHECKLIST.md), [../../db/902_db_IMPL_SECURITY_CHECKLIST.md](../../db/902_db_IMPL_SECURITY_CHECKLIST.md)
- concept §8: [../../../concept.md](../../../concept.md) [論点-011] [論点-013]
- SCENARIO §5: [../../../SCENARIO.md](../../../SCENARIO.md)
- AI_LOG: `../../../AI_LOG/D20260523_022_revise__shared_ai_sec_001-003.md`
- 後続: `/flow:tdd _shared/ai` で実装、完了時に §8 status を `closed` に遷移
