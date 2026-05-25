<!-- auto-generated-start -->
# 設計レビューレポート — billing revise_001 (guest-billing)

**レビュー日**: 2026-05-26
**レビュー実施者**: Claude (claude-opus-4-7) + seiji
**対象**: billing revise_001 (ゲストトークン低価格単発課金 + pdf_unlock 全廃) — 実装前 (101 不在)
**入力**: revise_001 の 001_REVISE_SPEC〜005_REVISE_MIGRATION + concept §1.3/§3/§5 + 実コード調査
**観点ソース**: 組み込みチェックリスト + ~/.claude/review-perspectives.md (P1..P28、特に P1/P2/P7/P11/P19/P25 を適用)
**モード**: auto-pick (推奨自動確定 + AI_LOG 記録)
**severity-threshold**: low

> 注: 標準の「未実装 feature」対象は本 PJ に存在しない (全 feature 実装済)。実装前の設計は本 revise_001 のみのため、これをレビュー対象に選定した。

## 1. レビューサマリー

| 観点 | 評価 | 備考 |
|---|---|---|
| 仕様の明確性 | OK | 変更前/後・新仕様が明確 |
| 既存パターンとの一貫性 | OK | 純関数 quota + DI persist (O35) を踏襲 |
| 影響範囲・副作用 | **要確認** | `mustLink`/`link_required` の consumer が PLAN に列挙漏れ (R1) |
| API 流用・責務逸脱 | **要確認** | `mustLink` が 2 つの意味 (trial 枯渇 / fingerprint cap) を兼用 (R2/R3) |
| 既存実装の再利用 | OK (良) | credits 消費の persist 経路は既存再利用可 (R4) |
| データ移行・互換性 | OK | pdfUnlocked drop + enum dead 残置、down migration あり |
| エラーハンドリング | 要確認 | `link_required` typed error の去就未定 (R5) |
| 権限・認可 | OK | withUserScope 維持、匿名も userId スコープで完結 |
| テストカバレッジ | OK | 003/004 が匿名+credits・401→402・冪等性を網羅 |

## 2. 指摘事項 (severity 降順)

### [R1] mustLink / link_required の consumer が PLAN §1 に列挙漏れ (severity=High)
- **対象**: 002_REVISE_PLAN §1
- **現状**: PLAN は quota.ts / identify-plant / status.ts / spam-check / QuotaModal / billing api・hooks / ai/identify / types を列挙。
- **問題**: 実コード grep で**未列挙の consumer**を検出 (P2 同一ロジック全列挙 / P7 共有エンドポイント影響 / P19 既存有無確認):
  - `src/shared/auth/trial.ts` — **`TrialQuota.mustLink` + `requireTrial`→LinkRequiredError** (mustLink の第2系統)
  - `src/shared/auth/spam-guard.ts` — `requireTrial`→LinkRequiredError の遠隔判定経路
  - `src/shared/types/api.ts:10` — `{ error: 'link_required' }` は**型 union のメンバ**
  - `src/features/billing/hooks.ts:65,73` + `api.ts:63` — `mustLink` DTO 露出面
  - `src/features/capture/CaptureContainer.tsx:32` `linkRequired = mustLink` → `CaptureButton.tsx:38` reason 分岐 → `CapturePage.tsx` linkRequired prop → **`QuotaModal.tsx` reason='link_required' → navigate('/billing') (OAuth 誘導)**
- **推奨**: PLAN §1 に上記を追記し、各 consumer を「flip to 購入導線 / 削除 / 維持」で分類。特に QuotaModal の reason='link_required'→連携誘導が、新方針では**購入導線**に変わる中核 UX。
- **種別**: 指摘事項 (自動反映)
- **chosen**: PLAN §1 に consumer インベントリを追記。
- **反映先**: 002_REVISE_PLAN §1 (`<!-- spec-review R1 -->`)

### [R2] [論点-R001] (spam-check fingerprint-cap → mustLink) を実装前に解決すべき (severity=High)
- **対象**: 001_REVISE_SPEC §9 / 002_REVISE_PLAN Phase 5
- **現状**: `api/auth/spam-check.ts:31` が cap 到達時 `mustLink:true` を返す。SPEC は [論点-R001] として open のまま。
- **問題**: `mustLink` 廃止で本経路はコンパイル/意味の両面で破綻。かつ fingerprint-cap は濫用制御なので**黙って弱体化させてはいけない**。open のまま /flow:tdd に入ると Phase 5 で判断が宙に浮く。
- **推奨**: 推奨案 (a) を**確定**: fingerprint-cap の enforcement を guest-provision (発行レート制限 + cap で新規ゲスト発行を拒否) に一元化し、identify 時の cap→mustLink 経路は除去。O47 (濫用防御は安価 ID の発行・枠で行う) と整合。
- **種別**: 設計判断項目 → auto-pick で (a) 確定
- **chosen**: (a) guest-provision に一元化、identify の cap→mustLink 除去。
- **反映先**: 001_REVISE_SPEC §9 ([論点-R001] を resolved 化) + 002_REVISE_PLAN Phase 5 (`<!-- spec-review R2 -->`)

### [R3] mustLink は EffectiveQuota と TrialQuota の 2 系統。identify enforcement は effectiveQuota のみ使用 (severity=Medium)
- **対象**: 002_REVISE_PLAN §1 / §8
- **現状**: `quota.ts EffectiveQuota.mustLink` と `trial.ts TrialQuota.mustLink` が別個に存在。`api/identify-plant.ts` の enforcement は `fetchEffectiveQuota`(=effectiveQuota) のみを使用し、trial.ts/spam-guard は identify enforcement 経路では呼ばれない (別経路 = guest/pre-check 系)。
- **問題**: trial.ts/spam-guard の `requireTrial`→LinkRequiredError 経路の**到達性**と新方針 (リンク強制廃止) の整合が未確認。放置すると「片方を直して片方が link 強制のまま」になり得る (P2)。
- **推奨**: trial.ts/spam-guard の呼び出し元を grep で確定し、(i) 到達する UX 経路なら購入導線へ flip、(ii) guest-provision の spam-guard 用途のみなら濫用制御として維持 (R2 と統合)。
- **chosen**: PLAN §1/§8 に trial.ts/spam-guard の呼出元確定タスクを追加 (Phase 1 で実施)。
- **反映先**: 002_REVISE_PLAN §1, §8 (`<!-- spec-review R3 -->`)

### [R5] `link_required` typed error の去就を明示 (severity=Medium)
- **対象**: 001_REVISE_SPEC §2.4 / `src/shared/types/api.ts:10`
- **現状**: `{ error: 'link_required' }` は型 union のメンバ。identify は 402 化、checkout は requireLinked 撤廃。
- **問題**: 変更後 `link_required` を返す経路が残るか不明。残らなければ型から除去、残る (任意リンク導線等) なら用途を再定義すべき (デッド型 union メンバの放置は P19 的負債)。
- **推奨**: 変更後の到達経路を確認し、無ければ `api.ts` の union から `link_required` を除去 (frontend の対応分岐も削除)。
- **chosen**: 去就確認 + 不要なら除去を PLAN に明記。
- **反映先**: 001_REVISE_SPEC §2.4 注記 (`<!-- spec-review R5 -->`)

### [R6] 匿名 checkout のレート制限を確認 (severity=Low)
- **対象**: 001_REVISE_SPEC §7.5
- **現状**: requireLinked 撤廃で匿名が checkout 到達可能に。
- **推奨**: Stripe Checkout Session 乱造防止に、create-checkout-session が (guest 発行同様の) レート制限対象か確認。未対象なら Upstash limiter を付与。
- **反映先**: 001_REVISE_SPEC §7.5 注記 (`<!-- spec-review R6 -->`)

### [R7] quantity=1 固定時の連続購入 UX (severity=Low)
- **対象**: 001_REVISE_SPEC §7.1
- **推奨**: 1 回 ¥100=10 回上限のため、使い切り後に再度 ¥100 購入できる導線 (QuotaModal から 1 タップ再購入) を仕様に明示。
- **反映先**: 001_REVISE_SPEC §7.1 注記 (`<!-- spec-review R7 -->`)

## 3. コードベース調査結果

### 3.1 既存パターン
- quota: `src/shared/ai/quota.ts` 純関数 + `api/_lib/quota.ts` が DB 読み (fetchEffectiveQuota)。billing/status と identify が**共有** (claim_001 の二重定義再発防止)。
- 消費: `api/identify-plant.ts persistIdentify` が `consume` で trial++/credits--/monthly(api_usage 行) を分岐。

### 3.2 影響範囲分析
| 変更対象 | 既存呼び出し箇所 | 呼び出し元の前提 (契約) | 破壊リスク |
|---|---|---|---|
| `EffectiveQuota.mustLink` (削除) | quota.ts / api/_lib/quota.ts / status.ts:46 / billing hooks.ts:73・api.ts:63 / CaptureContainer:32 | mustLink:boolean を前提に link 誘導 | 中 (型削除で全箇所コンパイルエラー → 検出可) |
| `effectiveQuota` 匿名分岐 | api/_lib/quota.ts → identify-plant getQuota / billing status | remaining + consume を返す | 低 (純関数、テスト容易) |
| `consume='credits'` (匿名で新たに発生) | `persistIdentify:189-192` | **既に credits 減算を実装済** | なし (既存再利用) |
| `requireLinked` (撤廃) | create-checkout-session のみ | 匿名で 401 link_required | 低 |
| `link_required` (401) identify | ai/identify.ts:47 / types/api.ts:10 / CaptureButton/QuotaModal | 401→連携誘導 | 中 (FE 分岐の意味反転) |

### 3.3 API 責務の評価
- **責務兼用の検出**: `mustLink` が「匿名 trial 枯渇 (quota.ts)」と「fingerprint cap 到達 (spam-check.ts)」の**2 つの異なる意味**を 1 フラグで表現していた。廃止に際し意味を分離する必要 (R2 で guest-provision へ、quota は購入導線へ)。流用ではないが、単一フラグへの意味集約が変更を波及させている。

## 4. 設計判断ログ

| # | 判断項目 | 結論 | chosen_type | 反映先 |
|---|---|---|---|---|
| D1 (R1) | consumer 列挙漏れ | PLAN §1 に全 consumer 追記・分類 | auto-recommended | 002 §1 |
| D2 (R2) | [論点-R001] 解決 | guest-provision に cap 一元化、identify の cap→mustLink 除去 | auto-recommended | 001 §9 / 002 P5 |
| D3 (R3) | trial.ts/spam-guard 到達性 | Phase 1 で呼出元確定 → flip or 維持を判定 | auto-recommended | 002 §1/§8 |
| D4 (R5) | link_required 型の去就 | 到達経路確認 → 不要なら union から除去 | auto-recommended | 001 §2.4 |
| D5 (R6) | 匿名 checkout rate-limit | limiter 付与を確認 | auto-recommended | 001 §7.5 |
| D6 (R7) | 連続購入 UX | 再購入導線を明示 | auto-recommended | 001 §7.1 |

## 5. 次のステップ
- 反映済み 001/002 を確認 (`<!-- spec-review R{N} -->` 箇所)
- R2/R3 は Phase 1 着手時に解決 (実装前の最重要)
- 準備ができたら `/flow:tdd billing revise_001` で Phase 1 (quota コア) から実装着手
<!-- auto-generated-end -->
