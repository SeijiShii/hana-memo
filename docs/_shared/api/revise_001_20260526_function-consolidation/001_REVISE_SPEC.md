# _shared/api 変更仕様書 (serverless function 統合)

> **改修種別**: リファクタ (デプロイ可能性。挙動・API 契約は不変)
> **issue / slug**: revise_001 / function-consolidation
> **基準**: api/ 現状 24 関数 + perspectives O49
> **最終更新**: 2026-05-26
> **タグ**: infra, deploy-readiness, no-behavior-change

---

## 1. 変更概要

Vercel Hobby プランの「1 デプロイあたり最大 12 Serverless Functions」上限に対し、`api/` が **24 関数**あり preview deploy が BLOCKED (`/flow:release` #071 Phase3)。各 `api/**/*.ts` = 1 関数のため。**グループ別 catch-all ルーティング** (`api/<group>/[...path].ts`) で **24 → 11 関数**に集約する。**ハンドラのドメインロジック・API URL・レスポンスは一切変えない** (純粋な配置/ルーティング変更)。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| (全 UC) | 変更なし | 変更なし | 挙動不変のリファクタ。エンドポイントの URL/入出力は同一 |

### 2.2 入出力変更 (API エンドポイント)
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| 全 `/api/<group>/<action>` パス | 各 1 ファイル = 1 関数 | catch-all `api/<group>/[...path].ts` が `/api/<group>/*` を受け path segment + method で内部 dispatch | **完全互換** (URL 不変、フロント変更なし) |
| cron パス `/api/refresh-matview` 等 | root 単体関数 | `api/cron/[...path].ts` 配下 `/api/cron/<job>` | ⚠️ パス変更 (vercel.json crons も更新)。外部参照なし (Vercel cron のみ呼ぶ) のため影響は cron 設定の同時更新で吸収 |
| `/api/clerk-webhook` | root 単体 | `api/auth/[...path].ts` 配下 `/api/auth/clerk-webhook` | ⚠️ パス変更。Clerk dashboard の webhook endpoint URL を新パスに更新が必要 (デプロイ時) |

### 2.3 データモデル変更
| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| (なし) | DB スキーマ・データ不変 | **不要** |

### 2.4 バリデーション・エラー変更
| 対象 | 変更前 | 変更後 |
|---|---|---|
| 各ハンドラの検証/エラー | 変更なし | 変更なし (ロジックを catch-all から呼ぶだけ)。未知 sub-path は 404 を返す (router 層で追加) |

## 3. 影響範囲

| 対象 | 影響度 | 説明 |
|---|---|---|
| `api/` 全体 | 高 | 直接対象。ファイル再配置 + router 追加 |
| `vercel.json` | 中 | crons の path を `/api/cron/<job>` に更新 |
| `src/features/*/api.ts` (フロント) | 低 | **同一 URL のため原則変更なし**。`/api/clerk-webhook` をフロントが呼んでいない (Clerk→server webhook) ことを確認済 |
| Clerk dashboard webhook 設定 | 中 | clerk-webhook の URL を `/api/auth/clerk-webhook` に更新 (デプロイ運用、Class B 相当) |
| 既存 unit テスト | 中 | ハンドラ単体テストは `handler` 関数を直接 import していれば不変。パス依存があれば router テストに移行 |

## 4. 後方互換性

- **互換維持**: ✅ (公開 API URL は不変。フロントは無改修)
- 例外 2 点 (内部のみ、外部公開 API ではない):
  - **cron パス**: `/api/<job>` → `/api/cron/<job>`。vercel.json で同時更新するため実運用影響なし。
  - **clerk-webhook パス**: `/api/clerk-webhook` → `/api/auth/clerk-webhook`。Clerk dashboard の endpoint URL をデプロイ時に更新 (1 回)。

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (DB 変更なし、純コード変更)。`git revert` で元の 24 ファイル構成に戻る。
- ロールバック時は vercel.json cron パス + Clerk webhook URL も旧に戻す。

## 6. リリース戦略

- **方式**: 一括 (挙動不変のため段階展開不要)。
- ロールアウト: 統合実装 → unit + 既存 E2E (smoke/billing) green → preview deploy 再試行 (**11 fn ≤ 12 で通る検証 = 本リファクタの DoD**) → 動作確認 → prod。
- フィーチャーフラグ不要 (内部リファクタ)。

## 7. 詳細仕様 (新ルーティング構造)

### 7.1 catch-all router パターン (各グループ共通)
`api/<group>/[...path].ts`:
1. `export const config = { runtime: 'nodejs' }` を維持。
2. `export default { fetch: async (req) => {...} }` (Web 標準シグネチャ、fix_001 統一済)。
3. URL の `/api/<group>/` 以降の最初の segment で sub-handler を選択 (例: `/api/storage/upload-url` → `upload-url`)。
4. 各 sub-handler は既存ロジックを関数として保持 (同ディレクトリの `_handlers/` or 同ファイル内関数)。`Request → Response` を返す純関数に統一。
5. 未知 segment は 404 (`{ error: 'not_found' }`)。method 不一致は各 sub-handler が 405 (既存踏襲)。

### 7.2 統合マッピング (24 → 11)
| 新 function | 吸収 (sub-path) |
|---|---|
| `api/storage/[...path].ts` | upload-url / signed-url / delete / meta |
| `api/billing/[...path].ts` | confirm / create-checkout-session / status / stripe-webhook |
| `api/capture/[...path].ts` | attach / discovery / status |
| `api/notebook/[...path].ts` | edit / list |
| `api/auth/[...path].ts` | guest / spam-check / clerk-webhook |
| `api/cron/[...path].ts` | refresh-matview / check-quota / export-revenue |
| `api/identify-plant.ts` (維持) | — |
| `api/health.ts` (維持) | — |
| `api/legal/[...path].ts` | consents |
| `api/account/[...path].ts` | settings / delete |
| `api/memory/[...path].ts` | recommend |

> legal/account/memory は現状 1 endpoint だが catch-all 化して将来の同ドメイン endpoint 追加に備える (関数数を増やさず拡張可)。単体維持でも可 (実装時 auto-pick)。

### 7.3 `_lib` の扱い
`api/<group>/_lib/*` は関数ではない (Vercel は `_` prefix を関数化しない) ため現状維持。catch-all から import する。

## 8. タグ別追加項目
- **infra**: Vercel `functions` config / runtime は nodejs 維持。Edge 不要。
- **deploy-readiness**: DoD = preview deploy が 11 fn で成功すること。

## 9. 未決事項
### [論点-001] legal/account/memory を catch-all 化するか単体維持か
- **詰めるべき問い**: 現状 1 endpoint の 3 つを `[...path].ts` 化 (将来拡張容易) か `.ts` 単体維持か。どちらでも 11 関数。
- **推奨**: catch-all 化 (ドメイン内 endpoint 追加時に関数数を増やさず済む。O49 の主旨に沿う)。
- **判断**: 実装 (/flow:tdd) 時に auto-pick で確定 (可逆)。

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |
