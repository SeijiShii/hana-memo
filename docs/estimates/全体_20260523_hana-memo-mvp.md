---
generated_at: 2026-05-23 10:30
generator: /flow:estimate
context: whole
source_input: ../concept.md
interpreted_as:
  feature: null
  phase: detailed
  source: autodetect (Layer 3: docs/<feature>/002_*_PLAN.md 揃い)
phase: detailed
confidence_band:
  ai_impl: "±50%"
  human_bottleneck: "±50%"
  ai_tokens_design: "±30%"
  ai_tokens_impl: "±50%"
nfr_profile:
  scale: low
  throughput: low
  latency: standard
  availability: 99
  source: explicit
  rationale: "concept.md §3 NFR: DAU 30-300 (low scale), AI 同定中心の低 throughput, P95 5 秒 (standard latency), SLA なし (99)"
calibration:
  global_metrics_jsonl: empty (0 lines, 初回 PJ)
  project_stats_md: not_present
  applied: defaults (no calibration data available)
  confidence_band_adjustment: "default ±50% (N<5)"
summary:
  min:
    total_files: 60
    total_lines: 5500
    human_hours: 10
    ai_tokens_design_remaining_K: 15
    ai_tokens_impl_K: 45
    ai_tokens_total_K: 60
  standard:
    total_files: 152
    total_lines: 14000
    human_hours: 25
    ai_tokens_design_remaining_K: 30
    ai_tokens_impl_K: 120
    ai_tokens_total_K: 150
  full:
    total_files: 305
    total_lines: 28000
    human_hours: 50
    ai_tokens_design_remaining_K: 50
    ai_tokens_impl_K: 240
    ai_tokens_total_K: 290
---

# 見積もり: hana-memo MVP (全体)

「散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA」の全体実装見積もり。

**主指標**: ファイル数 / コード行数 / 人間時間 / AI 推論トークン量 (フェルミ推定、物理量)。金額換算は利用側でモデル単価 × トークン数で算出してください。

## サマリ表

| スコープ | ファイル数 | コード行数 (logic + test) | 人間時間 | AI 推論トークン (設計残 + 実装) |
|---|---|---|---|---|
| Minimum | 60 | 5,500 | 10h | 設計残 15K + 実装 45K = **合計 60K** (±50%) |
| Standard | 152 | 14,000 | 25h | 設計残 30K + 実装 120K = **合計 150K** (±50%) |
| Full | 305 | 28,000 | 50h | 設計残 50K + 実装 240K = **合計 290K** (±50%) |

> **confidence band**: AI-impl ±50% (phase=detailed) / Human-bottleneck ±50% / AI トークン設計 ±30% / 実装込み ±50%
> **NFR プロファイル**: scale=low, throughput=low, latency=standard, availability=99 (source: explicit、concept §3 から抽出)
> **NFR 倍率**: scale(0.7) × throughput(0.8) × latency(1.0) × availability(1.0) = **0.56** (※下記ブレークダウンの「baseline」値に対し適用済の Std 値。Min/Full は 1/2.5 × Std / 2 × Std)
> **金額換算**: コード行数 × AI コーディングレート、AI 推論トークン × モデル単価で利用側で算出
> **参考単価 (2026-05 時点想定、要確認)**: Haiku 4.5 ¥0.80/1M (input)、Sonnet 4.6 ¥3/1M、Opus 4.7 ¥15/1M (出力は 5x)
> **重要前提**: 設計フェーズは既に消化済 (D20260522〜D20260523 セッション 24 件、累計 decision 約 180 件)。本見積もりの「設計残」は **legal revise + L3-L5 セキュリティ監査 + tdd phase 完了報告 + 公開後 fix 想定数件** のみ。実装フェーズが残りの主体

## 1. 機能フォルダ別ブレークダウン (7 件)

> 計上は Standard (baseline ×0.56 NFR 適用後)。Min = Std × 0.4、Full = Std × 2.0。

### 1.1 `docs/account/` (優先度 3) — サインアップ / ログイン / 設定 / オプトアウト

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 2 | 200 | 4 | 500 | 8 | 1000 |
| api_code | ai_impl | 1 | 100 | 2 | 250 | 4 | 500 |
| unit_test | ai_impl | 2 | 100 | 4 | 250 | 8 | 500 |
| e2e_auto | ai_impl | 1 | 60 | 2 | 150 | 4 | 300 |
| **小計** | | **6** | **460** | **12** | **1,150** | **24** | **2,300** |

