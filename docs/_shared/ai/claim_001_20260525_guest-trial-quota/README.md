# クレーム判定: 新規ゲストが初回識別で「使い切りました」

- **claim id**: 001
- **実施日**: 2026-05-25
- **対象**: ../README.md (_shared/ai)
- **基準 SPEC**: ../001_ai_SPEC.md §4
- **クレーム内容**: 新規匿名ユーザーが画像を 1 回選んだだけで「今月の識別回数を使い切りました (残り 0)」。無料枠/お試しで識別できるはず。
- **状態**: 判定完了 → 分岐実行 (/flow:fix)
- **判定結果**: **バグ (fix)** — identify quota パスが SPEC §4「ai_credits_remaining **or trial**」の trial 分岐を欠落 (新規 user は ai_credits=0 で即ブロック)
- **分岐先**: ../fix_001_20260525_guest-trial-quota/ (Step 6 で生成)

## ドキュメント
- `000_CLAIM_REPORT.md` — クレーム整理 (期待/現実/影響)
- `001_TRIAGE.md` — 三項照合 + バグ判定根拠 + 修正範囲

## 関連
- 起点: auth revise_001 (匿名サインイン) で session 成立 → 本イシュー露見
- AI_LOG: ../../AI_LOG/D20260525_062_claim__shared_ai_001.md
