# D20260523_031 — /flow:tdd _shared/storage (SDK 非依存コア)

```yaml
session_id: D20260523_031_tdd__shared_storage
command: /flow:tdd
mode: feature (SDK 非依存コアのみ、@aws-sdk / React hook / api handler は defer)
target: _shared/storage
started_at: 2026-05-23T17:52:00+09:00
last_updated: 2026-05-23T17:54:00+09:00
状態: 完了 (SDK 非依存コア)
完了ステップ一覧: [Step 1-4 判定, Step 5 実装, Step 6 全テスト, Step 7 レポート, Step 9 INDEX, Step 10 整合性, Step Z commit]
依存セッション: [D20260522_008_feature__shared_storage, D20260523_030_tdd__shared_auth]
dispatched_by: /flow:auto (continuous loop iteration 3、re-invoke。新 spec 4.5.2a = heavy でも skill 終了せず継続)
```

---

## Step 1-4: スコープ + 軽重判定

`_shared/storage` は Cloudflare R2 (S3 互換) ラッパ。R2 アクセスは @aws-sdk presign 経由 (Vercel Function)、表示は React hook。
decouple 方針 (D20260523 ユーザー承認) に従い **SDK 非依存のテスト可能コアのみ実装**:

### 実装 (今回、純ロジック + DI)
| ファイル | 責務 | 対応テスト |
|---|---|---|
| `bucket.ts` | BUCKET_NAME + buildObjectKey / parseObjectKey | UT-ST-B01, B02 |
| `validation.ts` | validateUploadInput (image/webp + 5MB) + 定数 | UT-ST-U02, U03 |
| `errors.ts` | InvalidImageError / UploadFailedError / StorageOwnershipError | |
| `presign.ts` | PresignClient (DI) + createUploadUrl / createSignedUrl / createSignedUrls / deleteObject + TTL 定数 | UT-ST-U01/U07, F01〜F04 |
| `index.ts` | barrel | |

- 認可は既存 `_shared/helpers/url.ts` の `validateObjectKey(key, userId)` (userId prefix + path traversal + 長さ) を再利用 ([SEC-003]/[SEC-005] 連携)。

### Defer (app/api bootstrap、SDK/React 必要)
- `api/storage/{upload-url,signed-url,delete}.ts` + `_lib/r2.ts` (@aws-sdk/client-s3 + s3-request-presigner + @clerk/backend)
- `upload.ts` の browser fetch PUT + retry (E-ST-001、UT-ST-U04/U05/E01)
- `fetch.ts` の `useSignedUrl` React hook (55 分 refetch、UT-ST-F05/F06)
- `meta.ts` (R2 HEAD/ListObjectsV2 via Vercel Function、UT-ST-M01〜M03)

---

## decisions

### D20260523-093 — Step 1 スコープ (storage decouple)

- **chosen_type**: auto-recommended (D20260523 decouple 方針の継続適用)
- **chosen**: bucket/validation/errors/presign コアを実装 (PresignClient DI)、@aws-sdk/React/Vercel glue は defer
- **context**: storage は R2 SDK + presign + React hook 結合。テスト可能なドメインロジック (key 規約 / upload 検証 / 認可 / presign orchestration + TTL) を切り出し、認可は実装済 url.ts validateObjectKey を再利用

### D20260523-094 — Step 6 全テスト結果

- **chosen_type**: auto-recommended
- **chosen**: 28 tests pass、全体 222/222 pass、typecheck clean
- **context**: storage 行 99.07% / 分岐 96.66% (bucket/validation/presign/errors 100%)

---

## 生成・更新アーティファクト
- 実コード: `src/shared/storage/{errors,bucket,validation,presign,index}.ts` (5 新規) + test (3 新規、28 tests)
- レポート: `101_storage_IMPL_REPORT.md` / `102_storage_UNIT_TEST_REPORT.md`
- INDEX: `_shared/storage/INDEX.md` / `docs/INDEX.md` → コア実装完了
- SCENARIO §5: Phase 3 進行更新 (storage コア、次 _shared/ai)

## 学習・改善
- 認可ロジックは既存 helpers (url.ts validateObjectKey) を再利用して重複回避。decouple コアでも横断ヘルパの再利用は有効
