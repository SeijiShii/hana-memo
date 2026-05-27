# 単体テストレポート: notebook revise_001 (実サムネイル + 発見詳細閲覧)

## 実施日時
2026-05-25 20:45 (JST) / Vitest 2.1.9 + happy-dom

## テスト結果
| ID | テスト | ファイル | 結果 |
|---|---|---|---|
| UT-NB-TH01 | imageObjectKey→署名URL解決 | useSignedThumbnails.test | ✅ |
| UT-NB-TH02 | key 無し→null (取得しない) | 同 | ✅ |
| UT-NB-TH03 | 解決失敗→null (致命でない) | 同 | ✅ |
| UT-NB-TH04 | 同一 key dedupe (1回) | 同 | ✅ |
| UT-NB-DT01 | 詳細: 名前/学名/状態/メモ + 画像(lazy) | DiscoveryDetailPage.test | ✅ |
| UT-NB-DT04 | commonName 無/unknown→日常語 (O38) | 同 | ✅ |
| (追加) | imageUrl 無→プレースホルダ | 同 | ✅ |
| UT-NB-DT03 | null+loading=false→見つかりません | 同 | ✅ |
| (追加) | null+loading→読み込み中 | 同 | ✅ |
| (追加) | onBack 押下 | 同 | ✅ |
| UT-NB-DT02 | :id 一致→詳細 + 画像署名解決 | DiscoveryDetailContainer.test | ✅ |
| (追加) | :id 不在→見つかりません | 同 | ✅ |
| (追加) | token 無→取得しない | 同 | ✅ |

## サマリー
| 項目 | 値 |
|---|---|
| 新規 | 13 件 |
| 全体 | 952 (939→952) |
| 成功率 | 100% |
| typecheck / eslint | 0 / 0 |

## リグレッション
TimelineView/FigureView (resolveThumbnail 既定 null) + NotebookContainer 既存描画 維持。

## 残 (follow-up)
編集/削除/再識別 (UC4編集/UC5/UC7)、詳細の family/genus/keyFeatures/confidence 表示 (list payload 拡張)。
