# notebook 変更仕様書（実サムネイル + 発見詳細閲覧）

> **改修種別**: 機能拡張 (deferred seam の実装)
> **issue / slug**: 001 / detail-thumbnail
> **基準 SPEC**: `../001_notebook_SPEC.md` (UC1 timeline / UC4 詳細)
> **最終更新**: 2026-05-25
> **タグ**: auth-required / stateful

## 1. 変更概要
実機フィードバック2件: (1) カードのアイコンが葉プレースホルダのまま → 実画像サムネを表示、(2) 行を押しても何も起きない → 発見詳細 (読み取り専用) へ遷移。どちらも既存コンポーネントの seam (`resolveThumbnail` / `onSelect`) が app 層で未配線だったため、配線 + 詳細ページ新設で対応する。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| UC1 timeline 等 | カード = 葉アイコン固定 | `imageObjectKey` を署名付き GET URL に解決し実サムネ表示 (失敗/未解決はプレースホルダ) | フィードバック(1) |
| UC4 詳細 (閲覧部) | 未実装 (onSelect seam 未配線、ルート無し) | 行/タイル/ピン押下 → `/notebook/:id` 読み取り専用詳細へ | フィードバック(2)、SPEC UC4 の deferred 分 |

### 2.2 入出力変更
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `resolveThumbnail` (TimelineView/FigureView/NotebookPage) | app 層で未注入 (既定 null) | `useSignedThumbnails` で解決した URL を注入 | 互換 (seam 既存) |
| `onSelect` (NotebookPage 系) | 未注入 | `navigate('/notebook/:id')` を注入 | 互換 (seam 既存) |
| ルート | `/notebook` のみ | + `/notebook/:id` (詳細、AppShell 配下) | 追加のみ |

### 2.3 データモデル変更
変更なし (discoveries / imageObjectKey は既存)。単一 discovery は既存 `useNotebook` の一覧から `:id` で検索 (新 endpoint 不要)。マイグレーション不要。

### 2.4 バリデーション・エラー変更
| 対象 | 変更後 |
|---|---|
| 詳細 deep-link で id 不在 (削除済/無効) | 「見つかりませんでした」+ ノートへ戻る導線 |
| サムネ署名 URL 取得失敗 | プレースホルダにフォールバック (致命でない) |
| 画像ロード中 | 軽いプレースホルダ/フェードイン (O45、嘘進捗にしない) |

## 3. 影響範囲
| 対象 | 影響度 | 説明 |
|---|---|---|
| notebook (timeline/figure/map/calendar カード) | 中 | サムネ表示 + 行押下遷移 |
| 新規 詳細ページ + ルート | 中 | 読み取り専用 |
| _shared/storage (signed-url) | 低 | 既存 `getSignedUrl` を流用 |
| memory カード | 低 | 同様に実サムネ化 (resolveMemoryThumbnail) |

## 4. 後方互換性
互換維持 ✅ (seam 配線 + ルート追加のみ、既存挙動は不変)。α 未公開、データ移行なし。

## 5. ロールバック方針
コード revert で戻せる ✅ (DB 変更なし)。

## 6. リリース戦略
一括 (α 未公開、UX 改善)。

## 7. 詳細仕様（新仕様）
### 7.1 UC4 詳細 (閲覧部、本改修スコープ)
- トリガー: 任意モードのカード/タイル/ピン押下 → `/notebook/:id`。
- 表示 (読み取り専用): 大きい画像 (署名 URL) + common_name (不明時は status 由来表示) + scientific_name + family/genus + key_features + confidence/status + capturedAt + location (あれば) + user_note。
- 戻る導線あり。**編集 (UC4 編集) / 削除 (UC5) / 再識別 (UC7) は本改修スコープ外 = follow-up**。
- O38: 技術用語を出さない (status → 「識別中」「候補あり」「不明」等の日常語)。

### 7.2 サムネ解決 (新仕様)
- `useSignedThumbnails(items, token)`: 各 `imageObjectKey` を `getSignedUrl` で解決し objectKey→URL の map をキャッシュ。`resolveThumbnail(d) => url|null` を返す (同期 seam に適合)。未解決/失敗/key 無しは null (プレースホルダ)。
- TTL 内は再取得しない (SIGNED_URL_REFETCH_MS 流用は任意)。

### 7.5 NFR
- 画像は遅延読み込み + フェードイン (体感、O45)。一覧の署名取得は表示中分のみ (過剰取得しない)。

## 9. 未決事項
### [論点-001] 単一 discovery の取得方法
- 詰める問い: 詳細を一覧 (`useNotebook`) 流用で引くか、専用 GET endpoint を立てるか。
- 推奨: **一覧流用** (新 endpoint 不要、deep-link は一覧 fetch 後に id 検索で成立)。将来 detail が重くなれば専用 endpoint へ。本改修は流用。

## 10. 更新履歴
| 2026-05-25 | 初版作成 | /flow:revise |