**根拠**: Clerk Guest Users β + Google OAuth Linking、設定画面 (location precision / analytics_opt_in トグル)、Webhook (`/api/clerk-webhook`)。

### 1.2 `docs/capture/` (優先度 4、UC1 中核)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 3 | 300 | 6 | 750 | 12 | 1500 |
| api_code | ai_impl | 0 | 0 | 0 | 0 | 0 | 0 |
| unit_test | ai_impl | 2 | 120 | 5 | 300 | 10 | 600 |
| e2e_auto | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| **小計** | | **6** | **500** | **13** | **1,250** | **26** | **2,500** |

**根拠**: Camera UI + WebP 変換 + EXIF strip (helpers 委譲) + 結果画面 + 「分からないまま保存」UI。AI 同定 API は `_shared/ai` (横断計上、本機能でゼロ)。

### 1.3 `docs/notebook/` (優先度 4、UC2)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 4 | 400 | 8 | 1000 | 16 | 2000 |
| api_code | ai_impl | 0 | 0 | 0 | 0 | 0 | 0 |
| unit_test | ai_impl | 3 | 200 | 6 | 500 | 12 | 1000 |
| e2e_auto | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| **小計** | | **8** | **680** | **16** | **1,700** | **32** | **3,400** |

**根拠**: タイムライン / 地図 / 図鑑モード / 詳細 / 編集 (5 画面、Drizzle クエリ + 月次集計)。

### 1.4 `docs/billing/` (優先度 4)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 1 | 100 | 3 | 400 | 6 | 800 |
| api_code | ai_impl | 2 | 200 | 4 | 500 | 8 | 1000 |
| unit_test | ai_impl | 2 | 150 | 4 | 400 | 8 | 800 |
| e2e_auto | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| **小計** | | **6** | **530** | **13** | **1,500** | **26** | **3,000** |

**根拠**: Stripe Checkout + Webhook (`/api/stripe-webhook`)、PWYW + content-unlock、`/api/billing/usage`、月次収益 CSV エクスポート (§4.6.4.1)。

### 1.5 `docs/export/` (優先度 5、UC3)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 1 | 100 | 3 | 400 | 6 | 800 |
| api_code | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| unit_test | ai_impl | 2 | 100 | 3 | 300 | 6 | 600 |
| e2e_auto | ai_impl | 1 | 60 | 2 | 150 | 4 | 300 |
| **小計** | | **5** | **340** | **10** | **1,050** | **20** | **2,100** |

**根拠**: jsPDF + html2canvas クライアント生成 ([論点-003] 解決)。プレビュー + 課金導線 + ダウンロード。100 件超のハングリスク対応 (チャンク化)。

### 1.6 `docs/memory/` (優先度 5、UC5)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| api_code | ai_impl | 0 | 0 | 1 | 100 | 2 | 200 |
| unit_test | ai_impl | 1 | 60 | 2 | 150 | 4 | 300 |
| e2e_auto | ai_impl | 1 | 40 | 1 | 100 | 2 | 200 |
| **小計** | | **3** | **180** | **6** | **550** | **12** | **1,100** |

**根拠**: アプリ内バッジ ([論点-002] 解決、Push なし)、同月日 ±15 日範囲一致判定、notebook 内に統合表示。

### 1.7 `docs/legal/` (優先度 1)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| ui_code (静的ページ) | ai_impl | 4 | 200 | 4 | 400 | 4 | 600 |
| api_code (consent_logs) | ai_impl | 0 | 0 | 1 | 100 | 2 | 200 |
| unit_test | ai_impl | 1 | 50 | 2 | 150 | 4 | 300 |
| e2e_auto | ai_impl | 1 | 40 | 1 | 80 | 2 | 160 |
| **doc (法務原稿)** | **human_bottleneck** | — | — | — | — | — | — |
| **小計** | | **6** | **290** | **8** | **730** | **12** | **1,260** |
| **doc 人間時間** | | — | — | — | **2h** | — | **5h** |

**根拠**: プラポリ / 利用規約 / 特商法表記 / Cookie ポリシー (4 静的ページ)。同意 UI + `consent_logs` INSERT。**法務原稿の文章執筆 + (Std/Full で) 法務専門家レビューは Human-bottleneck**。

### 機能フォルダ合計

| スコープ | files | lines | human_hours |
|---|---|---|---|
| Min | 40 | 2,980 | 0 |
| **Std** | **78** | **7,930** | **2** |
| Full | 152 | 15,660 | 5 |

