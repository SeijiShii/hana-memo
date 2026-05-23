# D20260523_017 — /flow:secure (プロダクト全体)

**実行日時**: 2026-05-23 (+09:00)
**コマンド**: `/flow:secure` (引数なし、PWD = `<root>` → プロダクト全体、`--phase=all`、`--severity-threshold=medium` (default))
**対象**: hana-memo MVP 全体 (concept.md + 全 7 機能 + 横断 7)
**状態**: 完了
**含まれる decision 範囲**: D20260523-001 〜 D20260523-018

---

## 主要決定サマリ

- **PJ 性質判定 (7 軸)**: 複数ユーザー / 公開 / 有償 / 個人情報扱いあり / AI 利用あり / 国内向け
- **適用観点**: O23-O28 全 6 件 (PJ フィルタ後 6/6)
- **L1 検出結果**:
  - Critical: 2 件 ([SEC-001] レート制限未設計、[SEC-002] `.env.example` 未作成)
  - High: 2 件 ([SEC-003] AI Vision SSRF / 画像 URL 検証、[SEC-004] Sentry PII scrubbing `beforeSend` 未明示)
  - Medium: 2 件 ([SEC-005] Drizzle 認可テスト計画、[SEC-006] Webhook 署名検証深掘り)
  - Low: 0 件
  - Info: 0 件
- **法令必須未対応**: 1 件 ([SEC-004] O26 PII ログ漏洩、High 級だが legal_required=true で強制表示)
- **§8 論点登録**: 4 件 (Critical/High 全件、[論点-011] 〜 [論点-014])
- **L2 チェックリスト**: 生成 (O23-O27 5 観点)
- **L4 依存スキャン**: SKIP (ロックファイル不在 — まだ実装着手前)。実装着手後の再実行を推奨

## 生成・更新ファイル

- 新規: `docs/SECURITY_REVIEW_20260523.md` (L1 プロダクト全体レポート)
- 新規: `docs/_shared/auth/902_auth_IMPL_SECURITY_CHECKLIST.md`
- 新規: `docs/_shared/ai/902_ai_IMPL_SECURITY_CHECKLIST.md`
- 新規: `docs/_shared/storage/902_storage_IMPL_SECURITY_CHECKLIST.md`
- 新規: `docs/_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md`
- 新規: `docs/_shared/db/902_db_IMPL_SECURITY_CHECKLIST.md`
- 更新: `docs/concept.md` §8 [論点-011]〜[論点-014] 追記
- 更新: `docs/AI_LOG/INDEX.md` auto-generated 範囲

## 学習・改善

- L4 依存スキャンは実装着手前 (lockfile 不在) では skip が正しい。`/flow:secure --phase=deps` は `npm install` 後に再実行する設計を確認
- BaaS Pivot 後 (Neon + Clerk + R2 + Vercel) の文脈で O23 認可は Drizzle `where eq(table.user_id, ctx.userId)` を SoT 強制する設計が SPEC 5 件 (auth/db/storage/ai/capture) に明示済 → 認可漏れの土台は固い
- O27 レート制限は SPEC で明示されていない (fingerprint + trial cap のみで IP/分単位の rate limit がない) → AI コスト爆発と Stripe Webhook 攻撃の二重リスク

---

## decisions

### D20260523-001 — PJ 性質判定

- **phase**: Step 1 (PJ 性質判定)
- **chosen_type**: auto-recommended (concept §1/§3/§4.3 から自動抽出)
- **source**: concept.md §1.2 / §3 NFR / §4.3 / §9
- **chosen**: 複数ユーザー / 公開 / 有償 / 個人情報扱いあり / AI 利用あり / 国内向け
- **根拠**:
  - 複数ユーザー: Clerk Guest Users + OAuth Linking、`discoveries` が user_id 紐付け
  - 公開: Vercel Hobby 配信、α invite-only だが Web 公開アーキテクチャ
  - 有償: PWYW + content-unlock (Stripe Checkout、billing SPEC)
  - 個人情報: 画像 + 位置情報 + email (OAuth) + Stripe 連携
  - AI: OpenAI gpt-4o-mini Vision (capture / _shared/ai)
  - 国内向け: §9.2 で GDPR/CCPA 対象外、日本のみ
