# 改修: _shared/analytics Sentry beforeSend PII スクラブ (SEC-004)

- **issue / slug**: `sec_004_sentry_pii_scrub`
- **実施日**: 2026-05-23
- **対象機能**: [../README.md](../README.md)
- **基準 SPEC**: [../001_analytics_SPEC.md](../001_analytics_SPEC.md)
- **改修要望**: [SEC-004] [論点-014] Sentry beforeSend PII スクラブ実装 (High / 法令必須、O26_pii_logging、`legal_required=true`)
- **入力 seed**: [../../../_pending/sec_004_sentry_pii_scrub/000_TRIGGER.md](../../../_pending/sec_004_sentry_pii_scrub/000_TRIGGER.md) → revise 完了時に `_pending_archive/` 移動
- **状態**: 設計完了

## このフォルダに置くドキュメント

- `001_REVISE_SPEC.md` — 変更仕様書 (Sentry beforeSend + beforeBreadcrumb + Slack 通知 PII scrubber)
- `002_REVISE_PLAN.md` — 変更計画書 (scrubber.ts 新規 + sentry.ts/cost.ts/check-quota.ts への組込)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (7 パターン × 正規表現テスト + nested object + opt-out)
- `004_REVISE_E2E_TEST.md` — E2E テスト計画 (mock Sentry server で PII 流出ゼロ確認 + 法務監査)
- (MIGRATION なし — 実装未着手、データ移行なし)

## 関連

- L1 レポート: [../../../SECURITY_REVIEW_20260523.md](../../../SECURITY_REVIEW_20260523.md) §2.2 [SEC-004]
- L2 チェックリスト: [../902_analytics_IMPL_SECURITY_CHECKLIST.md](../902_analytics_IMPL_SECURITY_CHECKLIST.md)
- concept §8: [../../../concept.md](../../../concept.md) [論点-014]
- 法令対応: concept §9.1 (プラポリ「Sentry エラー追跡委託先利用、PII はスクラブ後送信」記載必要)
- SCENARIO §5: [../../../SCENARIO.md](../../../SCENARIO.md)
- AI_LOG: `../../../AI_LOG/D20260523_024_revise__shared_analytics_sec_004.md`
- 後続: `/flow:tdd _shared/analytics` で実装、完了時に §8 [論点-014] status を `closed` に遷移
