# _shared/storage ドキュメントインデックス

**最終更新**: 2026-05-23 17:54
**生成元**: /flow:feature _shared/storage + /flow:tdd (2026-05-23、SDK 非依存コア)
**状態**: コア実装完了 (2026-05-23、@aws-sdk/React/Vercel glue は app/api bootstrap defer)

<!-- auto-generated-start -->

## 機能概要
Cloudflare R2 (S3 互換) ラッパ (private bucket + presigned URL + WebP upload)。SDK 非依存コア (key 規約 / upload 検証 / presign orchestration) 実装済。

## ファイル一覧（番号順）
| 番号 | ファイル | 種別 | 状態 | 最終更新 | 短い説明 |
|---|---|---|---|---|---|
| 001 | [001_storage_SPEC.md](./001_storage_SPEC.md) | SPEC | 完了 | 2026-05-22 | 単一 private bucket `plant-images`、署名 URL 60 分 |
| 002 | [002_storage_PLAN.md](./002_storage_PLAN.md) | PLAN | 完了 | 2026-05-22 | Phase 3 分割 (upload→fetch→meta) |
| 003 | [003_storage_UNIT_TEST.md](./003_storage_UNIT_TEST.md) | UNIT_TEST | 完了 | 2026-05-22 | RLS 検証 + retry + signed URL refetch |
| 004 | — | E2E_TEST | スキップ (cross-cutting) | — | capture/notebook/export で間接検証 |
| 101 | [101_storage_IMPL_REPORT.md](./101_storage_IMPL_REPORT.md) | IMPL_REPORT | コア完了 | 2026-05-23 | bucket/validation/presign 実装、@aws-sdk/React glue defer |
| 102 | [102_storage_UNIT_TEST_REPORT.md](./102_storage_UNIT_TEST_REPORT.md) | UNIT_TEST_REPORT | 完了 | 2026-05-23 | 28 tests / 行 99.07% / 分岐 96.66% |

## サブフォルダ
| パス | 種別 | issue/slug | 状態 | 概要 | INDEX |
|---|---|---|---|---|---|
| (なし) |

## 関連
- 親 concept: `../../concept.md` §1.3.2, §4.4, §5.2
- **依存**: `_shared/db` (Storage RLS), `_shared/auth` (session), `_shared/helpers/image` (WebP 変換)
- **被依存**: `capture`, `notebook`, `export`
- 実装コード (コア): `src/shared/storage/{errors,bucket,validation,presign,index}.ts` (所有確認は `helpers/url.ts validateObjectKey` 再利用)
- defer (app/api bootstrap): `api/storage/{upload-url,signed-url,delete}.ts` / `_lib/r2.ts` / `upload.ts` / `fetch.ts useSignedUrl` / `meta.ts`

## AI アクセスガイド
- 機能概要 → README.md
- bucket 構成 + パス → 001_storage_SPEC.md §3
- RLS ポリシー → 001_storage_SPEC.md §3.3
- アップロード → 001_storage_SPEC.md §1.1

## 機能性質タグ
- target_type: cross-cutting
- 基盤 (✅)
- storage

<!-- auto-generated-end -->

<!-- user-edit-start -->
<!-- user-edit-end -->
