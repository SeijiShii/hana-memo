# AI_LOG セッション D20260522_014 — /flow:feature (export)

**実行日時**: 2026-05-22 15:50 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: export (feature、優先度 5)
**状態**: 完了
**含まれる decision**: D20260522-102 〜 D20260522-107

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-102 | 対象選定 | export |
| D20260522-103 | タグ | feature / auth-required |
| D20260522-104 | PDF 生成エンジン ([論点-003] 解決) | クライアント側 jsPDF + html-to-canvas (サーバーレス不要、無料) |
| D20260522-105 | CSV エクスポート | 無料機能として提供 (PDF のみ unlock 課金) |
| D20260522-106 | レイアウト | A4 縦 / 4 枚 grid + 識別情報 (PWYW 後はカスタマイズ可能) |
| D20260522-107 | E2E_TEST 生成 | 生成 (UC3 全フロー) |

## Decisions

```yaml
- id: D20260522-102
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["export (recommended、優先度 5 先頭)"]
  recommended: "export"
  chosen: "export"
  chosen_type: auto-recommended
  depends_on: [D20260522-101]
- id: D20260522-103
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["feature + auth-required (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
- id: D20260522-104
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 3 Q1 (論点-003 解決)
  question: PDF 生成エンジン
  options:
    - "クライアント側 jsPDF + html2canvas (recommended、サーバーレス不要、無料)"
    - "サーバー側 Puppeteer (Edge Fn では heavy)"
    - "外部 PDF API (Lambda PDF / DocRaptor、$$$)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-019]
  context: |
    100 ページ以上の重い PDF はクライアントメモリ厳しいが MVP は最大 50 ページ想定で OK。
    Puppeteer は Edge Function timeout 30s に収まらないリスク。
    画像は Storage 署名 URL を fetch して canvas に展開。
- id: D20260522-105
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: CSV エクスポート
  options:
    - "無料機能として提供 (recommended、撤退時のデータ持出し対応 + UX 良)"
    - "課金 (収益機会だが BaaS lock-in 批判)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: ["concept §4.7.5 撤退手順"]
  context: |
    撤退時のデータエクスポート (concept §4.7.5) は CSV/JSON で提供義務がある。
    課金対象は PDF (高品質印刷物) のみに絞る。
- id: D20260522-106
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 3 Q3
  question: PDF レイアウト
  options:
    - "A4 縦 / 4 枚 grid + 識別情報、カスタマイズ最小 (recommended、MVP)"
    - "複数レイアウト (1/2/4/6 grid 選択可、v2)"
    - "完全カスタム (over-engineering)"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
- id: D20260522-107
  timestamp: 2026-05-22T15:50:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["生成 (recommended、PDF/CSV 全フロー)"]
  recommended: 生成
  chosen: 生成
  chosen_type: auto-recommended
```
