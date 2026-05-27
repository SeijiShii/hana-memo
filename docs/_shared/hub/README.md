# _shared/hub — service-hub 連携 (service-info エンドポイント)

**O48 retrofit (hana-memo = 第一弾)、契約 SoT = service-hub [論点-003] 確定。**

## 公開エンドポイント
- `GET /api/hub/service-info` (`api/hub/[...path].ts` group catch-all + `_handlers/service-info.ts`)
- 認証: 共有シークレット `HUB_SHARED_SECRET` (env)。`Authorization: Bearer <secret>` または `x-hub-secret`。読み取り専用。公開ヘルス `/api/health` (uptime ping) とは分離。未設定なら 503。
- レスポンス: `{ schemaVersion:1, service:'hana-memo', status:'ok'|'degraded'|'down', metrics?:{key,value,unit?}[], version?, extra? }`
  - v1 = status + version (Vercel git sha) の最小契約。**metrics は順次拡充** (AI識別数 / クレジット販売 / エラー件数 等のアプリ層指標)。
- services.toml: `[hana-memo].endpoint = "https://hana-memo.givers.work/api/hub/service-info"` に記録 (HUB が pull)。

## 運用
- HUB 側に同じ `HUB_SHARED_SECRET` を登録 (各サービスごと env、services.toml には書かない)。
- 関数数: hub group 追加で 12/12 (Hobby 上限到達)。次の endpoint は既存 group へ集約 (O49)。

## 残 (follow-up)
- metrics[] のアプリ層指標を実装 (discoveries 数 / 識別回数 / 売上 / エラー)。アグリゲートクエリは非ユーザースコープなので service-info 内に隔離 (SEC-005 例外として明示)。