---

## 2. 横断フォルダ別ブレークダウン (7 件) — 全て `is_new=true` (新規開発)

### 2.1 `docs/_shared/db/` (優先度 1) — Drizzle スキーマ + migration

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| db_schema | ai_impl | 1 | 200 | 1 | 400 | 1 | 600 |
| api_code (helper) | ai_impl | 2 | 100 | 4 | 300 | 8 | 600 |
| iac (migration) | ai_impl | 2 | 50 | 4 | 150 | 8 | 300 |
| unit_test | ai_impl | 2 | 100 | 4 | 250 | 8 | 500 |
| **小計** | | **7** | **450** | **13** | **1,100** | **25** | **2,000** |

**根拠**: 9 テーブル (users / discoveries / plants / images / api_usage / billing_unlocks / consent_logs / discovery_edits / user_settings) + webhook_dedupe (revise 追加)、Drizzle ORM 型生成、`getOwnedDiscovery` 等の認可 helper。

### 2.2 `docs/_shared/types/` (優先度 1)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| type | ai_impl | 3 | 80 | 6 | 200 | 12 | 400 |
| **小計** | | **3** | **80** | **6** | **200** | **12** | **400** |

**根拠**: ai.ts / discovery.ts / billing.ts / analytics.ts / api.ts / index.ts。

### 2.3 `docs/_shared/helpers/` (優先度 1)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| helper | ai_impl | 4 | 200 | 7 | 450 | 14 | 900 |
| unit_test | ai_impl | 3 | 150 | 6 | 350 | 12 | 700 |
| **小計** | | **7** | **350** | **13** | **800** | **26** | **1,600** |

**根拠**: date / image (WebP + EXIF) / location (~100m 丸め) / season / hash (sha256Hex) / url (revise: assertSafeImageUrl + validateObjectKey)。

### 2.4 `docs/_shared/analytics/` (優先度 1) — Sentry + cost + scrubber (revise 後)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| api_code | ai_impl | 3 | 200 | 5 | 450 | 10 | 900 |
| api_code (Vercel Function) | ai_impl | 1 | 100 | 2 | 250 | 4 | 500 |
| unit_test | ai_impl | 3 | 200 | 5 | 400 | 10 | 800 |
| **小計** | | **7** | **500** | **12** | **1,100** | **24** | **2,200** |

**根拠**: sentry.ts (revise: beforeSend) / cost.ts / unit-prices.ts / **scrubber.ts (revise 新規、7 パターン)** / check-quota.ts / refresh-matview.ts / export-revenue.ts。

### 2.5 `docs/_shared/auth/` (優先度 2)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| api_code | ai_impl | 3 | 200 | 5 | 400 | 10 | 800 |
| api_code (Vercel Function) | ai_impl | 1 | 100 | 2 | 250 | 4 | 500 |
| unit_test | ai_impl | 3 | 150 | 5 | 350 | 10 | 700 |
| **小計** | | **7** | **450** | **12** | **1,000** | **24** | **2,000** |

**根拠**: Clerk SDK ラッパ + Guest Users β + linkIdentity + fingerprint + spam-check + clerk-webhook ([論点-006][論点-007] 解決)。

### 2.6 `docs/_shared/storage/` (優先度 2) — R2 Presigned URL

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| api_code | ai_impl | 1 | 80 | 2 | 200 | 4 | 400 |
| api_code (Vercel Function) | ai_impl | 2 | 100 | 3 | 250 | 6 | 500 |
| unit_test | ai_impl | 2 | 100 | 3 | 200 | 6 | 400 |
| **小計** | | **5** | **280** | **8** | **650** | **16** | **1,300** |

**根拠**: upload-url / signed-url Vercel Function、@aws-sdk/s3-request-presigner、TTL 60 分、`validateObjectKey` 経由 (revise 反映)。

### 2.7 `docs/_shared/ai/` (優先度 2) — OpenAI Vision + identify (revise 後)

| task_type | classification | Min files | Min lines | Std files | Std lines | Full files | Full lines |
|---|---|---|---|---|---|---|---|
| api_code | ai_impl | 2 | 150 | 3 | 300 | 6 | 600 |
| api_code (Vercel Function) | ai_impl | 4 | 300 | 6 | 600 | 12 | 1200 |
| api_code (ratelimit middleware) | ai_impl | 1 | 50 | 1 | 80 | 2 | 160 |
| unit_test | ai_impl | 3 | 250 | 5 | 500 | 10 | 1000 |
| **小計** | | **10** | **750** | **15** | **1,480** | **30** | **2,960** |

