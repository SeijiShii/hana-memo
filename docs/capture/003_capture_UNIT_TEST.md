# capture 単体テスト計画

> **入力**: `./001_capture_SPEC.md`, `./002_capture_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 useImageConvert
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-IC01 | JPEG 4032x3024 5MB | WebP <= 2048px, <= 1MB, EXIF なし |
| UT-CA-IC02 | PNG 1024x768 | WebP に変換 |
| UT-CA-IC03 | HEIC (iOS) | WebP 変換 (canvas 経由) |
| UT-CA-IC04 | GPS 付き EXIF JPEG | EXIF 完全削除 (parser で 0 タグ確認) |
| UT-CA-IC05 | 巨大 8MB → リサイズ後も 6MB | 品質下げて再エンコード、最終 < 5MB |
| UT-CA-IC06 | 破損ファイル | reject |

### 1.2 useGeolocation
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-G01 | precision=precise | 緯度経度小数 5 桁 |
| UT-CA-G02 | precision=coarse | 100m 単位丸め (小数 3 桁相当) |
| UT-CA-G03 | precision=off | null 返却 |
| UT-CA-G04 | geolocation 拒否 | null + console.warn (UX 影響なし) |
| UT-CA-G05 | timeout | null + console.warn |

### 1.3 useCaptureFlow (orchestration)
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-CF01 | 正常 flow | discovery INSERT → upload → image INSERT → discovery UPDATE → identify 呼出 (順序確認) |
| UT-CA-CF02 | quota 0 (事前 check) | discovery INSERT 前に reject + QuotaModal 表示 |
| UT-CA-CF03 | upload 失敗 | discovery DELETE + エラー表示 |
| UT-CA-CF04 | identify 失敗 (quota_exceeded after start) | discovery pending、QuotaModal |
| UT-CA-CF05 | identify 失敗 (network) | discovery pending、再識別ボタン |
| UT-CA-CF06 | identify success | discovery identified、in-app バナー |
| UT-CA-CF07 | 中断 (preview で戻る) | discovery 未作成、副作用なし |

### 1.4 captureApi.ts
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-A01 | createDiscovery 正常 | discoveries INSERT 1 件 (status=identifying) |
| UT-CA-A02 | attachImage 正常 | images INSERT + discoveries UPDATE |
| UT-CA-A03 | triggerIdentify | identifyPlant 呼出 |
| UT-CA-A04 | 他 user の user_id で createDiscovery | RLS reject |

### 1.5 useIdentifyStatus
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-IS01 | Realtime event 受信 | onUpdate callback 発火 |
| UT-CA-IS02 | 接続失敗 → poll fallback | 5s ごとに fetch |
| UT-CA-IS03 | unmount | sub cleanup |

### 1.6 retryIdentify
| ID | シナリオ | 期待 |
|---|---|---|
| UT-CA-R01 | pending discovery を再識別 | identifyPlant 同 payload で呼出 |
| UT-CA-R02 | 既 identified | reject「再識別不要」 |

### 1.7 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-CA-E01 | camera 拒否 | navigator.mediaDevices 未対応 | フォルダ選択 fallback |
| UT-CA-E02 | 並列撮影 (同 user 2 タブ) | 同時 4 件 INSERT | 全成功、重複 discovery 許容 |
| UT-CA-E03 | 補助メモ 201 文字 | trim 200 |
| UT-CA-B01 | 撮影直後にアプリ閉じる | useCaptureFlow が abort | 副作用なし |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| canvas (WebP 変換) | jsdom + node-canvas |
| navigator.geolocation | mock (jsdom 標準) |
| supabase | mock |
| _shared/ai/identifyPlant | mock |
| _shared/storage | mock |
| Realtime channel | mock + event emit シミュレート |
| Date.now | useFakeTimers |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 80% |
| 分岐 | 75% |
| critical (useCaptureFlow) | 90% |

## 4. 実行環境
- vitest + jsdom + @testing-library/react + node-canvas

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
