# 単体テストレポート: _shared/storage (SDK 非依存コア)

## 実施日時
2026-05-23 17:54 (JST)

## 関連ドキュメント
- [003_storage_UNIT_TEST.md](./003_storage_UNIT_TEST.md)

## テスト実行環境
- Node 20 / Vitest 2.1.9 (`environment: node`)

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|------------|-------------|------|
| UT-ST-B01/B02 | buildObjectKey 正常 / userId 空 throw / `/` 含み throw | bucket.test.ts | ✅ |
| (追加) | parseObjectKey 往復 / 規約外 throw | bucket.test.ts | ✅ |
| UT-ST-U02/U03 | validateUploadInput jpeg / 10MB / 境界 5MB / サイズ 0・負 | bucket.test.ts | ✅ |
| UT-ST-U01 | createUploadUrl webp → presignedUrl+key (PUT 300s) | presign.test.ts | ✅ |
| UT-ST-U07 | 他 user objectKey → ValidationError (presign 不実行) | presign.test.ts | ✅ |
| UT-ST-F01/F02 | createSignedUrl GET URL (60 分) / expiresIn 上書き | presign.test.ts | ✅ |
| UT-ST-F03/F04 | createSignedUrls batch 10 / 他 user 混在で除外 / presign 失敗で除外 | presign.test.ts | ✅ |
| (追加) | deleteObject 自分 OK / 他 user throw / path traversal throw | presign.test.ts | ✅ |
| (追加) | errors 契約 (InvalidImage/UploadFailed/StorageOwnership) | errors.test.ts | ✅ |

## 追加テストケース

| # | 対象 | 追加理由 |
|---|------|---------|
| A1 | parseObjectKey 往復 + 規約外 | key 規約の双方向検証 |
| A2 | upload サイズ境界 (5MB ±1 / 0 / 負) | 境界網羅 |
| A3 | batch presign 失敗 key 除外 | UT-ST-F04 の堅牢性 ([SEC-005]) |
| A4 | errors 公開契約 | 例外型の instanceof + プロパティ |

## サマリー

| 項目 | 値 |
|------|-----|
| 計画テスト数 (本コア該当) | 約 13 件 (B01/B02 + U01〜U03/U07 + F01〜F04) |
| 追加テスト数 | 15 件 |
| 合計 | 28 件 |
| 成功 | 28 件 / 失敗 0 件 / 成功率 100% |
| storage 行カバレッジ | 99.07% (目標 85% ↑) |
| storage 分岐カバレッジ | 96.66% (目標 80% ↑) |
| bucket/validation/presign/errors.ts | 行 100% |

## カバレッジ未達・補足
- `index.ts` (barrel) 0%: re-export のみ。
- **defer (本レポート対象外)**: UT-ST-U04/U05 (browser PUT + retry)、UT-ST-F05/F06 (useSignedUrl React hook)、UT-ST-M01〜M03 (meta R2 HEAD/List)、UT-ST-E01/B01 (retry/並列)。app/api bootstrap フェーズで @aws-sdk mock + jsdom で実施。
