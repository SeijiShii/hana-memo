# AI_LOG セッション D20260522_007 — /flow:feature (_shared/auth)

**実行日時**: 2026-05-22 11:20 (+09:00)
**コマンド**: /flow:feature (連続設計モード、--auto)
**対象**: _shared/auth (cross-cutting、優先度 2)
**状態**: 完了
**含まれる decision**: D20260522-053 〜 D20260522-059

## 主要決定サマリ
| ID | テーマ | 採用 |
|---|---|---|
| D20260522-053 | 対象選定 | _shared/auth |
| D20260522-054 | タグ | cross-cutting / auth / 基盤 |
| D20260522-055 | 起動時 session 初期化方式 | アプリ起動直後に supabase.auth.signInAnonymously() を必ず実行、既存 session があればスキップ |
| D20260522-056 | OAuth Linking フロー | supabase.auth.linkIdentity({provider: 'google'}) で同一 uid 維持、popup ではなく same-tab redirect |
| D20260522-057 | SPAM 抑止 ([論点-006]) | 推奨案を採用: 匿名 user は AI 呼び出し 3 回トライアル → device fingerprint で hard cap、超過時 OAuth 必須 |
| D20260522-058 | データ移行 ([論点-007]) | first-link-only: 匿名 user が OAuth link すると以後リンク不可。重複アカウント発見時は guidance のみ、merge 機能なし |
| D20260522-059 | E2E_TEST 生成 | スキップ (cross-cutting、E2E は各 feature 側で扱う) |

## Decisions

```yaml
- id: D20260522-053
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 0.3
  question: 次の対象
  options: ["_shared/auth (recommended、優先度 2 先頭、全機能の前提)"]
  recommended: "_shared/auth"
  chosen: "_shared/auth"
  chosen_type: auto-recommended
  depends_on: [D20260522-052]
- id: D20260522-054
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 2
  question: タグ
  options: ["cross-cutting + auth + 基盤 (recommended)"]
  recommended: 同上
  chosen: 同上
  chosen_type: auto-recommended
  depends_on: []
- id: D20260522-055
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 3 Q1
  question: 起動時 session 初期化方式
  options:
    - "アプリ起動直後に supabase.auth.signInAnonymously() を必ず実行、既存 session があればスキップ (recommended)"
    - "初回 AI 呼び出し直前に lazy 初期化"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-022]
  context: |
    起動直後に user_id が確定していると、consent_logs INSERT 等の RLS 制限が clean に効く。
    lazy だと session が無い状態の UI 状態管理が複雑化。
- id: D20260522-056
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 3 Q2
  question: OAuth Linking のフロー実装方式
  options:
    - "supabase.auth.linkIdentity({provider:'google'}) same-tab redirect (recommended、PWA 互換性)"
    - "popup window で linkIdentity"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: []
  context: PWA standalone モードでは popup blocker / window.open 制限がある。redirect なら必ず動く。
- id: D20260522-057
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 3 Q3 / 論点-006
  question: 匿名 user の SPAM 抑止策
  options:
    - "AI 呼び出し 3 回トライアル + device fingerprint hard cap (recommended)"
    - "完全に無制限 (リスク高)"
    - "起動時に CAPTCHA"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: [D20260522-024]
  context: |
    案 1 は「起動摩擦最小化」と「API コスト保護」の妥協点。
    fingerprint は @fingerprintjs/fingerprintjs (Free 版)、精度は完璧ではないが abuse の閾値設定に十分。
    超過時は「もっと使うには Google アカウントで連携してください」と guide。
- id: D20260522-058
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 3 Q4 / 論点-007
  question: 匿名→リンク時のデータ移行戦略
  options:
    - "first-link-only: 1 度の link 完了で永続化、以後 link 不可 (recommended、シンプル)"
    - "デバイス別匿名 user の merge 機能 (複雑)"
    - "都度 OAuth で新規アカウント生成"
  recommended: 案 1
  chosen: 案 1
  chosen_type: auto-recommended
  depends_on: []
  context: |
    案 1 採用理由: 匿名 user の uid をそのまま保持して OAuth identity を追加するだけなので、
    画像・観察ノート等のデータは全て自動継承される (user_id 変わらず)。
    既に別 device で同じ Google アカウントを link 済の場合は「既にアカウントがあります」guidance を表示。
- id: D20260522-059
  timestamp: 2026-05-22T11:20:00+09:00
  command: /flow:feature
  phase: Step 6
  question: E2E_TEST 生成?
  options: ["スキップ (cross-cutting)"]
  recommended: スキップ
  chosen: スキップ
  chosen_type: auto-recommended
  depends_on: []
  context: 認証フロー E2E は account / capture / billing で実機検証する。
```
