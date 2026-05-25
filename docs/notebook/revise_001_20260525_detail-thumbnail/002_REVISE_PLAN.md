# notebook 変更計画書（実サムネイル + 発見詳細閲覧）

> **入力**: ./001_REVISE_SPEC.md, NotebookContainer / NotebookPage / TimelineView / useNotebook / storage fetch (getSignedUrl) / App.tsx
> **最終更新**: 2026-05-25

## 1. 既存ファイル変更一覧
| ファイル | 変更内容 | リスク |
|---|---|---|
| `src/features/notebook/NotebookContainer.tsx` | `useSignedThumbnails` で resolveThumbnail / resolveMemoryThumbnail を解決し NotebookPage に注入。onSelect=`navigate('/notebook/'+d.id)` を注入 | 低 |
| `src/App.tsx` | AppShell 配下に `/notebook/:id` ルート追加 (DiscoveryDetailContainer) | 低 |
| `src/features/notebook/index.ts` | DiscoveryDetailContainer 等の export 追加 (必要なら) | 低 |

## 2. 新規ファイル一覧
| ファイル | 責務 | LOC |
|---|---|---|
| `src/features/notebook/useSignedThumbnails.ts` | items[].imageObjectKey を getSignedUrl で非同期解決しキャッシュ、`resolveThumbnail(d)=>url|null` を返す hook。fetch/getSignedUrl 注入でテスト可 | ~60 |
| `src/features/notebook/DiscoveryDetailContainer.tsx` | app 層: useParams(:id) + useNotebook で discovery 検索 + 画像署名 URL 解決 → DiscoveryDetailPage に注入。未 sign-in/未発見の分岐 | ~50 |
| `src/features/notebook/pages/DiscoveryDetailPage.tsx` | 読み取り専用詳細 (props-seam: discovery + imageUrl + onBack)。大画像 + 各フィールド + 戻る | ~80 |

## 3. 削除ファイル一覧
なし。

## 4. マイグレーション要否
DB/Storage/Config いずれも不要 (既存スキーマ + 既存 signed-url endpoint)。

## 5. 実装 Phase 分割
### Phase 1: サムネ解決
- `useSignedThumbnails` 実装 + NotebookContainer 配線 (resolveThumbnail/resolveMemoryThumbnail)。
### Phase 2: 詳細ページ
- `DiscoveryDetailPage` (props-seam, 読み取り専用) + `DiscoveryDetailContainer` + onSelect 配線 + `/notebook/:id` ルート。

## 6. 依存関係順序
Phase1 (サムネ) → Phase2 (詳細、画像署名は Phase1 の getSignedUrl 流用)。

## 7. ロールアウト計画
| 1 | unit green (npm test) | 2026-05-25 | 全 green |
| 2 | 実機目視 (サムネ表示 + 行→詳細) | 2026-05-25 | vercel dev |

## 8. リスク・注意点
- resolveThumbnail は同期 seam → 非同期解決を state キャッシュで吸収 (解決前は null=プレースホルダ、解決後 re-render)。
- 一覧の署名取得は表示中 discovery 分のみ (過剰取得回避)。R2 GET CORS 適用済。
- DiscoveryDetailContainer は useNotebook 一覧から検索 → deep-link は一覧 fetch 後に成立 ([論点-001])。

## 9. DoD
- [ ] Phase1/2 実装、npm test 全 green、typecheck 0 / eslint 0
- [ ] vercel dev で実サムネ表示 + 行押下→詳細表示
- [ ] 編集/削除/再識別は follow-up と明記

## 10. 更新履歴
| 2026-05-25 | 初版作成 | /flow:revise |
