# 改修: drizzle-orm SQL インジェクション CVE 対応 (アップグレード)

- **issue / slug**: sec_007_drizzle_orm_sqli
- **実施日**: 2026-05-24
- **対象機能**: ../README.md (`_shared/db`)
- **基準 SPEC**: ../001_db_SPEC.md
- **改修要望**: `/flow:secure --phase=deps` (D20260524_043) で検出した GHSA-gpj5-g38j-94v9 (drizzle-orm `<0.45.2` SQL injection via improperly escaped SQL identifiers、CVSS 7.5、CWE-89) の解消。`drizzle-orm` を `^0.36.4 → ^0.45.2` 以上へアップグレード。seed: `docs/_pending/sec_007_drizzle_orm_sqli/000_TRIGGER.md`、§8 [論点-015] (SEC-007)
- **状態**: 設計完了 (実装 = /flow:tdd 待機)
- **dispatch 元**: /flow:auto continuous loop iteration 2 (D20260524_042)

## このフォルダに置くドキュメント

- `001_REVISE_SPEC.md` — 変更仕様書 (依存バージョン before/after + 互換性評価)
- `002_REVISE_PLAN.md` — 変更計画書 (アップグレード手順 + migration 再生成検証)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画 (既存 28 維持 + identifier escaping 回帰)
- `004_REVISE_E2E_TEST.md` — E2E / 検証計画 (npm audit clean + migration DDL 等価)

## 関連

- L4 レポート: `../../SECURITY_DEPS_20260524.md#sec-007`
- seed: `../../_pending/sec_007_drizzle_orm_sqli/000_TRIGGER.md`
- 高度モデルレビュー: `/dev-review` 推奨
