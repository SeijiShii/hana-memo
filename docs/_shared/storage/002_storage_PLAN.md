# _shared/storage 実装計画書

> **入力**: `./001_storage_SPEC.md`, `../helpers/001_helpers_SPEC.md`
> **最終更新**: 2026-05-22 (BaaS Pivot)

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/storage/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `bucket.ts` | bucket 名定数 + buildObjectKey | (なし) | ~30 |
| `upload.ts` | uploadPlantImage / replacePlantImage / deletePlantImage | (fetch) | ~120 |
| `fetch.ts` | getSignedUrl / getSignedUrls / useSignedUrl (55 分 refetch) | (fetch) | ~100 |
| `meta.ts` | getObjectMetadata / listUserImages | (fetch) | ~60 |
| `errors.ts` | UploadFailedError / InvalidImageError | (なし) | ~20 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 Vercel Function (`api/storage/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `upload-url.ts` | Clerk JWT 検証 + R2 PUT presigned URL 発行 | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @clerk/backend | ~100 |
| `signed-url.ts` | 同上 + GET presigned URL (single + batch) | 同上 | ~120 |
| `delete.ts` | 同上 + R2 DeleteObject | 同上 | ~60 |
| `_lib/r2.ts` | R2 S3Client シングルトン (account_id endpoint) | @aws-sdk/client-s3 | ~30 |

### 1.3 R2 設定
| 項目 | 設定 |
|---|---|
| Bucket 作成 | `wrangler r2 bucket create plant-images` or Cloudflare dashboard |
| CORS | `wrangler r2 bucket cors put plant-images --rules=cors.json` (allow origin = Vercel deploy URL) |
| ライフサイクル | `tmp/` prefix 24h 自動削除 (任意) |
| public access | OFF |

### 1.4 マイグレーション
- 新規なし (images schema は `_shared/db` で定義済、r2_object_key カラム含む)

## 2. 実装 Phase 分割

### Phase 1: R2 setup + upload-url Function + frontend upload
- 含む: bucket.ts / upload.ts / errors.ts / api/storage/upload-url.ts / api/storage/_lib/r2.ts
- 検証: 自分の画像が R2 にアップロードされる + 他 user の discoveryId で 403

### Phase 2: signed-url Function + useSignedUrl
- 含む: fetch.ts (getSignedUrl, getSignedUrls, useSignedUrl) / api/storage/signed-url.ts
- 検証: 自分の画像が表示できる、他 user の objectKey で 403

### Phase 3: delete + meta
- 含む: api/storage/delete.ts, meta.ts
- 検証: 削除と一覧

## 3. 依存関係順序

```mermaid
graph TD
  Auth[_shared/auth verifyClerkSession] --> UU[/api/storage/upload-url]
  Auth --> SU[/api/storage/signed-url]
  Auth --> DEL[/api/storage/delete]
  R2[_lib/r2.ts S3Client] --> UU
  R2 --> SU
  R2 --> DEL
  Helpers[_shared/helpers/image (WebP変換)] --> Upload[upload.ts]
  Upload -- POST --> UU
  Upload -- direct PUT --> Cloudflare[(Cloudflare R2)]
  Fetch[fetch.ts] -- POST --> SU
```

## 4. 既存ファイル影響
- `package.json`: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` 追加
- `.env.example`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=plant-images` 追加 (Vercel Function only)
- `vercel.json`: storage 関連 Functions の runtime=nodejs

## 5. 横断フォルダ追加・変更
| 横断 | 内容 |
|---|---|
| `_shared/types/domain.ts` | UploadOptions, UploadResult, StorageObject 型 |
| `_shared/helpers/image.ts` | convertToWebP, stripExif, resize (既存設計範囲) |

## 6. リスク・注意点
- **5MB 制限**: スマホ撮影は 4-8MB 普通、必ず helpers/image でリサイズ → 失敗時の UX (画質下げて再試行)
- **EXIF GPS strip 漏れ**: helpers/image 側のテストで毎回検証 (E2E E-CA-8 で critical)
- **CORS 設定**: dev / preview / prod の Vercel URL を全部許可、wildcard は避ける (リクエスト捏造リスク)
- **presigned URL ログ漏洩**: URL に署名含む → log に絶対残さない、Sentry でも URL を scrub 設定
- **R2 vs Vercel Function invocations**: signed URL 発行が頻発する notebook 一覧で Function 100k 上限を消費 → batch endpoint (`signed-urls`) で 1 リクエスト = N URL 化、useSignedUrl は memoize
- **R2 list 性能**: listUserImages で 1000 件超で遅い → ページネーション + images テーブルから objectKey 取得で代替
- **エグレス無料の利点活用**: 画像配信は CDN を介さず R2 直接でも OK、コスト 0
- **削除整合性**: DB rows DELETE と R2 DeleteObject はトランザクションでない → 失敗時に Sentry alert + 手動清掃、または cron で orphan 検出

## 7. DoD
- [ ] R2 bucket 作成 + CORS 設定
- [ ] 自分の画像のみ upload / fetch / delete 可能
- [ ] 他 user の操作で 403
- [ ] WebP 以外 / 5MB 超過で 400
- [ ] presigned URL が TTL 経過後に 403
- [ ] useSignedUrl が 55 分で自動 refetch
- [ ] EXIF GPS strip 検証 (E2E)
- [ ] vitest + Vercel Function ローカルテスト pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase Storage 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Cloudflare R2 + Vercel Function Presigned URL (D20260522-118) | /flow:concept (UPDATE) |
