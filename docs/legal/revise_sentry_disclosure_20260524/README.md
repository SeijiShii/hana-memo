# 改修: プライバシーポリシー Sentry PII スクラブ開示の明記

- **issue / slug**: sentry-disclosure
- **実施日**: 2026-05-24
- **対象機能**: ../README.md (`legal`)
- **基準 SPEC**: ../001_legal_SPEC.md
- **改修要望**: §8 [論点-014] (SEC-004 Sentry PII、High / 法令必須) の closure 法務 TODO 由来。プラポリ §4 第三者提供「エラー監視 (opt-in)」に、Sentry へ送信する**前に** email / 位置情報 / 決済識別子 / セッショントークン等の個人情報をスクラブ (除去) する旨を明記。SEC-004 実装 (`_shared/analytics/scrubber.ts` 7 パターン + Sentry `beforeSend`、D20260523_029) の開示。α 公開前必須
- **状態**: 設計完了 (実装 = /flow:tdd 待機)
- **dispatch 元**: /flow:auto continuous loop iteration 4 (D20260524_042)

## このフォルダに置くドキュメント
- `001_REVISE_SPEC.md` — 変更仕様 (プラポリ §4 before/after + version bump)
- `002_REVISE_PLAN.md` — 変更計画 (privacy_policy.md + versions.ts)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (LATEST_VERSIONS / needsReConsent)
- `004_REVISE_E2E_TEST.md` — E2E/検証計画 (プラポリ表示 + 再同意)

## 関連
- 親 SEC: concept §8 [論点-014] (SEC-004)
- SEC-004 実装: `docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/`
