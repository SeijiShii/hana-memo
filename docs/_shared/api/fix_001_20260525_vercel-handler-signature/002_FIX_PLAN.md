# 修正計画: Vercel handler-signature バグ

> **入力**: `./000_調査レポート.md`, `./001_ROOT_CAUSE.md`, ローカル検証
> **最終更新**: 2026-05-25
> **状態**: 実施済 + 検証済

---

## 1. 修正対象ファイル (23 handler)

各 handler の export 形のみ変更 (**本体ロジックは不変**):

**before**
```ts
export default async function handler(req: Request): Promise<Response> {
  /* ...body... */
}
export const config = { runtime: 'nodejs' };
```

**after**
```ts
async function handler(req: Request): Promise<Response> {
  /* ...body 不変... */
}
export const config = { runtime: 'nodejs' };
export default { fetch: handler };
```

対象 (21 async + 2 非async):
`api/auth/spam-check` `api/billing/{confirm,create-checkout-session,status,stripe-webhook}` `api/capture/{attach,discovery,status}` `api/check-quota` `api/clerk-webhook` `api/export-revenue` `api/export/discoveries` `api/identify-plant` `api/memory/recommend` `api/notebook/{edit,list}` `api/refresh-matview` `api/storage/{delete,meta,signed-url,upload-url}` / (非async) `api/account/settings` `api/legal/consents`

**対象外**: `api/health.ts` (Node `(req,res)` 形、既に動作) は不変。

### 併発修正: `vercel.json`
`functions["api/**/*.ts"].runtime: "nodejs20.x"` は無効値 (native node に runtime キー不可、`vercel dev`/本番 deploy が `Function Runtimes must have a valid version` で落ちる) → `functions` ブロック削除。Node version は `package.json engines.node:">=20"` が担う。

## 2. 修正範囲の限定方針

- **export 形のみ**変更 (handler 本体・helper・config は不変)。fetch 形では `req` が本物の Web Request なので `req.json()`/`req.method`/`req.headers.get()` がそのまま動作 (むしろ「本来意図した Request」が渡るようになる)。
- 最小 diff のため `{ fetch: handler }` (property 形、名前付き関数の再エクスポート) を採用 → 本体の再インデント不要。

## 3. 副作用なき確認方法

- 既存 865 unit test: 全 green 維持 (handler 本体不変、named helper 不変) → ✅ 確認済
- 追加契約テスト: `api/_handler-contract.test.ts` (003 参照) → ✅ 25 test green
- ローカル runtime: `vercel dev` で `/api/storage/upload-url` POST (no auth) が **401 (1.6s)** を返す (修正前は hang) → ✅ 確認済
- typecheck: `tsc --noEmit` exit 0 → ✅

## 4. リリース戦略

- 方式: **即時 (critical)**。ただしデプロイは `/flow:release` Phase 3 (Class B 明示確認) で実施。
- 本 fix 完了で release Phase 2 (ローカルスマホ/desktop 動作確認) が再開可能に。
- フラグ不要 (export 形の修正、後方互換)。

## 5. ロールバック方針

- コード revert で完全に戻せる ✅ (git commit 単位)。DB 影響なし。
- ただし revert すると全 API が再び hang するため、revert する状況は想定されない。

## 6. 関係者通知

個人開発 (seiji 単独) のため通知不要。AI_LOG + 本フォルダに記録。

## 7. DoD

- [x] 該当バグが再現しない (vercel dev で 401 応答確認)
- [x] 003 REGRESSION_TEST 全成功 (契約テスト 25 green、broken 形で fail を確認)
- [x] 既存テスト破壊なし (865 → 890 green)
- [x] typecheck green
- [ ] 実フロー (撮影→識別→保存) のブラウザ目視 = release Phase 2 で実施 (次)

## 8. 更新履歴

| 日付 | 変更 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版 + 実施完了 | /flow:fix |
