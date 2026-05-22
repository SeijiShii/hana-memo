# _shared/auth（横断設計）

認証・認可基盤。Supabase Auth ラッパ / セッション管理 / RLS 連携。

**MVP 認証フロー**: **匿名スタート (Supabase Anonymous Auth)** で起動時に UUID 自動発行 → 撮影・保存・10 回無料枠まで匿名で完結 → **Google OAuth Linking (opt-in)** で永続化 (デバイス間同期 / 課金時必須)。

メールマジックリンク・パスキーは見送り (v2 検討、[論点-001])。

関連論点: [論点-006] 匿名 user の SPAM 抑止策、[論点-007] 匿名 → リンク時データ移行戦略。

## このフォルダに置くドキュメント

- `001_auth_SPEC.md` — 認証フロー + セッション管理仕様
- `002_auth_PLAN.md` — 実装計画
- `003_auth_UNIT_TEST.md` — 単体テスト計画
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2, §6 外部連携
- 依存: `_shared/db` (RLS 連携)
- 被依存: `account`, 全機能 (認証必須)
- 関連論点: [論点-001] パスキー採否
- 実装コード対応: `src/shared/auth/`
