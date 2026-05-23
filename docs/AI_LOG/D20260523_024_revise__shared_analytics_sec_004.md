# D20260523_024 — /flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub

```yaml
session_id: D20260523_024_revise__shared_analytics_sec_004
command: /flow:revise
mode: resume (seed-driven)
target: _shared/analytics
issue: sec_004_sentry_pii_scrub
started_at: 2026-05-23T10:00:00+09:00
last_updated: 2026-05-23T10:10:00+09:00
状態: 完了
完了ステップ一覧: [Step 1-8 + Step Z (git commit)]
依存セッション:
  - D20260522_005_feature__shared_analytics (元設計)
  - D20260523_017_secure_product_wide (L1 検出)
  - D20260523_019_secure_list-findings (dispatch)
  - D20260523_023_resume_continuous (Skill auto-invoke 経由)
invoked_via: Skill tool (flow:resume continuous loop iteration 1)
生成・更新ファイル:
  - docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/ (NEW、README + INDEX + 001-004 計 6 ファイル)
  - docs/_shared/analytics/INDEX.md (UPDATE サブフォルダ表)
  - docs/INDEX.md (UPDATE 横断 _shared/analytics 改修件数 = 1)
  - docs/concept.md §8 [論点-014] (UPDATE status 履歴 + dispatch 先 + 法務 TODO)
  - docs/SCENARIO.md §5 cursor + §6 履歴 (UPDATE 次の推奨 = /flow:tdd)
  - docs/_pending/sec_004_sentry_pii_scrub/ → docs/_pending_archive/ (MOVE)
  - docs/AI_LOG/D20260523_024_revise__shared_analytics_sec_004.md (NEW、本ファイル)
  - docs/AI_LOG/INDEX.md (UPDATE)
```

---

## 主要決定サマリ

| カテゴリ | 内容 |
|---|---|
| 改修種別 | 機能拡張 (security + legal-required タグ追加、個人情報保護法対応) |
| 改修動機 | [SEC-004] High / 法令必須: Sentry に流れる email / 緯度経度 / Stripe id / Clerk session token 等の PII を `beforeSend` + scrub 関数で除去 |
| 後方互換性 | ✅ 維持 (関数シグネチャ変わらず、内部実装の厳格化のみ) |
| リリース戦略 | 一括 (実装着手前、TDD と同時に有効化)。フィーチャーフラグ不要 (PII スクラブは常時 ON) |
| 既存テストの扱い | 全維持、新規 23 件追加 (scrubber 15 + sentry 5 + Slack 3) |
| ロールバック方針 | コード revert 可能だが**法令違反リスクのためロールバック実施は特別な理由がない限り不可** |
| MIGRATION 要否 | ❌ (scrub は実行時関数、DB 変更なし) |
| 7 パターン正規表現 | email / 緯度経度 / Stripe ids / Clerk session / Clerk uid / カード / 国内電話 |
| 法務 TODO | プラポリ §9.1 「Sentry 委託先利用 + PII スクラブ後送信」追記 (別 revise セッション、α 公開前必須) |

## 学習・改善

- **legal_required=true の取扱**: ロールバック方針を「コード revert 可能」と記述しつつ「法令違反リスクのため実施不可」と注記する形式が適切。spec 学習ログ追記候補
- **法務 TODO の連携**: `_shared/analytics` の改修だが、プラポリ §9.1 追記が連動して必要。`docs/legal/` への TODO 連絡を REVISE_PLAN §1 と §9 DoD に明示
- **bundle dispatch しなかった理由**: SEC-004 は SEC-001/003 と attack surface が異なる (`_shared/analytics` 固有、`_shared/ai` 関連でない) ため独立 seed が正しい判断だった

---

## decisions

### D20260523-051 — 改修要望取得 (seed 自動)

- **phase**: Step 1.2
- **chosen_type**: auto-recommended (seed 自動取得)
- **chosen**: [SEC-004] [論点-014] Sentry beforeSend PII スクラブ実装 (legal_required)