**根拠**: identify-plant Vercel Function + prompt.ts + schema.ts (Structured Output) + openai.ts (retry) + quota.ts + **ratelimit.ts (revise 新規、Upstash)** + フロント identify.ts。

### 横断フォルダ合計

| スコープ | files | lines |
|---|---|---|
| Min | 46 | 2,860 |
| **Std** | **79** | **6,330** |
| Full | 157 | 12,460 |

---

## 3. 基本部分 (12 項目) — 既存 PJ で未整備項目のみ計上

| # | 項目 | 状態 | Min files/lines | Std files/lines | Full files/lines |
|---|---|---|---|---|---|
| #1 | プロジェクト初期化 (Vite + TS + tsconfig + package.json) | 未着手、必須 | 4 / 200 | 5 / 300 | 6 / 400 |
| #2 | ESLint + Prettier + Husky pre-commit hook | 未着手 | 2 / 50 | 3 / 100 | 4 / 150 |
| #3 認証 | (機能 account / 横断 auth に吸収) | — | 0 | 0 | 0 |
| #4 認可 | (機能 / 横断に吸収) | — | 0 | 0 | 0 |
| #5 エラーハンドリング | (各機能に吸収) | — | 0 | 0 | 0 |
| #6 ログ | (機能 analytics に吸収) | — | 0 | 0 | 0 |
| #7 CI/CD | GitHub Actions (typecheck / lint / vitest / drizzle migration dry-run) | 未着手 | 1 / 80 | 3 / 200 | 5 / 350 |
| #8 IaC | vercel.json + Neon CLI scripts + Dependabot config | 未着手 | 2 / 80 | 3 / 150 | 5 / 250 |
| #9 監視 | (機能 analytics に吸収) + Slack quota webhook setup | (一部) | 0 / 0 | 1 / 50 | 2 / 100 |
| #10 i18n | concept §1.2 で「日本語のみ」明記、グローバル展開なし | スキップ | 0 | 0 | 0 |
| #11 a11y | WCAG A 部分対応 (Std)、AA 対応 (Full) | (一部) | 0 / 0 | 0 / 50 (各画面 +20% 込み) | 0 / 200 |
| #12 パフォーマンス | (各機能に吸収) | — | 0 | 0 | 0 |

### 基本部分合計

| スコープ | files | lines | human_hours |
|---|---|---|---|
| Min | 9 | 410 | 0 |
| **Std** | **15** | **800** | **0** |
| Full | 22 | 1,450 | 0 |

---

## 4. NFR 倍率の効き

| NFR 軸 | 値 | 倍率 | 影響項目 |
|---|---|---|---|
| scale | low (DAU 30-300) | 0.7x | 全 api_code (シャーディング・キャッシュ不要)、unit_test 削減 |
| throughput | low (AI 同定中心、N rps 小) | 0.8x | 同上 |
| latency | standard (P95 5 秒) | 1.0x | (なし) |
| availability | 99 (SLA なし) | 1.0x | (なし) |

**合計 NFR 倍率**: 0.7 × 0.8 × 1.0 × 1.0 = **0.56**

> 上記「§1-3 ブレークダウン」の数値は **NFR 倍率適用後** の値。NFR が medium-baseline だった場合の理論値は ÷0.56 ≈ 1.79x 大きくなる (Std で ~272 files、~25k lines 程度)。

---

## 5. AI 推論トークン量 (フェルミ推定、Step 11.5)

### 5.1 設計フェーズ残量

**既に消化済**: D20260522 (concept + 14 feature + BaaS Pivot) + D20260523 (secure + scenario + revise×2 + resume×2) = **24 セッション、累計推定 ~250K tokens**。`docs/AI_LOG/` 配下 24 ファイル + INDEX で実測可能 (将来 `/flow:audit` で集計予定)。

**残量** (本実装フェーズに進むまでの追加設計):

| セッション | input (K) | output (K) | total (K) |
|---|---|---|---|
| `/flow:revise legal sentry-disclosure` (プラポリ §9.1) | 7 | 4 | 11 |
| `/flow:secure --phase=deps` (TDD 着手後 1 回) | 5 | 2 | 7 |
| `/flow:audit standard` (α 公開前 1 回) | 15 | 5 | 20 |
| 想定外 fix/revise セッション (~5 件、各 5-10K) | 25 | 15 | 40 |
| TDD Phase サマリ + 構造化記録 | 8 | 4 | 12 |
| **小計 (設計残)** | **60** | **30** | **~90** |

