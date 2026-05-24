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

---

## 追記: Phase 3.5 Milestone B — SDK glue wiring (2026-05-24, /flow:auto 反復 1)

defer していた @aws-sdk / React / Vercel Function glue を injectable core (`presign.ts`) の上に wiring。
SDK 依存は `api/storage/_lib/r2.ts` に隔離し、各 handler は dynamic import で読み込む (handler の
unit test を SDK 非依存に保つ)。`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` を install。

### 実装 (glue)
- `api/storage/_lib/r2.ts` (新規): `loadR2Config` (env→config + endpoint 導出) / `createR2Client` (region=auto) /
  `createR2PresignClient` (PresignClient 実装: PutObject/GetObject presign + DeleteObject send) /
  `createR2MetaClient` (HeadObject / ListObjectsV2)。`sign`/`client`/`bucket` を注入可能。
- `api/storage/_lib/user.ts` (新規): `resolveUserId` (Clerk user id → Neon `users.id`、`query` 注入可能、未登録は `UserNotFoundError` 404)。
- `api/storage/upload-url.ts` (新規): Clerk JWT → users.id → `createUploadUrl` (image_id サーバ生成、PUT presign 5 分)。
- `api/storage/signed-url.ts` (新規): single / batch、`createSignedUrl` / `createSignedUrls` (GET presign 60 分、所有確認は core)。
- `api/storage/delete.ts` (新規): `deleteObject` core で所有確認 + R2 DeleteObject。
- `api/storage/meta.ts` (新規): `head` (所有確認→R2 HEAD) / `list` (JWT 由来 `{userId}/` prefix で ListObjectsV2、他 user は構造的に列挙不可)。
- `src/shared/storage/upload.ts` (新規): `uploadPlantImage` (事前 WebP/5MB 検証→upload-url→直接 PUT + exponential backoff 2 retry) / `replacePlantImage` / `deletePlantImage`。
- `src/shared/storage/fetch.ts` (新規): `getSignedUrl` / `getSignedUrls` (batch) / `useSignedUrl` (mount で取得 + 55 分 refetch + unmount cleanup)。
- `src/shared/storage/meta.ts` (新規): `getObjectMetadata` / `listUserImages` (`/api/storage/meta` 経由、userId は送らず server scope)。
- `src/shared/storage/index.ts`: upload/fetch/meta を barrel に追加。

### glue の差分・判断
| 項目 | 内容 |
|------|------|
| 認可境界 | objectKey 先頭 segment = Neon `users.id`。handler は Clerk JWT → `users.id` を解決し、core の `validateObjectKey` で prefix 一致を強制 ([SEC-005])。list は JWT 由来 prefix のみ使用 (UT-ST-M03 を構造的に保証)。 |
| replacePlantImage | R2 PUT は upsert 相当のため upload と同一経路 (新 presign + PUT)。旧 key 削除は呼出側責務。 |
| handler の testability | SDK/DB/network に触れる default export は E2E (Milestone C) で検証。unit test は pure helper (`parse*Body` / `loadR2Config` / `resolveUserId` / presign client 配線) を対象。 |
| 検証 | typecheck 0 / eslint 0 / **Vitest 464 green (新規 45)** / storage src 行 97.84% / coverage gate (test:coverage) exit 0。 |

### closure
- 残: Clerk Guest β 実セッションでの presigned URL ラウンドトリップ E2E (Milestone C、Vercel preview + 実 R2)。
- R2 bucket 作成 + CORS 設定 (PLAN §1.3) は preview/prod デプロイ時の手動運用 (PREREQUISITES)。
