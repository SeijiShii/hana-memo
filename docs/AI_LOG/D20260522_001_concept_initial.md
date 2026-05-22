# AI_LOG セッション D20260522_001 — /flow:concept (initial)

**実行日時**: 2026-05-22 09:50 〜 10:15 (+09:00)
**コマンド**: /flow:concept (initial + UPDATE: 認証フロー再設計)
**対象**: プロジェクト全体（hana-memo / 植物の名前わかるんメモ、初版作成 + 認証フロー再設計）
**実行者**: Claude (Opus 4.7) + seiji
**状態**: 完了
**含まれる decision**: D20260522-001 〜 D20260522-024 (24 件)
**ファイル**: `D20260522_001_concept_initial.md`

---

## 主要決定サマリ（人間向け要約、10 件抜粋）

| ID | テーマ | 採用 | type |
|---|---|---|---|
| D20260522-002 | プロダクト名・一行説明 | hana-memo / 植物の名前わかるんメモ | auto-recommended |
| D20260522-005 | 主要 UC | 5 個 (発見記録 / ノート / 図鑑 / 親子 / 季節) | auto-recommended |
| D20260522-011 | 技術スタック | Vite + React + TS + Supabase + Vercel + OpenAI gpt-4o-mini | auto-recommended |
| D20260522-012 | リソース選定 §4.3 | 全カテゴリ確定、無料枠中心 | auto-recommended |
| D20260522-013 | ローカル開発 | BaaS local (Supabase CLI) | auto-recommended |
| D20260522-014 | 外部 AI 利用 | OpenAI Vision (使う、差別化根拠 (a)(c)(e)) | auto-recommended |
| D20260522-015 | アナリティクス | Sentry + 自前コストログのみ | auto-recommended |
| D20260522-016 | 認証 | Supabase Auth (Google + メール)、パスキーは v2 | auto-recommended |
| D20260522-017 | 法務書類 | プラポリ + 利用規約 + 特商法、GDPR 不要 | auto-recommended |
| D20260522-018 | 論点登録 | 5 件 (パスキー / 通知 / PDF / 位置粒度 / 分析) | open |
| D20260522-022 | **認証フロー再設計** | 匿名スタート + Google OAuth 後リンク (Supabase Anonymous Auth) | explicit-choice |
| D20260522-023 | 論点追加 | [論点-006] 匿名 SPAM 抑止 | open |
| D20260522-024 | 論点追加 | [論点-007] 匿名→リンク時データ移行 | open |

## 依存関係（このセッションが依存する他セッションの decision）

- 外部依存: なし（初版セッション）
- 起点: idea I20260522-005（`~/ideas/registry.jsonl`）

## 生成・更新したアーティファクト

- 新規: `docs/concept.md`
- 新規: `docs/INDEX.md`, `docs/DOC_MAP.md`
- 新規: 機能フォルダ（capture / notebook / export / memory / billing / account / legal）+ 横断フォルダ（_shared/db, _shared/types, _shared/helpers, _shared/auth, _shared/storage, _shared/ai, _shared/analytics）の README + INDEX
- 更新: `wants.md`（クリア）

## 学習・改善（このセッションで /flow:concept に組み込んだ自己学習）

- (今回は新規学習なし、初版運用)

---

## Decisions

```yaml
- id: D20260522-001
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 1.7 / preferences.md 読込
  question: preferences.md 読込結果
  options: []
  recommended: null
  chosen: "学習元 PJ 数 0、強い選好なし（全 Q で汎用推奨ロジックを使用）"
  chosen_type: auto-recommended
  depends_on: []
  context: |
    ~/.claude/flow-data/preferences.md は初期テンプレート状態。
    全 2.x カテゴリが「まだデータなし」。本 PJ が学習元 PJ 第 1 号となる見込み。

- id: D20260522-002
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q1 プロダクト名・一行説明
  question: プロダクト名と一行説明
  options:
    - "hana-memo / 植物の名前わかるんメモ — 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA (recommended)"
  recommended: "hana-memo / 植物の名前わかるんメモ"
  chosen: "hana-memo / 植物の名前わかるんメモ"
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md 冒頭で確定済み、確認形式で採用。

- id: D20260522-003
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q2 主要ユーザー
  question: 主要ユーザー (直接 + 最終読者)
  options:
    - "直接 = 最終読者 = 散歩 / 通勤 / 園芸が日常にある人 (recommended)"
  recommended: "直接 = 最終読者 = 同一"
  chosen: "直接 = 最終読者 = 散歩 / 通勤 / 園芸が日常にある人。副次: 子供の自然学習をしたい親、植物初心者"
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md 想定ユーザーで明示済み。

- id: D20260522-004
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q3 解決する課題
  question: 解決する課題
  options:
    - "散歩中に気になる草花を見つけても、名前を調べないまま忘れてしまう / 既存植物アプリは『同定機能』が主役で『自分のノート』が脇役 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で明示、差別化仮説も明記済み。

- id: D20260522-005
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q4 主要ユースケース
  question: 主要ユースケース 3-5 個
  options:
    - "UC1: 発見の記録 / UC2: ノート閲覧 / UC3: 図鑑 PDF 出力 / UC4: 親子学習 / UC5: 季節レコメンド (recommended)"
  recommended: 同上
  chosen: 同上 (5 UC、wants 通り)
  chosen_type: auto-recommended
  depends_on: [D20260522-003]
  context: wants.md 主要 UC を採用。

- id: D20260522-006
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q5 データ規模感
  question: データ規模感
  options:
    - "個人 100-500 枚/年、累計 DAU 100 で 30K-150K 枚/年。1 枚 1-2 MB (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で算定済み。Supabase Storage 無料枠 1GB は DAU 50 程度までの目安。

- id: D20260522-007
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q6 想定同時利用者数
  question: 想定同時利用者数
  options:
    - "ローンチ DAU 10-30、1 年後 DAU 100-300 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: 個人開発の口コミ広がり想定。

- id: D20260522-008
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q7 外部連携
  question: 外部連携
  options:
    - "OpenAI Vision API (gpt-4o-mini) + Supabase Auth/Storage + (任意) PlantNet API (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で明示。

- id: D20260522-009
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q8 非機能要件
  question: 非機能要件
  options:
    - "性能: 撮影→同定→表示 5 秒 / 可用性: SLA なし、Supabase/Vercel 標準 / セキュリティ: private bucket / プライバシー: 位置情報 default OFF + EXIF 削除 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で確定。

- id: D20260522-010
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q9 体制・予算・納期
  question: 体制・予算・納期
  options:
    - "seiji 単独 / 初期 $0 + 運用 $0-30/月 / MVP 1-2 ヶ月 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で確定。

- id: D20260522-011
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q10 技術選好
  question: 技術スタック方向性
  options:
    - "フロント: Vite + React + TypeScript (PWA) / バック: Supabase (DB+Storage+Auth) / ホスト: Vercel Hobby / AI: OpenAI gpt-4o-mini Vision (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で確定。preferences.md は空のため傾向参照なし。本 PJ が学習元第 1 号。

- id: D20260522-012
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q11 リソース選定たたき台 + コスト
  question: 各カテゴリのリソース選定 + USD/月コスト桁感
  options:
    - "フロント FW: React+TS / 状態管理: Zustand or TanStack Query / UI: Tailwind CSS + shadcn/ui / BaaS: Supabase 無料枠 / 認証: Supabase Auth (Google OAuth) / Storage: Supabase Storage / AI: OpenAI Vision / 画像処理: ブラウザ WebP + Edge Function 補助 / PWA: vite-plugin-pwa / ホスティング: Vercel Hobby / 監視: Sentry 無料枠 / CI/CD: GitHub Actions / ドメイン: お名前.com 等 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: [D20260522-011]
  context: |
    PWA + BaaS + 個人ツール想定で動的選定。
    無料枠厳守、AI コストのみ従量 (DAU 30 で $1/月、DAU 300 で $30/月)。
    各単価は 2026-05 時点想定、最新 pricing 要確認。

- id: D20260522-013
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q12 ローカル開発環境
  question: ローカル開発スタイル
  options:
    - "BaaS local (Supabase CLI) — supabase start で DB+Storage+Auth エミュレータ起動 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: [D20260522-012]
  context: wants.md で明示、Supabase 採用と整合。

- id: D20260522-014
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q12.5 外部 AI サービス
  question: 外部 AI 利用 + 用途 + プロバイダ + プライバシー + フォールバック + コスト + 価値検証
  options:
    - "使う / OpenAI gpt-4o-mini Vision / store=false + ユーザー設定で AI OFF 可 / ダウン時は『同定保留』モード / DAU 30 で $1/月、DAU 300 で $30/月 / 差別化: (a) 文脈収集 (位置+季節+履歴) + (c) 出力後処理 (ノート構造化) + (e) UI 統合 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: [D20260522-012]
  context: |
    wants.md §外部 AI サービス組み込み で詳細確定済み。
    AI 価値検証観点 (7) — ユーザー直接 ChatGPT 経由との差別化根拠は (a)(c)(e) で明示。

- id: D20260522-015
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q12.6 アナリティクス・計測 + コスト追跡
  question: アナリティクス利用 + プロバイダ + プライバシー + 計測イベント + コスト追跡
  options:
    - "Sentry 無料枠 (エラー監視) + 自前コスト集計 (OpenAI API call ログ × .env 単価) + 利用分析は MVP では入れない (recommended)"
    - "PostHog 無料枠でユーザー行動分析も入れる"
    - "GA4 + GTM のフルセット"
  recommended: 案 A (最小構成)
  chosen: 案 A (Sentry + 自前コスト集計 + 利用分析は様子見)
  chosen_type: auto-recommended
  depends_on: [D20260522-012]
  context: |
    wants.md ではアナリティクス具体未指定。個人ツール + 無料枠厳守原則から最小構成を採用。
    コスト追跡 §4.6.2 メカニズムは全 PJ 必須なので Sentry + 自前単価管理で実装。
    利用分析は α 公開後に判断 → [論点-005] として §8 登録。

- id: D20260522-016
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q12.7 共通機能群
  question: 認証方式 / 通知 / お問い合わせ / 監査
  options:
    - "(1) 認証 = Supabase Auth Google OAuth + メールマジックリンク (MVP)、パスキーは v2 検討 / (2) 通知 = MVP はアプリ内バッジのみ、Push 通知は v2 / (3) お問い合わせ = メールフォーム (送信先固定) + X DM 案内 / (4) 監査 = 単一ユーザー個人ツールのため不要 (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: [D20260522-012]
  context: |
    wants.md は Supabase Auth (Google) + メールに言及。
    パスキー: Supabase Auth は 2025-Q4 にβサポート、本 PJ MVP では Google OAuth で十分 → [論点-001]
    通知: 季節レコメンド UC5 の配信方式 → [論点-002]
    監査: 共同編集なしのため不要 (single-user 個人ノート)。

- id: D20260522-017
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 2 / Q12.8 法務・コンプライアンス書類
  question: 法務書類
  options:
    - "プライバシーポリシー必須 (画像+位置+識別) / 利用規約必須 (公開 PJ) / 特商法表記必須 (有償課金、日本国内) / GDPR 不要 (国内向け) / 個人情報保護法対応必須 / Cookie ポリシー (該当時) (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md で明示済み。

- id: D20260522-018
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 3 / 論点抽出
  question: 未決論点
  options:
    - "[論点-001] パスキー採否 / [論点-002] 季節レコメンド配信方式 / [論点-003] 図鑑 PDF 生成エンジン / [論点-004] 位置情報保存粒度 / [論点-005] 利用分析ツール導入時期 (recommended)"
  recommended: 同上
  chosen: 同上 (5 論点登録)
  chosen_type: open
  depends_on: [D20260522-016, D20260522-015]
  context: 各論点は §8 で詳細展開、判断期限は MVP α 公開前後に分配。

- id: D20260522-019
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 5.3 / ドキュメントフォルダ作成
  question: 機能・横断フォルダ構成
  options:
    - "機能: capture, notebook, export, memory, billing, account, legal / 横断: _shared/{db, types, helpers, auth, storage, ai, analytics} (recommended)"
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: [D20260522-005, D20260522-012]
  context: UC マッピング + Supabase + OpenAI 採用に基づく自然な分割。

- id: D20260522-020
  timestamp: 2026-05-22T09:50:00+09:00
  command: /flow:concept
  phase: Step 5.5 / wants クリーンアップ
  question: wants.md のクリーンアップ方針
  options:
    - "(a) クリアする (Recommended) — 全話題が concept.md / §8 論点に消化済み"
    - "(b) 別場所にアーカイブ"
    - "(c) クリアしない"
  recommended: "(a) クリアする"
  chosen: "(a) クリアする — 冒頭にクリア履歴コメントを残す"
  chosen_type: auto-recommended
  depends_on: []
  context: wants.md の全 13 セクションが concept.md or §8 論点に反映済み。

- id: D20260522-021
  timestamp: 2026-05-22T10:02:00+09:00
  command: /flow:concept
  phase: Step 7.5 / preferences 更新確認
  question: preferences.md 更新方針
  options:
    - "(a) すべて更新 (Recommended)"
    - "(b) 個別に確認"
    - "(c) 今回は更新しない"
  recommended: "(a) すべて更新"
  chosen: "(a) すべて更新"
  chosen_type: explicit-choice
  depends_on: [D20260522-011, D20260522-012, D20260522-013, D20260522-014, D20260522-015, D20260522-016]
  context: |
    seiji 確認済 → 学習元 PJ 数 0→1。§2.1-2.8 / 2.10-2.12 に試行レベル登録、
    §5 に non-recommended 5 件 (Firebase / Auth0 / GA4 / パスキー MVP / Web Push MVP)。
    §3 条件付き選好 / §4 汎用パターン は 3+ PJ 必要のため今回は登録しない。

- id: D20260522-022
  timestamp: 2026-05-22T10:15:00+09:00
  command: /flow:concept
  phase: UPDATE / 認証フロー再設計
  question: 認証フローをどうするか (charter §1.1「気軽さ」との整合)
  options:
    - "匿名スタート + Google OAuth 後リンク (Supabase Anonymous Auth) (Recommended)"
    - "最初から Google OAuth 必須 (現状維持)"
    - "ブラウザローカルのみ (認証なし、IndexedDB/OPFS)"
  recommended: "匿名スタート + 後リンク"
  chosen: "匿名スタート + 後リンク"
  chosen_type: explicit-choice
  depends_on: [D20260522-016]
  context: |
    seiji 指摘「気軽なマイクロサービスでは認証させたくない、でもファイル保存で必要か」を受けて
    charter §1.1「無料で触り始められる — 新規アカウント不要 or Google ログインのみ」と現状設計の矛盾を解消。
    起動 → 即撮影可能、「他端末で見たい / 課金したい」時のみ OAuth リンク。
    charter 適合性向上 + UX 摩擦最小化。トレードオフは [論点-006][論点-007] で新規登録。

- id: D20260522-023
  timestamp: 2026-05-22T10:15:00+09:00
  command: /flow:concept
  phase: UPDATE / 論点追加
  question: 匿名 user の SPAM 抑止策をどうするか
  options:
    - "[論点-006] 新規登録 (A: IP+fingerprint / B: Turnstile / C: 匿名は 3 回/総量 / D: ハイブリッド A+D)"
  recommended: "案 A+D ハイブリッド = 匿名 3 回/総量 + デバイスフィンガープリント"
  chosen: null
  chosen_type: open
  depends_on: [D20260522-022]
  context: |
    匿名スタート採用で「cookie クリア → 無料枠リセット」ループが成立してしまう。
    `/flow:feature billing` 着手前に確定要。

- id: D20260522-024
  timestamp: 2026-05-22T10:15:00+09:00
  command: /flow:concept
  phase: UPDATE / 論点追加
  question: 匿名 → リンク時のデータ移行戦略
  options:
    - "[論点-007] 新規登録 (A: マージ選択提示 / B: 自動マージ / C: 最初のリンクのみ + 明示ガイダンス)"
  recommended: "案 C (最初のリンクのみ、2 つ目以降は明示ガイダンス)"
  chosen: null
  chosen_type: open
  depends_on: [D20260522-022]
  context: |
    Supabase linkIdentity API のエッジケース (同一 Google アカウントが別匿名 user と既にリンク済) 対応必要。
    `/flow:feature account` 着手前に確定要。
```