- **適用観点**: O23, O24, O25, O26 (legal_required), O27, O28 — 6/6 全観点 apply

### D20260523-002 — [SEC-001] O27 レート制限未設計

- **phase**: Step 2.2 (L1 観点照合)
- **chosen_type**: auto-recommended (推奨採用: §8 [論点-008] 登録)
- **severity**: **Critical**
- **照合結果**: SPEC 未対応 (O27 perspective `code_signals: @upstash/ratelimit` で全 SPEC を grep → 0 件)
- **不在根拠**:
  - `_shared/auth/001_auth_SPEC.md` は fingerprint + trial_used_count cap のみ (アカウント単位の生涯上限、IP/分単位 rate limit ではない)
  - `_shared/ai/001_ai_SPEC.md` は OpenAI 呼出制限なし
  - `billing/001_billing_SPEC.md` は Stripe Webhook の署名検証はあるが、リクエスト頻度制限なし
- **PJ 性質との関連**: `require=[公開]` → 適用必須
- **推奨対策**:
  - `/api/identify-plant`: IP + Clerk uid 単位で 10 req/min を Upstash Ratelimit (Vercel Edge) で強制
  - `/api/storage/upload-url`: 同じく 20 req/min
  - `/api/stripe-webhook`: Stripe IP allowlist + 署名検証 (既存) を維持、追加で 100 req/min
  - `/api/clerk-webhook`: Clerk IP allowlist + 100 req/min
  - Cloudflare Turnstile を任意で AI 同定 5 回目以降に挿入 (匿名 user の自動化攻撃対策)
- **chosen**: (b) §8 [論点-008] 登録
- **§8 論点**: [論点-011] レート制限の具体的実装 (Critical)

### D20260523-003 — [SEC-002] O25 `.env.example` 未作成

- **phase**: Step 2.2
- **chosen_type**: auto-recommended
- **severity**: **Critical**
- **照合結果**: SPEC 部分対応 / 実ファイル未作成
- **不在根拠**:
  - `concept.md §4.5.3` で必須キー一覧は文書化済
  - `.gitignore` に `.env.local` の除外設定は存在
  - しかし `<root>/.env.example` は実ファイル未作成 (今回 `ls -la` で確認)
- **PJ 性質との関連**: `require=[公開]`
- **推奨対策**: `<root>/.env.example` を `_shared/auth` 実装着手と同時に作成。テンプレートは concept §4.5.3 の全 13 キー
- **chosen**: (b) §8 [論点-009] 登録
- **§8 論点**: [論点-012] `.env.example` テンプレート作成タスク (Critical)

### D20260523-004 — [SEC-003] O24 AI Vision SSRF / 画像 URL 検証

- **phase**: Step 2.2
- **chosen_type**: auto-recommended
- **severity**: **High**
- **照合結果**: SPEC 部分対応
- **不在根拠**:
  - `_shared/ai/001_ai_SPEC.md` は OpenAI Structured Output schema 定義あり (output 側 OK)
  - しかし入力側で R2 から渡される画像 URL を OpenAI Vision に渡す前の SSRF 検証ロジックが未設計
  - `_shared/storage/001_storage_SPEC.md` は Presigned URL 発行ロジックはあるが、URL の private IP 含有チェックは未明示
- **PJ 性質との関連**: `require=[公開]` + AI 利用あり → SSRF はクラウド連携 PJ で必須
- **推奨対策**:
  - R2 Presigned URL のみ OpenAI に渡す (外部任意 URL 受付禁止)
  - 万一 URL を user input から受け取る経路を追加する場合は SSRF guard (`new URL().hostname` を allowlist と照合、`10.*` `192.168.*` `169.254.*` `127.*` `[::1]` 拒否)
- **chosen**: (b) §8 [論点-010] 登録
- **§8 論点**: [論点-013] AI Vision の画像 URL 経路 SSRF 防御強化

### D20260523-005 — [SEC-004] O26 Sentry PII scrubbing `beforeSend` 未明示

- **phase**: Step 2.2
- **chosen_type**: auto-recommended (legal_required で強制表示)
- **severity**: **High** (legal_required=true、severity-threshold 除外不可)
- **照合結果**: SPEC 部分対応
- **不在根拠**:
  - `_shared/analytics/001_analytics_SPEC.md §6.1` で Clerk user id の SHA-256 hash 化は明示
  - しかし Sentry `beforeSend` フック で email / 位置情報 / Stripe customer_id 等の PII を error.message から除去する仕組みが SPEC で未明示
  - エラーオブジェクトに DB 内容 / API レスポンス全文が含まれると Sentry に PII 流出する可能性
- **PJ 性質との関連**: `require=[公開, 個人情報扱い]` + legal_required=true
- **推奨対策**:
  - `initSentry` 時に `beforeSend` フックを必須化 (perspective O26 `code_signals: Sentry.beforeSend`)
  - スクラブ対象: email (`/[\w.-]+@[\w.-]+/`)、緯度経度 (`/\b\d{1,3}\.\d{4,}\b/`)、Stripe ids (`cus_*`, `pi_*`)、Clerk session token
  - Slack Webhook 通知文にも同じスクラブを適用
- **chosen**: (b) §8 [論点-011] 登録
- **§8 論点**: [論点-014] Sentry beforeSend PII スクラブ実装 (法令必須)

### D20260523-006 — [SEC-005] O23 Drizzle 認可テスト計画 (Medium)

- **phase**: Step 2.2
- **chosen_type**: auto-recommended
- **severity**: **Medium**
- **照合結果**: SPEC 部分対応 (実装方針は明示、テスト計画は薄い)
- **根拠**:
  - `concept.md §5.2` で「Drizzle クエリで必ず `where eq(table.user_id, ctx.userId)` を強制」と明示
  - `_shared/db/001_db_SPEC.md` でテーブル定義はあるが、「他人の user_id でアクセスしたら 404 になるか」の単体テスト計画が UNIT_TEST.md で薄い
- **推奨対策**: 全エンドポイントで「他人 uid で叩いた時 404/403」のテストを `_shared/db/003_*_UNIT_TEST.md` と各機能 003 に必須項目として追記
- **chosen**: (a) 注記のみ (SPEC に対策方針あり、TDD フェーズで対応)
- **§8 論点登録**: なし (Medium のため SPEC 注記推奨にとどめる)

### D20260523-007 — [SEC-006] O24/O23 Webhook 署名検証深掘り (Medium)

- **phase**: Step 2.2
- **chosen_type**: auto-recommended
- **severity**: **Medium**
- **照合結果**: SPEC 対応済 (`billing` SPEC で Stripe Webhook 署名検証、`_shared/auth` で Clerk Webhook 署名検証あり)
- **根拠**:
  - 設計上は両 Webhook で signing secret 検証あり
  - リプレイ攻撃対策 (timestamp tolerance、5 分以内) は明示されていない
- **推奨対策**: 各 Webhook で Stripe SDK / Clerk SDK の標準 verify 関数を使い、タイムスタンプ tolerance を default (5 分) に設定
- **chosen**: (a) 注記のみ (実装時の checklist で対応)
- **§8 論点登録**: なし

### D20260523-008 — L1 観点フィルタ後 6/6 観点を網羅処理

- **phase**: Step 2 (品質ゲート 7 確認)
- **chosen_type**: auto-recommended
- **chosen**: 観点 O23 (1 件 Medium)、O24 (1 件 High + 1 件 Medium)、O25 (1 件 Critical)、O26 (1 件 High)、O27 (1 件 Critical)、O28 (SKIP) — 各 1 件以上の decision を本 AI_LOG に記録済

### D20260523-009 — L4 依存スキャン skip 理由

