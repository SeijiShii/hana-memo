# billing 変更仕様書 (ゲストトークン低価格単発課金 + pdf_unlock 全廃)

> **改修種別**: 機能変更 + 削除
> **issue / slug**: revise_001 / guest-billing
> **基準 SPEC**: `../001_billing_SPEC.md`
> **最終更新**: 2026-05-26
> **タグ**: auth-required(緩和) / stateful / external-api
> **適用観点**: O46 (ゲスト低価格単発課金) / O47 (無料枠の濫用耐性)

---

## 1. 変更概要

匿名(ゲスト)ユーザーが **ログイン無しのまま ¥100 = AI 識別 10 回 の単発課金**を行い、購入クレジットを消費できるようにする。これに伴い (1) 課金時の Google 連携強制を撤廃、(2) AI 識別の quota モデルを「匿名も購入クレジットを使える」へ更新、(3) pricing を ¥100=10回・上限¥100 に変更、(4) 不要な **PDF エクスポートアンロック (pdf_unlock / PWYW) と export 機能を全廃**する。無料枠の構造 (匿名 生涯3 / リンク済 月10) と濫用対策 (IP=rate-limit鍵のみ・fingerprint cap) は据え置き。連携は「別端末同期 + 月次無料」の**任意特典**へ格下げ。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| UC1 AI クレジット購入 | ¥100 / **20回**、OAuth 連携必須 | ¥100 / **10回**、**匿名のまま購入可**、1 回の購入上限 ¥100 | 低摩擦の少額課金 (O46) |
| UC2 PDF アンロック (PWYW) | ¥100–10000 で `pdf_unlocked=true` | **廃止** | PDF 機能不要 (export 休眠→削除) |
| UC3 購入履歴閲覧 | 過去 billing_unlocks を一覧 | **ユーザー向け閲覧 UI なし** (台帳は内部保持、領収書は Stripe) | 不要 (O46) |
| UC4 残高表示 | ai_credits_remaining 表示 | 変更なし | — |
| UC5 収益エクスポート | 運用者向け CSV | 変更なし | — |
| (AI 識別) 匿名 trial 超過 | `link_required`(401) で Google 連携を要求 | **`quota_exceeded`(402) で購入導線**。購入クレジットがあれば消費して継続 | ゲスト課金の本丸 |

### 2.2 入出力変更
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `POST /api/billing/create-checkout-session` | `requireLinked()` で匿名は 401 `link_required` | 匿名でも Checkout 発行 (`requireLinked` 撤廃) | 後方互換 (緩和) |
| body `type` | `'ai_credits' \| 'pdf_unlock'` | `'ai_credits'` のみ | 非互換 (pdf_unlock 廃止) |
| body `quantity` | 1–10 | 1 のみ (上限 ¥100) | 緩い非互換 |
| `POST /api/identify-plant` | 匿名 trial 超過 → 401 `link_required` | → 402 `quota_exceeded` (購入導線) | 非互換 (クライアント文言/分岐) |
| `GET /api/billing/status` | `{ aiCreditsRemaining, pdfUnlocked, mustLink }` | `{ aiCreditsRemaining }` (pdfUnlocked / mustLink 削除) | 非互換 |

### 2.3 データモデル変更
| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| `users.pdf_unlocked` (bool) | **DROP COLUMN** | ✅ (005 参照) |
| `users.ai_credits_remaining` (int) | 変更なし | — |
| `billing_type` enum | `'pdf_unlock'` 値は **dead-deprecated で残置** (Postgres enum 値削除回避) | △ (列 drop のみ、型は据え置き) |
| `billing_unlocks` テーブル | 構造変更なし (append-only 台帳・冪等性は維持)。今後 `type='pdf_unlock'` 行は生成されない | — |

### 2.4 バリデーション・エラー変更
| 対象 | 変更前 | 変更後 |
|---|---|---|
| 認証 (課金) | OAuth identity 必須 → E-BL-002 | **撤廃** (匿名可) |
| E-BL-002 匿名購入ブロック | 「Google 連携が必要」モーダル | **削除** |
| E-BL-007 PDF 二重課金 | UI disable + 文言 | **削除** (PDF 廃止) |
| amount (PWYW) 100–10000 検証 | 有効 | **削除** |
| quantity 検証 | 1–10 整数 | 1 のみ (上限 ¥100) |

