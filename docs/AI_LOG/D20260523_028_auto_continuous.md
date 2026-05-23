# D20260523_028 — /flow:auto (continuous loop)

```yaml
session_id: D20260523_028_auto_continuous
command: /flow:auto
mode: continuous (default、auto-pick + Skill auto-invoke + 反復)
target: project-wide
started_at: 2026-05-23T17:30:00+09:00
last_updated: 2026-05-23T17:42:00+09:00
状態: 完了 (iteration 1 = /flow:tdd _shared/analytics 完遂、D20260523_029 状態=完了確認、checkpoint persist でセッション境界)
完了ステップ一覧: [Step 0 入力収集, Step 1 L1 検知, Step 2 L2 照合, Step 3 auto-pick, Step 4 Skill auto-invoke, Step 4.5 反復評価]
依存セッション: [D20260523_027_auto_continuous]
iteration: 1 / max 10
```

---

## Step 0-2: 入力収集 + 検知結果

- **SCENARIO §5**: Phase 3 (実装) 進行中、14 対象中 3 件完了 (`_shared/db|types|helpers`)、進行中ターゲットなし、次対象選定待ち
- **L1 中断/進行中**: 0 件 (直近全セッション 状態=完了、最新 D20260523_027 完了確定)
- **L2 整合性問題**: 0 件 (INDEX: db/types/helpers=実装完了、analytics=設計済+改修中、orphan 進行中マークなし)
- **§8 SEC**: SEC-002 closed、SEC-001/003/004 dispatched-to-revise (revise 設計反映済、active seed なし、TDD で status=closed 遷移予定)
- **101_*_IMPL_REPORT 不在 (=未実装)**: 11 件 (`_shared/{analytics,auth,storage,ai}` + 機能 7)

## Step 3: 優先度判定 + auto-pick

- **P1** (status=open Critical/High SEC): ❌ 不発動 (全 seed archived、SEC-002 closed、SEC-001/003/004 は revise 反映済で open でない)
- **P2** (中断セッション): ❌ 0 件
- **P3/P4 中間**: Phase 3 進行中 (3/14)、次対象 = 優先度 1 横断基盤 `_shared/analytics` (101 不在、revise SEC-004 scrubber 反映済、依存 _shared/db 実装完了)
- **auto-pick**: `/flow:tdd _shared/analytics`

## Step 4.5.1#2 Class B 判定

- `/flow:tdd` → **Class A** (git/AI_LOG 追跡可能、可逆) → pause なし、Skill auto-invoke へ進む

## Step 4: dispatch (Skill ツール auto-invoke)

`/flow:tdd` (引数 `_shared/analytics`) を Skill ツールで invoke する。

---

## decisions

### D20260523-085 — Step 3 優先度判定 + auto-pick (iteration 1)

- **chosen_type**: auto-recommended
- **判定**: P1-P2 不発動、Phase 3 進行中 (3/14)、次対象 = `_shared/analytics` (優先度 1、101 不在、SEC-004 revise 反映済)
- **action**: `/flow:tdd _shared/analytics`

### D20260523-086 — Step 4.5.1#2 Class B 判定

- **chosen_type**: auto-recommended
- **chosen**: `/flow:tdd` = Class A、pause なし
- **根拠**: spec 4.5.1#2 表で `/flow:tdd` = Class A 明示
