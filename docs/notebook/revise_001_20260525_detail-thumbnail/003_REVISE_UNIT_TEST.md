# notebook 単体テスト計画（実サムネイル + 発見詳細閲覧）

> **入力**: ./001_REVISE_SPEC.md, ./002_REVISE_PLAN.md
> **最終更新**: 2026-05-25

## 1. 追加テストケース
### 1.1 正常系
| ID | 対象 | 入力 | 期待 |
|---|---|---|---|
| UT-NB-TH01 | useSignedThumbnails | items[imageObjectKey='k1'], getSignedUrl→'https://u1' | resolveThumbnail(d)→'https://u1' (解決後) |
| UT-NB-TH02 | useSignedThumbnails | imageObjectKey 無し | resolveThumbnail→null |
| UT-NB-TH03 | useSignedThumbnails | getSignedUrl reject | resolveThumbnail→null (致命でない) |
| UT-NB-DT01 | DiscoveryDetailPage | discovery + imageUrl | 大画像 + common_name/scientific/family/genus/features/status/capturedAt/note を表示 |
| UT-NB-DT02 | DiscoveryDetailContainer | :id 一致 discovery あり | DiscoveryDetailPage に該当 discovery 注入 |
| UT-NB-DT03 | DiscoveryDetailContainer | :id 不在 | 「見つかりません」+ 戻る導線 |

### 1.2 異常系/境界
| ID | 対象 | 境界 | 期待 |
|---|---|---|---|
| UT-NB-DT04 | DiscoveryDetailPage | common_name 無 (status='unknown') | 日常語表示 (「不明」等)、技術用語なし (O38) |
| UT-NB-TH04 | useSignedThumbnails | items 変化 (再フェッチ) | 既解決はキャッシュ流用、新規のみ取得 |

## 2. 修正テストケース
| ID | 対象 | 修正 | 理由 |
|---|---|---|---|
| NotebookContainer.test | onSelect/resolveThumbnail mock 注入を追加検証 | 配線追加 |

## 3. 削除テストケース
なし。

## 4. リグレッション強化
- TimelineView/FigureView の既存テスト (resolveThumbnail 既定 null=プレースホルダ) は維持。
- NotebookContainer の既存描画テストを壊さない (seam 注入は後方互換)。

## 5. Mock 方針差分
| 対象 | 今回 | 理由 |
|---|---|---|
| getSignedUrl | 注入 mock (resolve/reject) | ネット非依存 |
| react-router useParams/useNavigate | mock | 詳細ルート検証 |

## 6. カバレッジ目標
行 80% / 分岐 70% (既存継承)。useSignedThumbnails の null/解決/失敗分岐 + 詳細の found/not-found 分岐を網羅。

## 7. 更新履歴
| 2026-05-25 | 初版作成 | /flow:revise |