<!-- spec-review R5: `link_required` typed error (src/shared/types/api.ts) の去就 — identify は 402 化・checkout は requireLinked 撤廃のため、変更後に link_required を返す到達経路を確認し、無ければ型 union + FE 分岐から除去する。Phase 1/4 で判定 -->
<!-- spec-review R7: quantity=1 固定 (¥100=10回上限) のため、使い切り後の **再購入導線** (QuotaModal から 1 タップで再度 ¥100 購入) を §7.1 UC に含める -->
<!-- spec-review R6: requireLinked 撤廃で匿名が create-checkout-session に到達可能になるため、Stripe Checkout Session 乱造防止に当エンドポイントのレート制限 (Upstash、guest 発行と同様) を確認・必要なら付与 (§7.5 NFR) -->
<!-- これら R5/R6/R7 の詳細は ./905_SPEC_REVIEW.md を参照 -->


## 3. 影響範囲

| 対象 | 影響度 | 説明 |
|---|---|---|
| 機能 billing | 高 | pricing / checkout / webhook / status / 画面 |
| 横断 _shared/ai (quota) | 高 | `effectiveQuota` 匿名分岐を credits 対応に、`mustLink` 廃止 |
| 横断 _shared/auth (trial) | 中 | `mustLink` 概念の整理 (trial は残すが「連携必須」表現を外す) |
| api/identify-plant | 高 | 匿名 trial 超過の 401→402 化、`LinkRequiredError` 経路除去 |
| api/auth/spam-check | 中 | fingerprint-cap → mustLink 経路を identify から外す (濫用制御は guest-provision に一元化) |
| schema | 高 | `pdf_unlocked` 列 drop |
| 機能 export | 高 | **dormant な PDF export 機能を削除** (`requirePdfUnlocked` 等) |
| 機能 notebook | 低 | `NotebookContainer` の export 参照 (既に休眠) を除去 |
| types (billing/domain/api) | 中 | `pdf_unlock` / `pdfUnlocked` / `mustLink` 型除去 |

## 4. 後方互換性

- **互換維持**: 一部のみ
  - ✅ 後方互換: `requireLinked` 撤廃 (既存リンク済ユーザーは引き続き購入可、匿名が新たに購入可になるだけ)。匿名が credits を消費可になるのは機能拡張。
  - ❌ 非互換: `pdf_unlock` / `users.pdf_unlocked` / `mustLink` / PWYW の削除、identify の 401→402、status レスポンス縮小。
- 影響を受けるクライアント: フロント (本リポジトリ内で同時更新するため外部クライアントなし)。
- pre-launch (MVP 未公開) のため**実ユーザー / 本番データへの移行影響は実質なし**。dev データに `pdf_unlock` 行があっても歴史行として残置。

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (大半)
- **DB マイグレーションのロールバック**: 有 — down migration で `pdf_unlocked boolean not null default false` を再追加 (005 §3)。`billing_type` enum は dead 値を残しているため型変更のロールバック不要。
- **手順**: `005_REVISE_MIGRATION.md` §3 参照。

## 6. リリース戦略

- **方式**: 一括 (フィーチャーフラグ不要)
- **理由**: pre-launch MVP、外部クライアント無し、影響範囲は単一リポジトリ内で同時更新。
- **ロールアウト**: (1) ローカルで匿名購入→クレジット消費の正常系確認 → (2) preview deploy で実 Stripe(test mode)正常系 → (3) 本番。実課金確認は `/flow:release` の課金系正常系チェックに委ねる。

## 7. 詳細仕様 (新仕様)

### 7.1 詳細 UC (新仕様)

**UC1 (改) AI クレジット購入 — 匿名可・¥100=10回**
- 入力: `{ type: 'ai_credits', quantity: 1 }`
- 認証: Clerk JWT (匿名ゲストでも可)。**連携チェックなし**。
- 処理: Stripe Checkout (¥100、metadata.userId=ゲスト userId) → 成功 → Webhook `checkout.session.completed` → `billing_unlocks` INSERT (type=ai_credits, amount=100) + `users.ai_credits_remaining += 10`。
- 出力: `ai_credits_remaining` +10。領収書は Stripe がメール送付。

