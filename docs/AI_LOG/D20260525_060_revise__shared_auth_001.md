# AI_LOG セッション D20260525_060 — /flow:revise _shared/auth 001

**実行日時**: 2026-05-25 19:00 〜 (+09:00)
**コマンド**: /flow:revise (｜ /flow:auto D20260525_059 反復1 → release D20260525_056 Phase 2 blocker → 本セッション)
**対象機能 + issue**: 横断 `_shared/auth` / 001 clerk-ticket-guest-auth
**実行者**: Claude (Opus 4.7) + seiji
**状態**: 完了 (設計 4 文書生成、実装は /flow:tdd 待ち)
**含まれる decision**: D20260525-070 〜 D20260525-073

---

## 主要決定サマリ（人間向け要約）

| ID | テーマ | 採用 | type |
|---|---|---|---|
| D20260525-070 | 改修種別 | 機能変更 (実装不能な前提の置換)。/flow:fix でなく /flow:revise (guest sign-in は未実装 = バグでなく設計修正) | auto-recommended |
| D20260525-071 | 匿名 session 機構 | **Option A**: backend `users.createUser`(externalId UUID) + `signInTokens.createSignInToken` → front `signIn.create({strategy:'ticket'})` + setActive。Clerk + Neon + JWT 契約を全維持 | explicit-choice (ユーザー) |
| D20260525-072 | 後方互換 / 移行 | 互換維持・MIGRATION 不要 (α 未公開で prod user なし、users スキーマ既存で充足)。リリース=一括、ロールバック=code revert | auto-recommended |
| D20260525-073 | レート/濫用対策 | `/api/auth/guest` に Upstash レート制限 (prefix `ratelimit:guest`) + 既存 fingerprint cap (stub) で MAU 濫用抑止 [SEC-001] | auto-recommended |

## Read スコープ (Step 2)
auth SPEC §1.1-§4 / `src/shared/auth/{auth-context,ClerkAuthBridge,guest-session,provider,hooks}.ts` / `api/auth/spam-check.ts` / `api/_lib/{clerk,ratelimit}.ts` / `src/main.tsx` / `src/app/AppAuthProvider.tsx` / db schema (users)。Clerk パッケージ dist の API 実在確認 (createUser/signInTokens 有、signInAsGuest/anonymous 無)。

## 設計の要点
- `ensureGuestSession` (純オーケストレーション、single-flight+retry) は**不変で再利用**。`signInAsGuest` 注入契約も不変 = 中身を ticket 方式にするだけ。
- 新規: `api/auth/guest.ts` (+ `_lib/guest-provision.ts` 純コア) / `src/shared/auth/{guest-client.ts, useGuestSession.ts, GuestSessionGate.tsx}`。
- boot 配線: ClerkProvider 内 (ClerkAuthBridge 同階層) に GuestSessionGate をマウント、isLoaded && !isSignedIn で 1 度駆動。keyless は従来 no-op。
- 誤前提 (Clerk Guest Users β) は concept §4 / SPEC §1.1 に残存 → [論点-001] で /flow:concept 整合修正 (実装後)。
- [論点-002] Clerk createUser の identifier 要件は runtime (vercel dev) で確定。

## 生成・更新アーティファクト
- 新規: `revise_001_20260525_clerk-ticket-guest-auth/{README,001_REVISE_SPEC,002_REVISE_PLAN,003_REVISE_UNIT_TEST,004_REVISE_E2E_TEST,INDEX}.md`
- 更新: `_shared/auth/INDEX.md` (サブフォルダ行) / `docs/INDEX.md` (auth 改修件数 0→1) / 本 AI_LOG + AI_LOG/INDEX
- SoT 反映済 (別途): `perspectives.md` O22 (プロバイダ匿名 API 実現性検証の必須化)

## 依存関係
- 検出元: D20260525_056 (release Phase 2 再開5c) / 決定: 同 再開5d (Option A)
- depends_on: feature `_shared/auth` 設計 (D20260522-117 BaaS pivot) / D20260525-069 (auto 反復1) / D20260525-068 (handler fix で /api serving 可能化)

## 学習・改善
- 「匿名/ゲスト開始が要件のとき、採用プロバイダの匿名サインイン API 実在を設計確定時に具体 API 名で検証する」を perspectives O22 に SoT 化 (ユーザー指示)。Clerk/Auth0 は非対応 → backend createUser+ticket fallback を標準パターン化。

---

## Decisions

```yaml
- id: D20260525-070
  timestamp: 2026-05-25T19:00:00+09:00
  command: /flow:revise
  phase: Step 1 改修種別判定
  question: 本件は /flow:fix か /flow:revise か?
  options: [/flow:revise (設計修正), /flow:fix (実装バグ)]
  recommended: /flow:revise
  chosen: /flow:revise
  chosen_type: auto-recommended
  depends_on: [D20260525-069]
  context: |
    guest sign-in は「実装したが壊れている」ではなく「実在しない API を前提にして
    そもそも実装されていない (deferred)」。設計前提の置換 = 仕様変更のため revise。

- id: D20260525-071
  timestamp: 2026-05-25T19:02:00+09:00
  command: /flow:revise
  phase: Step 3 匿名 session 機構の確定
  question: Clerk に匿名 API が無い中で匿名スタートをどう実装するか?
  options:
    - "Option A: Clerk backend createUser + signInToken ticket (recommended)"
    - "Option B: 匿名対応プロバイダ (Supabase/Firebase) に差し替え"
    - "Option C: 明示 Google サインイン必須化 (匿名スタート廃止)"
  recommended: Option A
  chosen: Option A
  chosen_type: explicit-choice
  depends_on: [D20260525-069]
  context: |
    ユーザー決定 (AskUserQuestion → 中断 + 明示回答「1 を選ぶ」)。Clerk + Neon + 既存
    JWT/userId スコープを全維持し concept の 0 タップ UX を保つ最小変更。createUser /
    signInTokens は @clerk/backend に実在確認済、ticket strategy は標準。spam-guard で
    MAU 濫用抑止。B はプロバイダ差し替えで BaaS pivot 逆行 + 全 auth 作り直し、C は核 UX に反する。

- id: D20260525-072
  timestamp: 2026-05-25T19:05:00+09:00
  command: /flow:revise
  phase: Step 3 後方互換 / リリース / ロールバック
  question: 後方互換・移行・リリース・ロールバック方針は?
  chosen: 互換維持 / MIGRATION 不要 / 一括リリース / code revert ロールバック
  chosen_type: auto-recommended
  depends_on: [D20260525-071]
  context: |
    α 未公開 = prod user/data なし。users スキーマは clerk_user_id/is_anonymous/
    trial_used_count を既に持ち変更不要。JWT 契約・userId スコープ不変で非互換なし。

- id: D20260525-073
  timestamp: 2026-05-25T19:07:00+09:00
  command: /flow:revise
  phase: Step 3 NFR (濫用対策)
  question: 匿名 user 量産 (Clerk MAU 濫用) をどう防ぐか?
  chosen: /api/auth/guest に Upstash レート制限 (prefix ratelimit:guest) + 既存 fingerprint hard cap (stub)
  chosen_type: auto-recommended
  depends_on: [D20260525-071]
  context: |
    匿名 user = Clerk MAU 消費。未認証 endpoint のためレート + cap で保護 ([SEC-001])。
    api/_lib/ratelimit.ts のパターン流用。fingerprint cap 実体化は [論点-006] follow-up のまま。
```
