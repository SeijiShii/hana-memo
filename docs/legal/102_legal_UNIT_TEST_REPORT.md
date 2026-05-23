# 単体テストレポート: legal (UI 非依存コア)

## 実施日時
2026-05-23 18:04 (JST)

## 関連ドキュメント
- [003_legal_UNIT_TEST.md](./003_legal_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-LE-V01〜V04 | compareVersion 等価/古い/minor 数値比較/形式不正 | versions.test.ts | ✅ |
| UT-LE-H04〜H06 | needsReConsent 全一致/privacy のみ/全未同意 | versions.test.ts | ✅ |
| (追加) | current 新しい→不要 / 形式不正→安全側 / cookie_policy=null 除外 | versions.test.ts | ✅ |
| UT-LE-A01/A02/A06 | buildConsentRecords 単一/3件/ip_hash 透過 | consent.test.ts | ✅ |
| UT-LE-E03 | version null (cookie_policy) → ConsentError | consent.test.ts | ✅ |
| UT-LE-A04/A05 | deriveLatestConsents 導出/最新採用/空 | consent.test.ts | ✅ |
| (追加) | validateConsentInput / recordConsents DI / 空レコード skip | consent.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | current 新しい / 形式不正安全側 / cookie 除外 | 再同意判定の網羅 (法的安全側) |
| A2 | deriveLatestConsents 同 doc 複数 → 最新 | 改訂履歴 (append-only) からの導出 |
| A3 | recordConsents DI + 空 skip | ConsentStore 境界 |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 13 件 (V01〜V04 + H04〜H06 + A01/A02/A04/A05/A06 + E03) |
| 追加テスト数 | 9 件 |
| 合計 | 22 件 |
| 成功 | 22 件 / 失敗 0 件 / 成功率 100% |
| legal 行カバレッジ | 98.86% (目標 80% ↑) |
| legal 分岐カバレッジ | 94.59% (目標 75% ↑、critical path consent flow ≥ 95% 達成) |
| errors/versions.ts | 行 100%、consent.ts 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: UT-LE-H01〜H03 (hook + localStorage)、UT-LE-I/R/P (React component + Markdown XSS)、UT-LE-A03/E01/E02 (実 DB INSERT/RLS/append-only)。app bootstrap フェーズで jsdom + @testing-library/react + ConsentStore 実装 + DOMPurify にて実施。E2E は 004_legal_E2E_TEST.md 参照。