**UC(AI識別) 匿名の quota 継続**
- 匿名の実効残 = `max(0, ANON_TRIAL_MAX − trial_used_count) + ai_credits_remaining`。
- 消費順序: trial → credits。
- trial+credits=0 → `quota_exceeded`(402) → フロントは**購入モーダル (¥100で10回)** を表示。**連携要求モーダルは出さない**。
- 連携は別 CTA (「別の端末でも使う / 毎月10回無料」) として任意提示。

### 7.2 入出力 (新仕様)
- API: `POST /api/billing/create-checkout-session` `{ type:'ai_credits', quantity:1 } → { url, sessionId }` (匿名可)。
- `GET /api/billing/status` → `{ aiCreditsRemaining: number }`。
- `POST /api/identify-plant` 枯渇時 → `402 { error:'quota_exceeded' }`。

### 7.3 データモデル (新仕様)
- `users`: `ai_credits_remaining int not null default 0` (維持)。`pdf_unlocked` **削除**。
- `billing_unlocks`: 構造維持 (append-only、`stripe_checkout_session_id` UNIQUE で冪等)。
- `billing_type` enum: `('ai_credits','pdf_unlock')` のうち `pdf_unlock` は dead 値として残置。

### 7.4 バリデーション・エラー (新仕様)
| ID | 条件 | 振る舞い |
|---|---|---|
| quantity | 1 のみ | それ以外 reject (InvalidAmountError) |
| E-BL-001 | Stripe API 失敗 | retry 1 → 失敗で「決済システムが応答しません」+ サポート誘導 |
| E-BL-003 | Webhook 重複 | session_id でべき等 (維持) |
| E-BL-004 | Webhook 署名不一致 | 401 + Sentry (維持) |
| E-BL-005 | success 戻りで Webhook 未着 (race) | 「処理中」poll (維持) |
| E-BL-006 | 付与 UPDATE 失敗 | Sentry + Webhook 再試行 (維持) |
| quota_exceeded | trial+credits=0 | 402 → 購入モーダル |

### 7.5 機能固有 NFR + 既存連携 (新仕様)
- 濫用: 匿名=生涯3 trial (sybil-cheap → 有限) + fingerprint cap + guest 発行レート制限。IP は rate-limit 鍵のみ・**保存しない** (O47)。
- コスト: 1 識別 ≈ ¥0.15。¥100 課金粗利 ~¥95 で無料 ~630 回分を自己資金化 (concept §4.4 と整合)。
- 連携: `_shared/ai` quota は `ai_credits_remaining` を匿名・リンク済の双方で参照。`export` 連携は**廃止**。

## 8. タグ別追加項目

### 8.1 認可 (auth-required → 緩和)
- 購入・識別ともゲスト userId スコープで完結。`withUserScope` 経由は維持 (SEC-005)。連携は認可要件から除外。

### 8.2 状態遷移 (stateful)
- `ai_credits_remaining` は付与で増加 (Webhook)・消費で 0 まで減算 (負数禁止 CHECK 維持)。`pdf_unlocked` 状態は廃止。

## 9. 未決事項

### [論点-R001] `spam-check.ts` の fingerprint-cap 表現 — **RESOLVED (spec-review R2)**
- **影響範囲**: `api/auth/spam-check.ts:31`, identify 経路
- **詰めるべき問い**: cap 到達時に `mustLink` を返していた挙動を、`mustLink` 廃止後どう表現するか。
- **候補案**: (a) 濫用制御を guest-provision (発行レート制限 + cap) に一元化し、identify からは cap→mustLink を除去。(b) cap 到達は識別自体を 429/403 で拒否。
- **結論 (spec-review auto-pick D2)**: **(a) 採用**。fingerprint-cap の enforcement を guest-provision (発行レート制限 + cap で新規ゲスト発行を拒否) に一元化し、identify 時の cap→mustLink 経路は除去する。O47 (濫用防御は安価 ID の発行・枠で行う) と整合。Phase 5 (spam-check 整理) で実施。
<!-- spec-review R2: [論点-R001] を (a) で確定。mustLink 廃止に伴う濫用制御の移譲先を明示 -->
- **判断期限**: ~~実装着手前~~ → 解決済 (Phase 5 で実装)。

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |
