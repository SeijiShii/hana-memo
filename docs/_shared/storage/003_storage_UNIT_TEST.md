# _shared/storage 単体テスト計画

> **入力**: `./001_storage_SPEC.md`, `./002_storage_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 bucket.ts (buildPath)
| ID | 入力 | 期待出力 |
|---|---|---|
| UT-ST-B01 | userId, discoveryId, imageId | `{userId}/{discoveryId}/{imageId}.webp` |
| UT-ST-B02 | userId 不正 (空) | throw |

### 1.2 upload.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ST-U01 | WebP 5MB 以下、自 uid | resolve UploadResult{path,size,uploadedAt} |
| UT-ST-U02 | mime=jpeg | reject InvalidImageError |
| UT-ST-U03 | size=10MB | reject InvalidImageError |
| UT-ST-U04 | network err | retry 2 回 → reject UploadFailedError |
| UT-ST-U05 | replacePlantImage | PUT with upsert=true |
| UT-ST-U06 | deletePlantImage | DELETE 呼出 |
| UT-ST-U07 | RLS 拒否 (他 user の path) | reject |

### 1.3 fetch.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ST-F01 | getSignedUrl 正常 | URL 返却 (https://...) |
| UT-ST-F02 | getSignedUrl カスタム expiresIn=300 | createSignedUrl({expiresIn:300}) |
| UT-ST-F03 | getSignedUrls 10 path | 10 件 Record 返却 |
| UT-ST-F04 | getSignedUrls 一部失敗 | 失敗分は undefined、他は URL |
| UT-ST-F05 | useSignedUrl mount | URL 返却 + 55 分後に refetch スケジュール |
| UT-ST-F06 | useSignedUrl unmount | refetch timer cleanup |

### 1.4 meta.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-ST-M01 | getObjectMetadata | {size, contentType, uploadedAt} |
| UT-ST-M02 | listUserImages | StorageObject[] (path/size/createdAt) |
| UT-ST-M03 | listUserImages 他 user | RLS で空 |

### 1.5 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-ST-E01 | upload 全 retry 失敗 | 3 連続 timeout | UploadFailedError, console.error |
| UT-ST-E02 | useSignedUrl path 変更 | 別 path に re-render | 新 URL fetch |
| UT-ST-B01 | 並列 upload 100 件 | 全成功想定 | 全 resolve、order 不問 |

## 2. Mock 方針
| 対象 | 方針 | 理由 |
|---|---|---|
| supabase.storage | vitest mock | 外部呼出回避 |
| fetch | mock | 署名 URL 検証 |
| Date.now | useFakeTimers | refetch スケジュール検証 |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 85% |
| 分岐 | 80% |

## 4. 実行環境
- vitest + jsdom

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
