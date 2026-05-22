# _shared/storage 仕様書

> **役割**: Supabase Storage ラッパ (private bucket + 署名 URL + WebP upload)
> **タグ**: cross-cutting / storage / 基盤
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md` §4.4, §5.2, `../auth/001_auth_SPEC.md`, `../db/001_db_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 アップロード (`src/shared/storage/upload.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `uploadPlantImage` | `(file: Blob, opts: UploadOptions) => Promise<UploadResult>` | WebP 化済 Blob を `{user_id}/{discovery_id}/{image_id}.webp` に PUT |
| `replacePlantImage` | `(imageId: string, file: Blob) => Promise<void>` | 既存 image_id の object を上書き |
| `deletePlantImage` | `(imageId: string) => Promise<void>` | DB row 削除と整合させるため、本モジュールは object のみ削除 |

### 1.2 取得 (`src/shared/storage/fetch.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `getSignedUrl` | `(path: string, expiresIn?: number) => Promise<string>` | デフォルト 3600 秒 (60 分) |
| `getSignedUrls` | `(paths: string[], expiresIn?: number) => Promise<Record<string,string>>` | バッチ取得 (一覧画面用) |
| `useSignedUrl` | `(path: string) => string \| null` | React hook、自動 refetch (期限 5 分前) |

### 1.3 メタ (`src/shared/storage/meta.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `getObjectMetadata` | `(path: string) => Promise<{size:number,contentType:string,uploadedAt:string}>` | Storage API から取得 |
| `listUserImages` | `(userId: string) => Promise<StorageObject[]>` | エクスポート用、user 配下を全走査 |

## 2. 入出力

### 2.1 外部 API
| サービス | 利用機能 | 認証 |
|---|---|---|
| Supabase Storage | PUT / GET signed url / DELETE / list | anon key + RLS |

### 2.2 副作用
- Storage object PUT / DELETE
- DB 書込なし (`images` テーブル INSERT は capture 機能側責務)

## 3. データモデル
新規定義なし。Storage は単一 bucket `plant-images` を使用。

### 3.1 Bucket 定義
| 項目 | 値 |
|---|---|
| 名前 | plant-images |
| public | false |
| File size limit | 5 MB |
| Allowed mime types | image/webp |

### 3.2 オブジェクトパス規約
```
{user_id}/{discovery_id}/{image_id}.webp
例: 11111111-2222-...-aaaa/3c1f...8b/9d2e...f1.webp
```

### 3.3 Storage RLS ポリシー (migration で定義)
| 操作 | ポリシー |
|---|---|
| SELECT | `(storage.foldername(name))[1] = auth.uid()::text` |
| INSERT | 同上 |
| UPDATE | 同上 |
| DELETE | 同上 |

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| uploadPlantImage | mimeType === 'image/webp' / size <= 5MB | reject (InvalidImage) |
| uploadPlantImage | user_id === current auth uid | reject (RLS violation 防御線) |
| getSignedUrl | path が `{uid}/...` 形式 | reject |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-ST-001 | upload 失敗 (network / Storage 障害) | retry 2 回 + exponential backoff → 失敗時 throw UploadFailedError |
| E-ST-002 | 5MB 超過 | 即 reject「画像サイズが大きすぎます (5MB まで)」、クライアント側 helper で事前圧縮想定 |
| E-ST-003 | 月間 Storage 無料枠 1GB 接近 | check-quota Edge Function (analytics) が Slack 通知 |
| E-ST-004 | 署名 URL 失効中の表示 | useSignedUrl が auto refetch、ユーザーには再読み込み感なし |
| E-ST-005 | RLS 拒否 | 他 user の object を取得しようとした場合 throw |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| upload (1 枚, 500KB) | < 3s (4G 想定) | UX 許容 |
| getSignedUrl | < 200ms | 一覧表示の SLA |
| getSignedUrls (10 枚 batch) | < 500ms | notebook 一覧 SLA |
| 月間 Storage 利用量 | < 800MB / month (1GB 無料枠の 80%) | concept §4.6 |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/helpers/image` | 関数呼出 | WebP 変換 + EXIF strip + リサイズ |
| `_shared/db` | RLS | storage.objects RLS が auth.uid() と整合 |
| `_shared/auth` | session | アップロード時に current user 確認 |
| `capture` | uploadPlantImage 呼出 | 撮影直後 |
| `notebook` | useSignedUrl | 一覧 + 詳細表示 |
| `export` | listUserImages + getSignedUrls | PDF 埋込 |
| `_shared/analytics` | (none) | Storage 利用量集計は check-quota Edge Function 側で Supabase Admin API 経由 |

## 6. タグ別追加

### 6.1 認可 (storage RLS)
- bucket 自体は private
- object-level RLS で `auth.uid()` のフォルダ配下のみアクセス可能
- service_role を使う Edge Function は Storage Admin API で完全制御可能 (export 等)

### 6.2 基盤
- WebP 変換 / EXIF strip は責務分離のため `_shared/helpers/image.ts` に委譲
- 本モジュールは「変換済 Blob を渡されたら PUT する」純粋関数

## 7. スコープ外
- 動画アップロード → 不要 (写真のみ)
- サムネ自動生成 → 不要 (一覧でも原寸を 256px に CSS で縮小、画質問題なら別途)
- CDN による公開配信 → private 維持優先、需要が出たら署名 URL のままで Vercel Edge cache 検討
- WebP 変換 → `_shared/helpers/image.ts` 側

## 8. 未決事項
- ストレージ 1GB 接近時の自動対応 (古い画像削除 vs 強制エクスポート促し) → α 後判断 (`[論点-005]` 関連)

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
