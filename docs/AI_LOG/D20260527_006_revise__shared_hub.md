# AI_LOG — _shared/hub service-info 実装 #006 (2026-05-27)

- **コマンド**: service-info 実装 (O48 retrofit、CF-010/011 機構の最初の実践。直接 TDD)
- **状態**: 完了 (v1 最小契約。metrics 拡充は follow-up)
- **契約**: service-hub [論点-003] 確定 / perspectives O48

## 実装
- `api/hub/[...path].ts` (group catch-all) + `api/hub/_handlers/service-info.ts` (純関数 verifyHubSecret/buildServiceInfo + handler)。
- `GET /api/hub/service-info`、HUB_SHARED_SECRET (Bearer/x-hub-secret) 認証、`{schemaVersion:1,service,status,metrics:[],version?,extra}`。
- .env.example に HUB_SHARED_SECRET、services.toml に endpoint 記録。
- 関数数 11→12 (Hobby 上限、_handler-contract.test pass + コメントで次は集約を明示)。
- 検証: typecheck 0 / service-info 11 tests + handler-contract 36 tests green。

## 残
- metrics[] アプリ層指標 (識別数/売上/エラー) 実装。HUB_SHARED_SECRET の prod env 投入 (ユーザー、live化時)。