### D20260523-052 — Read スコープ (seed §3 自動確定)

- **chosen_type**: auto-recommended
- **対象**: 既存 `_shared/analytics/001-003` + seed + concept §3 NFR / §9.1 + helpers SPEC (hash) + legal SPEC (TODO 連絡)
- **除外**: 他 feature の実装コード (Phase 3 TDD 未着手)

### D20260523-053 — 改修動機 (Step 3.1.A)

- **chosen_type**: auto-recommended
- **chosen**: L1 検出 → list-findings dispatch → seed 入力で本セッション起動。legal_required=true で accepted-risk 不可

### D20260523-054 — 後方互換性方針 (Step 3.1.B)

- **chosen_type**: auto-recommended
- **chosen**: ✅ 維持 (関数シグネチャ変わらず)

### D20260523-055 — リリース戦略 (Step 3.1.C)

- **chosen_type**: auto-recommended
- **chosen**: 一括 (実装着手前、TDD と同時)。フィーチャーフラグ不要

### D20260523-056 — 既存テストの扱い (Step 3.1.D)

- **chosen_type**: auto-recommended
- **chosen**: 全維持 + 新規 23 件追加

### D20260523-057 — ロールバック方針 (Step 3.1.E)

- **chosen_type**: auto-recommended
- **chosen**: コード revert 可能、ただし法令違反リスクのため実施不可注記

### D20260523-058 — MIGRATION 不要 (Step 7.1)

- **chosen_type**: auto-recommended
- **chosen**: ❌ (DB 変更なし、scrub は実行時関数)

### D20260523-059 — INDEX 連動 (Step 7.5)

- **chosen_type**: auto-recommended
- **更新**: `_shared/analytics/INDEX.md` サブフォルダ表 + `docs/INDEX.md` `_shared/analytics` 改修件数 = 1 + 本サブフォルダ INDEX

### D20260523-060 — concept §8 status 履歴追記

- **chosen_type**: auto-recommended
- **更新**: [論点-014] status 履歴に「revise 設計反映完了」+ 法務 TODO 行追加

### D20260523-061 — Seed archive 移動

- **chosen_type**: auto-recommended
- **操作**: `docs/_pending/sec_004_sentry_pii_scrub/` → `docs/_pending_archive/`
- **目的**: 全 secure revise 完了 signal、次回 `/flow:resume` の P1 判定で seed 0 件、P3/P4 (TDD 着手) へ遷移

### D20260523-062 — SCENARIO §5 cursor 更新

- **chosen_type**: auto-recommended
- **chosen**: 次の推奨コマンドを `/flow:tdd` 連続実装モードに進行 + 法務 revise + L4 deps scan を順位 2-3 に
- **状態**: 全 secure revise 完了、Phase 3 着手準備完了

### D20260523-063 — Git commit

- **chosen_type**: auto-recommended
- **policy**: `~/.claude/flow-data/git-commit-policy.md` §7
- **対象**: 本セッション生成・更新ファイル一式
- **branch**: `main`
- **commit hash**: (後で追記)

---

## 関連ファイル

- 入力 seed: `../_pending_archive/sec_004_sentry_pii_scrub/000_TRIGGER.md` (revise 完了で archive 移動)
- 生成サブフォルダ: [../_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/](../_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/)
- 元 SPEC: [../_shared/analytics/001_analytics_SPEC.md](../_shared/analytics/001_analytics_SPEC.md)
- 並行関連 seed (連動): SEC-001+003 (D20260523_022 で済) — 全 secure revise これで完了
- 次の手動コマンド: **`/flow:tdd`** (連続実装モード、`_shared/db` から)。Class B 重いため `/flow:resume` 反復は本セッション完了時点で pause + ユーザー確認推奨
- 法務並行: `/flow:revise legal sentry-disclosure` (α 公開前必須)
