# 実装レポート: _shared/storage (SDK 非依存コア)

## 実装日時
2026-05-23 17:54 (JST)

## モード
feature — **SDK 非依存のテスト可能コアのみ実装**。@aws-sdk presign / React useSignedUrl / Vercel Function handler / meta は app/api bootstrap フェーズへ defer (decouple 方針)。

## 関連ドキュメント
- [001_storage_SPEC.md](./001_storage_SPEC.md) / [002_storage_PLAN.md](./002_storage_PLAN.md) / [003_storage_UNIT_TEST.md](./003_storage_UNIT_TEST.md)
- [902_storage_IMPL_SECURITY_CHECKLIST.md](./902_storage_IMPL_SECURITY_CHECKLIST.md)
- [AI_LOG](../../AI_LOG/D20260523_031_tdd__shared_storage.md)

## 変更一覧

### 実装 (純ロジック + DI)
- `src/shared/storage/errors.ts` (新規): `InvalidImageError` / `UploadFailedError` (cause) / `StorageOwnershipError`。
- `src/shared/storage/bucket.ts` (新規): `BUCKET_NAME` + `buildObjectKey` / `parseObjectKey` (`{userId}/{discoveryId}/{imageId}.webp` 規約)。
- `src/shared/storage/validation.ts` (新規): `validateUploadInput` (image/webp + 5MB) + 定数。
- `src/shared/storage/presign.ts` (新規): `PresignClient` (DI) + `createUploadUrl` / `createSignedUrl` / `createSignedUrls` (batch、失敗 key 除外) / `deleteObject` + TTL 定数 (upload 300s / fetch 3600s)。所有確認は `_shared/helpers/url.ts` の `validateObjectKey` を再利用 ([SEC-003]/[SEC-005])。
- `src/shared/storage/index.ts` (新規): barrel。

## 実装計画からの差分

| 項目 | 内容 |
|------|------|
| 計画にない追加変更 | presign を `PresignClient` DI のオーケストレーションに切り出し (PLAN は @aws-sdk 直結前提)。所有確認を既存 url.ts `validateObjectKey` 再利用で重複回避。 |
| 計画から省略した変更 | **defer (app/api bootstrap)**: `api/storage/{upload-url,signed-url,delete}.ts` + `_lib/r2.ts` (@aws-sdk/client-s3 + s3-request-presigner + @clerk/backend)、`upload.ts` の browser fetch PUT + retry (UT-ST-U04/U05/E01)、`fetch.ts` の useSignedUrl React hook (UT-ST-F05/F06)、`meta.ts` (R2 HEAD/List、UT-ST-M01〜M03)。 |
| 想定外の問題と対処 | 所有確認に専用 StorageOwnershipError ではなく url.ts の ValidationError を採用 (path traversal + userId prefix を一括検証できるため)。StorageOwnershipError は公開エラー契約として保持 (api/ 層の 403 表現用)。 |

## PR Description

### タイトル
_shared/storage: SDK 非依存コア (objectKey 規約 + upload 検証 + presign orchestration)

### 概要
R2 ストレージのうち SDK に依存しないドメインロジック (キー規約、WebP/5MB 検証、所有確認付き presign オーケストレーション、TTL ポリシー) を実装。@aws-sdk presign と React hook の実 wiring は app/api bootstrap フェーズへ。

### 変更内容
- objectKey build/parse、upload 入力検証、PresignClient DI による upload/signed/batch/delete オーケストレーション

### テスト
- 28 tests pass、storage 行 99.07% / 分岐 96.66% (bucket/validation/presign/errors 100%)
- 全体 222/222 pass、typecheck clean
