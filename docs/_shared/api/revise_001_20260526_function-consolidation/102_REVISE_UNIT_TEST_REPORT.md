# 単体テストレポート: _shared/api function-consolidation (revise_001)

## 実施日時
2026-05-26 21:17 (JST)

## テスト実行環境
- ランタイム: Node 20 / Vitest 2.1.9 (happy-dom)
- コマンド: `npm test` (= vitest run)

## テスト結果

| 区分 | 対象 | 結果 |
|---|---|---|
| 新規 | `api/_lib/router.test.ts` (dispatch / 404 / 末尾スラッシュ) | 5 green |
| 新規 | `_handler-contract.test.ts` の sub-handler {fetch} 検査 (21 sub-handlers) | green |
| 新規 | `_handler-contract.test.ts` の ≤12 上限ガード (O49) | green |
| 維持 | 移設した全ハンドラの既存 unit (storage/billing/capture/notebook/auth/legal/account/memory + cron + clerk-webhook) | 全 green (回帰なし) |
| 維持 | 全スイート | **894 green / 121 files** |

## 追加テストケース
- router 層 (`createGroupRouter`): action dispatch、別 action、未知 action 404、action 無し 404、末尾スラッシュ許容 (5)。
- contract: catch-all sub-handler が `{ fetch }` 形であることの列挙検査 (router が `.fetch` を呼ぶため必須)。
- contract: 関数数 ≤12 (Vercel Hobby 上限) の恒久ガード。

## サマリー
| 項目 | 値 |
|---|---|
| before (Phase 0) | 880 green |
| after | **894 green** (+14: router 5 + contract sub-handler/limit 系) |
| 失敗 | 0 |
| typecheck | clean |
| 成功率 | 100% |

## 回帰の主指標
本リファクタは挙動不変のため、**移設した全ハンドラの既存 unit が green を維持**することが回帰なしの証明。加えて runtime (dev.sh 実 HTTP) で全 catch-all の dispatch を確認済 (101 レポート参照)。
