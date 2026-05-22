# export 単体テスト計画

> **入力**: `./001_export_SPEC.md`, `./002_export_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 csvBuilder
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-CS01 | 標準 rows → CSV | ヘッダ + body 整合、UTF-8 BOM 付き |
| UT-EX-CS02 | 改行 / カンマ含むセル | RFC 4180 quote |
| UT-EX-CS03 | null セル | 空文字列 |
| UT-EX-CS04 | 0 件 | ヘッダのみ |

### 1.2 zipBuilder
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-ZB01 | 4 ファイル zip | 全エントリ展開可、サイズ < 元 |
| UT-EX-ZB02 | ASCII ファイル名 | UTF-8 問題なし |

### 1.3 pdfRenderer
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-PR01 | 16 件 → 4 ページ (4grid × 4) | ページ数 5 (表紙 1 + 4) |
| UT-EX-PR02 | 5 件 → 2 ページ (4grid + 1grid) | 余ったマスは空白 or 統計 |
| UT-EX-PR03 | 表紙生成 | タイトル + 期間 + 件数 |
| UT-EX-PR04 | 統計ページ | 種別数 / 月別ヒストグラム / 場所マップ |
| UT-EX-PR05 | 200 件 (上限) | OK |
| UT-EX-PR06 | 201 件 | reject「上限超過」 |

### 1.4 usePdfBuild
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-PB01 | 正常 | onProgress 100% で resolve、Blob 返却 |
| UT-EX-PB02 | html2canvas fail (画像) | placeholder 続行 |
| UT-EX-PB03 | unlock なし | reject「アンロック必要」 |
| UT-EX-PB04 | メモリ不足 mock | reject + エラーメッセージ |

### 1.5 imageDownloader
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-ID01 | 100 画像 並列 (10 並列) | 全 Blob 取得、order 維持 |
| UT-EX-ID02 | 一部 fetch fail | 失敗分は除外 + console.warn |
| UT-EX-ID03 | cancel | AbortSignal で即中断 |

### 1.6 useExportData
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-ED01 | 全データ 4 種 fetch | 並列で取得、object 返却 |
| UT-EX-ED02 | RLS 拒否 | 自分の分のみ |

### 1.7 PdfUnlockGate
| ID | シナリオ | 期待 |
|---|---|---|
| UT-EX-PG01 | unlock false | 「アンロック (¥500 PWYW)」ボタン |
| UT-EX-PG02 | unlock true | PDF 生成 UI 表示 |

### 1.8 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-EX-E01 | 削除予約 user | deleted_at set | export UI 全 disable |
| UT-EX-B01 | discovery 0 件 (新規 user) | CSV ヘッダのみ DL、PDF はエラー |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| jsPDF | mock (Blob 出力) |
| html2canvas | mock (固定 canvas) |
| JSZip | 実物 |
| Supabase | mock |
| Storage signed URL | mock URL |
| fetch (画像) | mock |
| usePdfUnlocked | mock |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 80% |
| 分岐 | 75% |

## 4. 実行環境
- vitest + jsdom + node-canvas

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
