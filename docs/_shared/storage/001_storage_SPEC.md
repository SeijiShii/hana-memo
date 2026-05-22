# _shared/storage 仕様書

> **役割**: Cloudflare R2 (S3 互換) ラッパ — private bucket + Vercel Function 経由 Presigned URL + WebP upload
> **タグ**: cross-cutting / storage / 基盤
> **最終更新**: 2026-05-22 (BaaS Pivot 反映、D20260522-118)
> **入力アーティファクト**: `../../concept.md` §4.4, §5.2, `../auth/001_auth_SPEC.md`, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 Vercel Function (`api/storage/`)

| エンドポイント | 入出力 | 説明 |
|---|---|---|
| `POST /api/storage/upload-url` | in: `{ discoveryId, contentType, sizeBytes }` / out: `{ presignedUrl, objectKey }` | Clerk JWT 検証 → user_id 確認 → R2 PUT presigned URL 発行 (5 分 TTL) |
| `POST /api/storage/signed-url` | in: `{ objectKey }` (single) or `{ objectKeys: string[] }` (batch) / out: `{ url }` or `{ urls: Record<key, url> }` | Clerk JWT → 所有確認 (objectKey の先頭 segment = user_id) → R2 GET presigned URL (60 分 TTL) |
| `POST /api/storage/delete` | in: `{ objectKey }` / out: `{ ok: true }` | Clerk JWT → 所有確認 → R2 delete |

### 1.2 フロント (`src/shared/storage/`)

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `uploadPlantImage` | `(file: Blob, opts: UploadOptions) => Promise<UploadResult>` | `/api/storage/upload-url` で presigned URL 取得 → 直接 R2 に PUT |
| `replacePlantImage` | `(imageId: string, file: Blob) => Promise<void>` | 既存 objectKey で同上 |
| `deletePlantImage` | `(imageId: string) => Promise<void>` | `/api/storage/delete` 呼出 |
| `getSignedUrl` | `(objectKey: string, expiresIn?: number) => Promise<string>` | `/api/storage/signed-url` シングル |
| `getSignedUrls` | `(objectKeys: string[]) => Promise<Record<string,string>>` | 同上バッチ (notebook 一覧で使う) |
| `useSignedUrl` | `(objectKey: string) => string \| null` | React hook、55 分で自動 refetch |

### 1.3 メタ (`src/shared/storage/meta.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `getObjectMetadata` | `(objectKey: string) => Promise<{size:number,contentType:string,uploadedAt:string}>` | R2 HEAD via Vercel Function |
| `listUserImages` | `(userId: string) => Promise<StorageObject[]>` | export 用、user prefix で R2 listObjectsV2 |

## 2. 入出力

### 2.1 外部 API
| サービス | 利用機能 | 認証 |
|---|---|---|
| Cloudflare R2 (S3 互換) | PutObject / GetObject / DeleteObject / HeadObject / ListObjectsV2 + Presign | R2_ACCESS_KEY_ID + R2_SECRET (Vercel Function only) |

### 2.2 副作用
- R2 object PUT / DELETE
- DB 書込なし (`images` テーブル INSERT は capture / 各機能側責務)

## 3. データモデル
新規定義なし。R2 bucket は単一 `plant-images`。

### 3.1 Bucket 定義
| 項目 | 値 |
|---|---|
| 名前 | plant-images |
| 公開設定 | private (Cloudflare R2 public access OFF) |
| ライフサイクルポリシー | (任意) `tmp/` prefix 配下を 24h で自動削除 |
| CORS | アプリオリジン (Vercel deploy URL) のみ PUT/GET 許可 |

### 3.2 オブジェクトキー規約
```
{user_id}/{discovery_id}/{image_id}.webp
例: 11111111-2222-...-aaaa/3c1f...8b/9d2e...f1.webp
```

### 3.3 アクセス制御
- R2 自体には bucket-level RLS なし → **Vercel Function で必ず Clerk JWT 検証 + objectKey の prefix が user_id と一致するかチェック**
- presigned URL の TTL を短く設定 (upload=5min, fetch=60min) で漏洩時被害を限定

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| upload-url | contentType === 'image/webp' / sizeBytes <= 5MB | 400 InvalidImage |
| upload-url | discoveryId が own user の discoveries に存在 | 403 |
| signed-url | objectKey が `{ctx.userId}/...` 形式 | 403 |
| delete | 同上 | 403 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-ST-001 | upload 失敗 (network / R2 障害) | クライアント retry 2 回 + exponential backoff → UploadFailedError |
| E-ST-002 | 5MB 超過 | upload-url 段階で 400 reject、helpers/image で事前圧縮想定 |
| E-ST-003 | R2 ストレージ 10GB 接近 | check-quota Vercel Cron が Slack 通知 |
| E-ST-004 | presigned URL 失効中の表示 | useSignedUrl が 55 分で auto refetch |
| E-ST-005 | 所有者違反 (objectKey prefix 不一致) | 403、Sentry alert |
| E-ST-006 | エグレス急増 (DDoS / 大量 fetch) | R2 はエグレス無料だが、Vercel Function invocations 100k/月 上限あり → rate limit 検討 |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| upload-url 発行 | < 300ms | UX |
| upload (1 枚 500KB、R2 直接 PUT) | < 3s (4G 想定) | UX 許容 |
| signed-url 発行 (single) | < 300ms | UX |
| signed-url 発行 (batch 10) | < 500ms | notebook 一覧 SLA |
| R2 ストレージ利用量 | < 8GB (Free 10GB の 80%) | concept §4.6 |
| エグレス | 無料 (R2 の利点) | コスト |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/helpers/image` | 関数呼出 | WebP 変換 + EXIF strip + リサイズ |
| `_shared/auth` | JWT 検証 | Vercel Function で verifyClerkSession |
| `_shared/db` | images row 作成 | r2_object_key を持つ images INSERT は呼出側責務 |
| `capture` | uploadPlantImage | 撮影直後 |
| `notebook` | useSignedUrl | 一覧 + 詳細表示 |
| `export` | listUserImages + getSignedUrls | PDF 埋込 + 画像 ZIP |
| `_shared/analytics` | (なし) | R2 utilization は Cloudflare API 経由で check-quota Function が取得 |

## 6. タグ別追加

### 6.1 認可 (storage)
- R2 bucket は private、direct access は不可
- 全アクセスは Vercel Function 経由 (Clerk JWT 検証 + ownership check)
- presigned URL TTL を短く (upload 5min / fetch 60min)

### 6.2 基盤
- WebP 変換 / EXIF strip は `_shared/helpers/image.ts` に委譲
- 本モジュールは「変換済 Blob を渡されたら presigned URL 経由で R2 に上げる」純粋関数

## 7. スコープ外
- 動画アップロード
- サムネ自動生成 (一覧でも原寸を CSS で縮小)
- Cloudflare Images CDN による配信加速 (R2 直接で十分、必要なら Cloudflare Workers + cache)
- 別 region 配置 (R2 は global 自動分散)

## 8. 未決事項
- R2 ストレージ 10GB 接近時の対応 (古い画像削除 vs 強制エクスポート促し) → α 後判断

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (Supabase Storage 前提) | /flow:feature |
| 2026-05-22 | BaaS Pivot: Cloudflare R2 + Vercel Function Presigned URL に書換 (D20260522-118) | /flow:concept (UPDATE) |