- **phase**: Step 3.5
- **chosen_type**: auto-recommended
- **chosen**: SKIP (ロックファイル不在)
- **根拠**: `<root>` に `package.json` / `package-lock.json` / `pnpm-lock.yaml` 等が一切存在しない (まだ TDD 着手前の設計フェーズ)。perspectives O28 `detect.paths` のいずれも 0 件
- **推奨フォロー**: `npm install` 後 (= `/flow:tdd` で `_shared/db` を実装開始した直後) に `/flow:secure --phase=deps` を再実行
- **§8 論点登録**: なし (今 commit すべき情報なし、フォローアップは TDD 着手時の checklist に記載)

### D20260523-010 〜 D20260523-014 — L2 チェックリスト生成 (5 観点)


- **phase**: Step 3 (L2 生成)
- **chosen_type**: auto-recommended (各観点ごとに 1 ファイル生成)
- **chosen**:
  - D20260523-010: O23 認可 → `_shared/auth/902_auth_IMPL_SECURITY_CHECKLIST.md`
  - D20260523-011: O24 入力検証 → `_shared/ai/902_ai_IMPL_SECURITY_CHECKLIST.md`
  - D20260523-012: O25 秘密情報 → `_shared/storage/902_storage_IMPL_SECURITY_CHECKLIST.md` (秘密キー = R2/Stripe/Clerk/OpenAI/Sentry の全般カバー)
  - D20260523-013: O26 PII ログ → `_shared/analytics/902_analytics_IMPL_SECURITY_CHECKLIST.md`
  - D20260523-014: O27 レート制限 → `_shared/db/902_db_IMPL_SECURITY_CHECKLIST.md` に api_usage 系と一緒に置く (db 配下が共通)
- **配置根拠**: 機能フォルダではなく横断 (`_shared/*`) に置くことで、関連する全機能から参照可能。L1 レポートは `docs/SECURITY_REVIEW_20260523.md` ルート直下

### D20260523-015 〜 D20260523-018 — §8 論点登録

- **phase**: Step 4
- **chosen_type**: auto-recommended (Critical/High 全件登録)
- **chosen**:
  - D20260523-015: [論点-011] レート制限の具体的実装 (Critical, [SEC-001])
  - D20260523-016: [論点-012] `.env.example` テンプレート作成 (Critical, [SEC-002])
  - D20260523-017: [論点-013] AI Vision の画像 URL 経路 SSRF 防御強化 (High, [SEC-003])
  - D20260523-018: [論点-014] Sentry beforeSend PII スクラブ実装 (High / 法令必須, [SEC-004])
- **既存番号との競合回避**: AI_LOG/INDEX.md の Open 論点で [論点-008]〜[論点-010] が既に feature SPECs (helpers/legal/billing) で使用されていたため、本セッションでは [論点-011]〜[論点-014] を採番

---

## 関連ファイル

- L1 レポート: [../SECURITY_REVIEW_20260523.md](../SECURITY_REVIEW_20260523.md)
- L2 チェックリスト: `../_shared/{auth,ai,storage,analytics,db}/902_*_IMPL_SECURITY_CHECKLIST.md`
- 観点 SoT: `~/.claude/flow-data/perspectives.md` O23-O28
- 入力 SPEC: `../_shared/**/001_*_SPEC.md`, `../{account,capture,notebook,export,memory,billing,legal}/001_*_SPEC.md`
- 入力 concept: `../concept.md`
- 後続: `/flow:secure --phase=deps` (TDD 着手後)、`/flow:tdd` (論点-011〜014 解消が前提)

---

## Git コミット (D20260523-019)

- **commit hash**: `142ad08` (amend で更新、当初 `f0ee695` は AI_LOG の commit decision 追記のため 1 回 amend)
- **branch**: `main`
- **files**: 11 件 (生成 7 / 更新 4)
- **chosen_type**: auto-recommended
- **policy**: `~/.claude/flow-data/git-commit-policy.md` §7 準拠、concept §10.2 "main 直 push 可" のため Protected main 自動切替は skip (既存 flow セッション踏襲)
- **push**: 未実施 (ユーザー手動)