> Std スコープ "設計残 30K" はこれの 1/3 (最小限のみ実施想定)。Min=15K、Full=50K (追加 audit / postmortem 含む)。

### 5.2 実装フェーズ

`code_lines × tokens/line × loop_factor`:

| スコープ | code_lines | tokens/line | loop_factor | 実装 input+output (K) |
|---|---|---|---|---|
| Min | 5,500 | 1.5 | 2.0 (RED→GREEN→IMPROVE 標準) × input ratio 3 | ~45 |
| **Std** | **14,000** | **1.5** | **~3** | **~120** |
| Full | 28,000 | 1.5 | 4.0 (a11y / 負荷テスト / refactor 多め) | ~240 |

> loop_factor は spec で 1.5-3 と幅あり、input/output 比は input が output の 3-5x として推定 (テスト失敗 → SPEC 再 Read → 実装の繰り返し)。

### 5.3 合計

| スコープ | 設計残 (K) | 実装 (K) | 合計 (K) | confidence |
|---|---|---|---|---|
| Min | 15 | 45 | **60** | ±50% |
| **Std** | **30** | **120** | **150** | ±50% |
| Full | 50 | 240 | **290** | ±50% |

### 5.4 単価換算は参考のみ (2026-05 時点想定、要確認)

| モデル | input ¥/1M | output ¥/1M | Std (150K) 想定コスト (input 70% / output 30% 比) |
|---|---|---|---|
| Haiku 4.5 | 0.80 | 4.00 | ¥0.084 (input) + ¥0.180 (output) ≈ **¥0.26** |
| Sonnet 4.6 | 3.00 | 15.00 | ¥0.315 + ¥0.675 ≈ **¥1.00** |
| Opus 4.7 | 15.00 | 75.00 | ¥1.575 + ¥3.375 ≈ **¥4.95** |

> 個人開発 PJ で実装フェーズ Std を Sonnet で進めるなら ¥1 程度 / Opus なら ¥5 程度 (合算)。**桁感の参考**、実際は cache 効率や reasoning コスト等で 2-3x 変動。

---

## 6. 人間時間 (Human-bottleneck) 内訳

| 項目 | classification | Min (h) | Std (h) | Full (h) | 備考 |
|---|---|---|---|---|---|
| AI 出力レビュー (14 設計対象 + revise + 法務) | human_bottleneck | 6 | 14 | 25 | 1 対象あたり 30-90 分 |
| 設計判断 (1問1答、追加 fix/revise/clarify) | human_bottleneck | 2 | 5 | 10 | 想定 ~10 回 (Std)、減らせる場面 (auto-pick) |
| 法務原稿執筆 (プラポリ / 利用規約 / 特商法) | human_bottleneck | 0 | 2 | 5 | 完全に AI 委任は法務リスクあり、Std で軽校正、Full で外部レビュー |
| E2E 手動テスト (デバイス触感 / 視覚微差 / 本番前最終 / 法務目視) | human_bottleneck | 1 | 2 | 5 | perspectives O33: 自動化基本、人力は例外のみ |
| α 公開準備 (招待リスト作成 / 監視 dashboard 確認 / Sentry 初期動作確認) | human_bottleneck | 1 | 2 | 5 | |
| **合計** | | **10** | **25** | **50** | |

### 6.1 自動化 E2E (Playwright、AI-impl 計上済)

§1 各機能の `e2e_auto` 行 + §2 横断 (ratelimit / SSRF / PII scrub テスト等) で計上済。Playwright + Vercel preview deploy で CI 組み込み。**人力 E2E は perspectives O33 に従い例外的のみ** (上記 6.1.4)。

---

## 7. 根拠サマリ (重要 5 件抜粋)

1. **NFR scale=low (0.7x)**: concept §3 で DAU 300 想定、Neon Free / Vercel Hobby 範囲。シャーディング・水平スケール不要 → api_code を 30% 削減
2. **i18n / a11y 計上ゼロ (基本部分 #10/#11)**: concept §1.2 で「日本語のみ、グローバル展開なし」明記、a11y は Std で軽対応のみ (各画面 +20% 込み)
3. **e2e_auto 重視 / e2e_manual 例外のみ**: perspectives O33 + concept §3 NFR で「全 E2E 自動化、人力は自動化で代替不可項目のみ」明示。Std で人力 2h、Full でも 5h
4. **二重計上回避**: `_shared/*` 全 7 件は **新規開発** (is_new=true、SPEC 初版あり、コード未着手) → 全て計上。機能フォルダで認証 / 認可 / DB 操作を再計上していない
5. **revise 反映済**: `_shared/ai` (rate limit + SSRF guard) と `_shared/analytics` (Sentry beforeSend scrubber) の revise 設計を §2.4 / §2.7 の Std に +0.5K LOC 程度反映済 (重複なし)
6. **設計フェーズはほぼ消化済**: 累計 ~250K tokens、24 セッション。本見積もりの「設計残」は legal revise + audit + 想定 fix のみで Std で 30K tokens

---

## 8. 二重計上回避 (whole 見積もり時の `is_new` 状態確認)

| 横断フォルダ | 状態 | 計上 |
|---|---|---|
| `docs/_shared/db/` | 新規 (SPEC + PLAN + revise 反映、コード未着手) | 計上 (§2.1) |
| `docs/_shared/types/` | 新規 | 計上 (§2.2) |
| `docs/_shared/helpers/` | 新規 (revise で url.ts 追加) | 計上 (§2.3) |
| `docs/_shared/analytics/` | 新規 (revise で scrubber.ts 追加) | 計上 (§2.4) |
| `docs/_shared/auth/` | 新規 | 計上 (§2.5) |
| `docs/_shared/storage/` | 新規 | 計上 (§2.6) |
| `docs/_shared/ai/` | 新規 (revise で ratelimit.ts 追加) | 計上 (§2.7) |

全 7 横断が `is_new=true`。`is_new=false` の項目なし (実装着手前のため、既存資産は zero)。

---

## 9. キャリブレーション根拠 (Metrics-driven)

- **PJ 性質タグ** (concept §1.2 由来): `[PWA + BaaS, 個人ツール → スモール商用, AI 利用あり, PII 扱い, 国内向け]`
- **グローバル実績**: `~/.claude/flow-data/global-metrics.jsonl` = **空 (0 lines)** — 初回 PJ、キャリブレーションデータなし
- **PJ 内実績**: `docs/AI_LOG/STATS.md` 不在
- **適用**: デフォルト係数のみ (キャリブレーションなし)
- **confidence band 動的調整**: N<5 のため **default ±50% 維持** (Phase=detailed の標準)

将来 `/flow:audit` 等で AI_LOG セッションから token usage / active_min / LOC 実績を集計 → `STATS.md` 自動生成 → 次回見積もりで本 PJ 実績 70% + グローバル 30% で精度向上。

---

## 10. 注意点 + 次のステップ

### 10.1 confidence band の意味

- Phase=detailed (PLAN 文書揃い) で AI-impl ±50%、つまり Std 14k lines は **7k-21k の範囲**を想定
- 実装着手後 IMPL_REPORT が出揃うと Phase=calibrated に昇格、±50% → 実測対比

### 10.2 NFR が default ではなく explicit である重要性

- concept §3 NFR が **明示的に低スケール**設定 (DAU 30-300、SLA なし)
- NFR を中規模に引き上げると Std が ~272 files / ~25k lines に膨らむ (1.79x)
- 商用化進展 (DAU 1000+) 時は NFR 上方修正 → 本見積もりを再実行推奨

### 10.3 次のアクション (SCENARIO §5 連携)

1. `/flow:revise legal sentry-disclosure` (プラポリ §9.1 追記、α 公開前必須、設計残 11K tokens / 法務原稿 2h)
2. **`/flow:tdd`** (連続実装モード、Std 想定で 14k lines × ~3 loop_factor = ~120K tokens、25h 人間時間)
3. `/flow:secure --phase=deps` (TDD 着手後 1 回、npm audit、想定 7K tokens / 0.5h)
4. `/flow:audit standard` (α 公開前、想定 20K tokens / 1h)

### 10.4 予算ガード (concept §4.6 連携)

- AI コスト追跡 (`api_usage` テーブル) は実装フェーズ完了後に有効化
- 本 estimate の AI 推論トークン (Std 150K) は **設計 + 実装の AI 自体のコスト** (`hana-memo` プロダクト機能のための AI 同定 OpenAI 呼出とは別腹)
- OpenAI Vision 同定の年間コスト (DAU 100 × 月 10 回 × $0.001 = ~$12/月) は concept §4.4 で既に計上済

---

## 11. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:estimate` 引数なし、whole context、phase=detailed autodetect) | /flow:estimate |
