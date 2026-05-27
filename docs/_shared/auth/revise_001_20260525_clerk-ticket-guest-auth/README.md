# 改修: 匿名(ゲスト)サインインを Clerk ticket 方式で実装可能化

- **issue / slug**: 001 / clerk-ticket-guest-auth
- **実施日**: 2026-05-25
- **対象機能**: ../README.md (_shared/auth)
- **基準 SPEC**: ../001_auth_SPEC.md
- **改修要望**: 起動時の自動匿名サインイン (concept §4 「0 タップ認証」) が実装不能だった。現設計は実在しない **「Clerk Guest Users β / `signInAsGuest`」** を前提としており、`@clerk/clerk-react` 5.61.7 含む全 Clerk パッケージに匿名サインイン API が存在しない。実機検証 (release Phase 2, D20260525_056) で「保存されない / 図鑑が空」として露見。採用方針 (ユーザー決定 Option A) = **バックエンドで匿名 Clerk user を発行し sign-in ticket を返す → フロントで `signIn.create({strategy:'ticket'})` により匿名 session を確立**する Clerk-native fallback。
- **状態**: 設計完了 (実装は /flow:tdd 待ち)

## このフォルダに置くドキュメント

- `001_REVISE_SPEC.md` — 変更仕様書 (Clerk Guest β → backend createUser+ticket)
- `002_REVISE_PLAN.md` — 変更計画書 (新規 endpoint + useGuestSession + boot driver)
- `003_REVISE_UNIT_TEST.md` — 単体テスト計画
- `004_REVISE_E2E_TEST.md` — E2E / 実機検証計画
- (MIGRATION 不要: α 未公開で prod user なし + users スキーマ既存で充足)

## 関連

- 検出元: ../../AI_LOG/D20260525_056_handoff_default.md (release Phase 2 再開5c)
- 決定: ../../AI_LOG/D20260525_056_handoff_default.md 再開5d (Option A)
- SoT 反映: perspectives.md O22_guest_progressive_auth (プロバイダ匿名 API 実現性検証の必須化)
- 高度モデルレビュー: `/dev-review` 推奨
