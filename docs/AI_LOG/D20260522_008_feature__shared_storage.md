# AI_LOG セッション D20260522_008 — /flow:feature (_shared/storage)

**実行日時**: 2026-05-22 11:30 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: _shared/storage (cross-cutting、優先度 2)
**状態**: 完了
**含まれる decision**: D20260522-060 〜 D20260522-065

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-060 | 対象選定 | _shared/storage |
| D20260522-061 | タグ | cross-cutting / storage / 基盤 |
| D20260522-062 | bucket 戦略 | 単一 private bucket `plant-images` + 階層パス `{user_id}/{discovery_id}/{image_id}.webp` |
| D20260522-063 | 配信方式 | 署名 URL (60 分有効) を都度発行、CDN キャッシュは公開 URL を避けて prefer 自己ホスト |
| D20260522-064 | 画像変換 | クライアント側で WebP 変換 + 最大 2048px リサイズ + EXIF strip、サーバー変換なし |
| D20260522-065 | E2E_TEST 生成 | スキップ (cross-cutting) |

## Decisions

```yaml
- id: D20260522-060
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["_shared/storage (recommended、優先度 2、capture の前提)"]
  recommended: "_shared/storage"
  chosen: "_shared/storage"
  chosen_type: auto-recommended
  depends_on: [D20260522-059]
- id: D20260522-061
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["cross-cutting + storage + 基盤 (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-062
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: Bucket 戦略
  options:
    - "単一 private bucket + パス階層 (recommended、シンプル + RLS 統一)"
    - "user 別 bucket (運用複雑)"
    - "サムネ用 public + 原本 private の 2 bucket"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: |
    Supabase Storage は bucket-level + object-level RLS が効く。
    パスに user_id を含めれば RLS の WHERE clause で簡潔に絞れる (storage.objects.name LIKE auth.uid()||'/%')。
- id: D20260522-063
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: 配信方式
  options:
    - "署名 URL 60 分 (recommended、private 維持 + UX 両立)"
    - "public bucket (個情リスク)"
    - "署名 URL 24 時間 (cache 効率 vs リスク)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  context: 60 分なら同セッション中に何度も閲覧しても再発行不要、リーク時被害も限定。
- id: D20260522-064
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: 画像変換戦略
  options:
    - "クライアント変換 (WebP + 2048px + EXIF strip) のみ (recommended、サーバーコスト 0)"
    - "サーバー側で Sharp 変換 (Edge Function コスト + 複雑)"
    - "変換なし (Storage 圧迫)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [_shared/helpers/image]
  context: |
    EXIF GPS は個情リスクなのでクライアントで完全に strip する。
    変換は _shared/helpers/image.ts に実装、本モジュールは upload のみ責務。
- id: D20260522-065
  timestamp: 2026-05-22T11:30:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["スキップ (cross-cutting)"]
  recommended: スキップ
  chosen: スキップ
  chosen_type: auto-recommended
```
