# memory E2E テスト計画

> **入力**: `./001_memory_SPEC.md`, `./002_memory_PLAN.md`, `../concept.md` §1.1 UC5
> **最終更新**: 2026-05-22

---

## 1. E2E シナリオ (Playwright)

### Scenario E-ME-1: 「去年の今頃」バッジ + セクション表示 (UC1, UC2)
**前提**: user A、今日=2026-05-22、前年 2025-05-07 〜 2025-06-06 に identified 3 件 seed
1. /notebook アクセス
2. ヘッダ右上にバッジ「3」表示
3. ページ最上部に「去年の今頃」セクション + 3 カード横スクロール
4. カードタップ → DiscoveryDetailPage 遷移
- **検証**: バッジ件数、セクション表示、リンク動作

### Scenario E-ME-2: 0 件で非表示 (UC1, charter §2.2 配慮)
**前提**: user B、前年同期間 0 件
1. /notebook アクセス
2. バッジ非表示
3. 「去年の今頃」セクションも non-render
4. notebook ヘッダに「今年の発見を残してね」等の CTA も無い
- **検証**: 押し付けない動作

### Scenario E-ME-3: 新規 user (登録 < 1 年)
**前提**: user C、登録日 2026-04-01 (1 年未満)
1. /notebook アクセス
2. 前年データ無し → バッジ + セクション非表示
- **検証**: 新規 user UX

### Scenario E-ME-4: キャッシュ動作 (24h TTL)
1. 初回 /notebook → DB fetch 1 回
2. localStorage に `memory_2026-05-22` 保存
3. 別タブで再アクセス → DB fetch なし (cache hit)
4. 翌日 (mock 時刻進行) → cache key 変化 → fetch 再実行
- **検証**: パフォーマンス + 1 日 1 回計算

### Scenario E-ME-5: バッジタップでスクロール
1. ヘッダのバッジタップ
2. 「去年の今頃」セクションが viewport 中央にスクロール
- **検証**: UX 動作

### Scenario E-ME-6: a11y キーボード操作
1. Tab で MemoryBadge にフォーカス → Enter で section へ
2. Tab で各カードに移動 → Enter で詳細遷移
- **検証**: スクリーンリーダー 「去年の今頃 N 件」読み上げ

### Scenario E-ME-7: タイムゾーン (Asia/Tokyo)
1. ブラウザ TZ=Asia/Tokyo
2. 2026-05-22 09:00 JST に / アクセス
3. 前年 2025-05-07 ~ 2025-06-06 を fetch (UTC 変換含めて正確)
- **検証**: TZ 計算

## 2. テスト環境
- Playwright Chromium
- Supabase テスト environment (seed で前年 discoveries 注入)

## 3. データシード
| 種別 | 内容 |
|---|---|
| user A 前年 3 件 (5/15, 5/22, 5/30) | E-ME-1 |
| user B 前年 0 件 | E-ME-2 |
| user C 登録 < 1 年 | E-ME-3 |

## 4. 成功基準
- 全 7 シナリオ green
- E-ME-2 critical (charter §2.2 抵触なし)

## 5. CI 連携
- E-ME-1, 2 critical-path として PR ごと
- 他 nightly

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
