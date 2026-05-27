# _shared/api 変更計画書 (serverless function 統合)

> **入力**: `./001_REVISE_SPEC.md`, api/ 現状 24 関数, vercel.json
> **最終更新**: 2026-05-26

---

## 1. 新規 / 再構成ファイル一覧

各グループに catch-all router を作り、既存ハンドラのロジックを sub-handler として保持する。実装パターンは 2 案 (Phase 1 で 1 グループ試作して確定):
- **(A) router + 既存ファイル再利用**: `api/<group>/[...path].ts` が同ディレクトリの既存 `*.ts` の `handler` を import して dispatch。既存ファイルは関数化されないよう `_handlers/` 等へ移動 (`_` prefix で Vercel が関数化しない)。
- **(B) router 内インライン**: ロジックを router ファイル内 or `_lib` に集約。

| 新ファイル | sub-handler (移動元) | LOC 目安 |
|---|---|---|
| `api/storage/[...path].ts` | upload-url, signed-url, delete, meta → `api/storage/_handlers/*` | router ~40 + 既存移設 |
| `api/billing/[...path].ts` | confirm, create-checkout-session, status, stripe-webhook → `api/billing/_handlers/*` | router ~40 |
| `api/capture/[...path].ts` | attach, discovery, status → `api/capture/_handlers/*` | router ~30 |
| `api/notebook/[...path].ts` | edit, list → `api/notebook/_handlers/*` | router ~25 |
| `api/auth/[...path].ts` | guest, spam-check, (root)clerk-webhook → `api/auth/_handlers/*` | router ~30 |
| `api/cron/[...path].ts` | (root)refresh-matview, check-quota, export-revenue → `api/cron/_handlers/*` | router ~25 |
| `api/legal/[...path].ts` | consents → `api/legal/_handlers/*` | router ~20 |
| `api/account/[...path].ts` | settings, delete → `api/account/_handlers/*` | router ~20 |
| `api/memory/[...path].ts` | recommend → `api/memory/_handlers/*` | router ~20 |

> 共通 router ヘルパ `api/_lib/router.ts` (segment 抽出 + dispatch + 404) を 1 つ作り全グループで再利用すると DRY。

## 2. 維持ファイル
- `api/identify-plant.ts` (単体維持、コア AI)
- `api/health.ts` (単体維持、smoke)
- `api/<group>/_lib/*` (関数化されない、import 先として維持)

## 3. 削除 / 移動ファイル
- 24 個の個別エンドポイント `.ts` は **削除ではなく `_handlers/` 配下へ移動** (ロジック保持、関数化回避)。`git mv` 相当。
- root の `clerk-webhook.ts` → `api/auth/_handlers/clerk-webhook.ts`、3 cron → `api/cron/_handlers/*`。

## 4. 設定変更
- **vercel.json**: `crons[].path` を更新
  - `/api/refresh-matview` → `/api/cron/refresh-matview`
  - `/api/check-quota` → `/api/cron/check-quota`
  - `/api/export-revenue` → `/api/cron/export-revenue`
- **Clerk dashboard** (デプロイ時運用): webhook endpoint を `/api/clerk-webhook` → `/api/auth/clerk-webhook` に更新。

## 5. フロントエンド影響
- `src/features/*/api.ts` 等は **同一 URL を呼ぶため原則無改修**。
- 確認のみ: フロントが `/api/clerk-webhook` を呼んでいないこと (Clerk→server webhook のみ) を grep 確認 → 呼んでいなければフロント変更ゼロ。

## 6. 実装 Phase 分割 (/flow:tdd)

### Phase 1: router ヘルパ + 1 グループ試作 (storage)
- `api/_lib/router.ts` (segment dispatch + 404) を TDD。
- `api/storage/[...path].ts` + `_handlers/` 移設。既存 storage unit テストが green を維持 (handler 関数直 import)。
- **検証**: `npm run build` + 既存 storage テスト green + 関数数カウント減を確認。パターン確定。

### Phase 2: 残りグループ展開 (billing/capture/notebook/auth/cron/legal/account/memory)
- Phase 1 のパターンを複製。各グループ catch-all + `_handlers/` 移設。
- auth に clerk-webhook、cron に 3 job を取り込み。vercel.json cron パス更新。

### Phase 3: 検証 + デプロイ準備
- typecheck + 全 unit green + 既存 E2E (smoke 8 + billing 3) green。
- 関数数カウント `find api -name '*.ts' ! -path '*/_handlers/*' ! -path '*/_lib/*' ! -name '*.test.ts'` ≤ 12 を確認。
- (Class B、別途) preview deploy 再試行で 11 fn 通過を確認 → /flow:release 再開。

## 7. 依存関係順序
router ヘルパ → storage 試作 (パターン確定) → 残グループ並列 → vercel.json → 検証。

## 8. リスク・注意点
- **ルーティング段差**: catch-all の segment 抽出ミスで 404。→ router を TDD で先に固める。
- **cron パス変更漏れ**: vercel.json と実パスの不一致で cron 不発。→ Phase 2 で同時更新 + E2E で `/api/cron/*` 到達確認。
- **handler 署名**: `export default { fetch }` 統一 (fix_001) を router でも踏襲。
- **テストのパス依存**: 一部テストが fetch path を叩いていれば新パスに追従 (大半は handler 関数直呼びで影響なし)。

## 9. 完了の定義 (DoD)
- [ ] api/ の関数数 ≤ 12 (実測 11)
- [ ] typecheck clean
- [ ] 全 unit green (回帰なし)
- [ ] 既存 E2E (smoke 8 + billing 3) green
- [ ] vercel.json crons パス更新 + 整合
- [ ] フロント無改修を確認 (同一 URL)
- [ ] (後続) preview deploy が 11 fn で成功 → /flow:release Phase3 再開

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |
