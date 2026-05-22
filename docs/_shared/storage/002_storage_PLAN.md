# _shared/storage 実装計画書

> **入力**: `./001_storage_SPEC.md`, `../helpers/001_helpers_SPEC.md`
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/storage/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `bucket.ts` | bucket 名定数 + パス生成関数 (buildPath) | (なし) | ~30 |
| `upload.ts` | uploadPlantImage / replacePlantImage / deletePlantImage | client, bucket | ~120 |
| `fetch.ts` | getSignedUrl / getSignedUrls / useSignedUrl | client, bucket | ~100 |
| `meta.ts` | getObjectMetadata / listUserImages | client, bucket | ~60 |
| `errors.ts` | UploadFailedError / InvalidImageError | (なし) | ~20 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 マイグレーション (`supabase/migrations/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `20260522_020_storage_bucket.sql` | `insert into storage.buckets` で plant-images bucket 作成 | ~10 |
| `20260522_021_storage_rls.sql` | objects RLS ポリシー (SELECT/INSERT/UPDATE/DELETE) | ~40 |

## 2. 実装 Phase 分割

### Phase 1: bucket + upload
- 含む: bucket.ts, upload.ts, errors.ts, マイグレーション 020, 021
- 検証: テスト画像を upload → Storage console で確認 + RLS 拒否確認

### Phase 2: fetch + signed URL
- 含む: fetch.ts (getSignedUrl, getSignedUrls, useSignedUrl)
- 検証: 自分の画像が表示できる、他 user の画像で 403

### Phase 3: meta + 一覧
- 含む: meta.ts (export 機能用)
- 検証: listUserImages で全自分画像列挙

## 3. 依存関係順序

```mermaid
graph TD
  Auth[_shared/auth] --> UP[upload.ts]
  Helpers[_shared/helpers/image (WebP変換)] --> UP
  Bucket[bucket.ts] --> UP
  Bucket --> FE[fetch.ts]
  Bucket --> ME[meta.ts]
  RLS[(Storage RLS)] --> ALL[全 storage API]
```

## 4. 既存ファイル影響
- `_shared/auth` の client.ts を import (共通 Supabase クライアント)
- `.env.example` に Storage bucket 名は constant 化のため env 不要

## 5. 横断フォルダ追加・変更
| 横断フォルダ | 追加・変更内容 |
|---|---|
| `_shared/db/migrations/` | 020, 021 を追加 |
| `_shared/types/domain.ts` | `UploadOptions`, `UploadResult`, `StorageObject` 型 |
| `_shared/helpers/image.ts` | convertToWebP, stripExif, resize (既存設計範囲) |

## 6. リスク・注意点
- **5MB 制限**: スマホで撮ると 4-8MB は普通、必ず helpers/image でリサイズ → リサイズ失敗時の UX を明確に (圧縮率を上げて再試行)
- **EXIF GPS strip 漏れ**: 画像メタに位置情報が残ると個情リスク。helpers/image 側のテストで毎回検証
- **bucket 作成は手動 or migration**: Supabase Free でも migration で bucket 作成可能だが、Storage policy の構文に注意
- **署名 URL リーク**: log には絶対残さない (URL に署名が含まれるため)。Sentry でも URL は scrub 設定
- **無料枠 1GB**: ユーザー あたり画像 200 枚 (avg 500KB) ≒ 100MB なので 10 user で枯渇。早期に check-quota 必須
- **list API 性能**: listUserImages は user に画像 1000 枚あると遅い → ページネーション + DB の images テーブル経由で代替 (export 機能の SPEC 側で再検討)

## 7. DoD
- [ ] 自分の画像のみ upload / fetch / delete 可能
- [ ] 他 user の操作で 403
- [ ] WebP 以外の upload で 400
- [ ] 5MB 超過で 400
- [ ] 署名 URL が 60 分有効、期限後は 403
- [ ] useSignedUrl が自動 refetch
- [ ] vitest pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
