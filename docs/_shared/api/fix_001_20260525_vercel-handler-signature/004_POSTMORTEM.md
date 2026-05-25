# Postmortem: 全 /api/* Vercel Function hang (handler-signature)

> **重大度**: critical
> **発生日 (混入)**: 2026-05-24〜25 (Phase 3.5 app/api bootstrap)
> **検出日 / 対応完了日**: 2026-05-25
> **入力**: `./000_調査レポート.md`, `./001_ROOT_CAUSE.md`, `./002_FIX_PLAN.md`

---

## 1. 概要

Phase 3.5 で実装した 23 個の `/api/*` Vercel Function が、Vercel 非対応の default export 形 (`export default async function handler(req: Request): Promise<Response>`) を使用しており、本番含め全 API エンドポイントが応答せず hang する critical バグ。デプロイ前の `/flow:release` ローカル `vercel dev` 検証で水際検出し、export 形を `export default { fetch: handler }` に統一して解消。**本番リリース前に検出**したため実ユーザー影響ゼロ。

## 2. 時系列

| 時刻 (2026-05-25) | イベント | 対応 |
|---|---|---|
| 〜12:30 | release Phase 1: 実キー FILL + read-only 検証完了 | — |
| 12:40 | Vercel CLI install + login + link、`vercel dev` 起動 | `/api/health` のみ 200、他は未検証 |
| 13:30 | `/api/storage/upload-url` が 110s でも応答せず (HTTP 000) を検出 | 調査開始 |
| 13:30〜13:45 | 最小ハンドラ実験 (素の関数=hang / fetch object=200) + 公式 docs 照合で根本原因確定 | 全 23 handler が非対応形と判明 |
| 13:50〜13:58 | 23 handler を `{ fetch: handler }` 形に変換 + `vercel.json` runtime 無効値削除 + 契約テスト追加 | typecheck 0 / 890 green / vercel dev で 401 確認 |

## 3. 影響範囲

| 項目 | 内容 |
|---|---|
| 影響ユーザー数 | **0** (本番リリース前に検出) |
| 影響機能 (リリースしていた場合) | `health` 以外の全 API (撮影→識別→保存 / 認証 / 課金 / 図鑑 / エクスポート) = 実質全機能 |
| データ損失 | なし |
| ダウンタイム | なし (未リリース) |
| セキュリティ影響 | なし |

## 4. 検知の経緯

`/flow:auto` が「no-key/Class-A 作業枯渇」境界 (§4.5.1#0) で `/flow:release` を dispatch → Phase 2 の**デプロイ前ローカル runtime 検証** (`vercel dev` で実エンドポイントを叩く) で検出。**headless unit test (865) では検出不能だった** (handler 直呼びをしていなかったため)。「機能が動く」を unit 緑だけで判断せず、実 runtime 検証を挟む設計が効いた。

## 5. 対応の流れ

1. 検知: vercel dev で全 endpoint hang
2. 切り分け: 最小ハンドラ実験で「素の default 関数形」を特定 (import/logic でなく export 形が原因)
3. 根本確認: 公式 docs で対応形 3 種を確認、非対応形と断定
4. 修正: 23 handler を fetch 形へ機械変換 (本体不変) + vercel.json 修正
5. 再発防止: export-shape 契約テスト追加 (broken 形で fail することも確認)
6. 検証: typecheck / 890 unit / vercel dev 実応答

## 6. 直接原因 + 根本原因

(`001_ROOT_CAUSE.md` 参照) 直接原因 = 非対応 export 形。**根本原因 = unit test が named helper だけを検証し、Vercel との結合契約 (default export の形) を検証する層が無かった**。型システムも素の関数 / fetch object を区別できず誤形を弾けなかった。

## 7. 学習事項

### 7.1 良かった点
- **デプロイ前ローカル runtime 検証 (`/flow:release` Phase 2) が critical バグを水際で捕捉**。unit 緑だけでリリースしない設計が機能した。
- 最小ハンドラ実験 + 公式 docs 照合で、推測せず**決定的に**根本原因を特定 (CLAUDE.md「推測でなくログ/実機で確かめる」方針に合致)。
- 修正が機械的・本体不変だったため副作用ゼロで 23 file を一括修正。

### 7.2 改善点
- 「プラットフォーム結合契約」を検証するテストが**最初から無かった**。実装テンプレ確定時 (1 file 目) に runtime 1 回叩いていれば 23 file 量産前に気付けた (= 縦スライス検証の原則 §1.5.8 の射程だった)。
- `vercel dev` での疎通を Phase 3.5 着手時の DoD に含めるべきだった。

## 8. 再発防止策

| 対策 | 種別 | 担当 | 期限 |
|---|---|---|---|
| `api/_handler-contract.test.ts` で全 endpoint の export 形を CI で恒久検証 | テスト | 実装済 | 完了 (2026-05-25) |
| 新規 Vercel Function テンプレは `export default { fetch: handler }` を標準形とする (concept §4.5 / api 規約に明記) | ドキュメント | 次回 concept/feature 更新時 | Phase 4 着手前 |
| Phase 3.5 系の「外部プラットフォーム結合コード」は実装テンプレ確定直後に runtime 1 回疎通する (縦スライス検証) | プロセス | 恒常 | 恒常 |

## 9. タイムライン KPI

| 指標 | 値 |
|---|---|
| MTTD (混入→検出) | 〜1 日 (本番前) |
| MTTR (検出→修正完了) | 〜30 分 |
| 影響期間 (実ユーザー) | 0 (未リリース) |

## 10. 関連リンク

- fix docs: 本フォルダ `000`〜`003`
- AI_LOG: `../../../AI_LOG/D20260525_058_fix__shared_api_handler-signature.md` / `D20260525_056` (検出) / `D20260525_057` (loop)
- 公式: https://vercel.com/docs/functions/runtimes/node-js
- 契約テスト: `api/_handler-contract.test.ts`

## 11. 更新履歴

| 日付 | 変更 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版 | /flow:fix |
