# AI_LOG — /flow:claim capture #005 (2026-05-27)

- **コマンド**: /flow:claim (capture、C20260527-001) → /flow:fix 分岐
- **状態**: 完了 (判定 + 修正実装。R2 CORS 適用 = ユーザー)
- **判定**: バグ (fix)

## 三項照合 + 判定
- 期待=撮影→識別→R2保存→/notebook (SPEC UC1) / 現実=AI判定後プレビューに無言で戻る
- 根本原因 (2因): (1) R2 CORS が新サブドメイン `hana-memo.givers.work` 未許可→presigned PUT が CORS 失敗→capture throw、(2) PreviewPage handleConfirm に catch 無し→navigate スキップ→エラー握り潰し
- `*.vercel.app` では CORS 通過で動作、サブドメイン化で顕在化

## 修正
- (A) scripts/r2-cors.json に https://hana-memo.givers.work 追加 (ユーザーが R2 バケット適用、Class B/C)
- (B) PreviewPage.tsx catch 追加 (エラー表示+留まる) + 回帰テスト。Class A、typecheck 0 / capture unit green

## 次アクション
1. ユーザー: R2 CORS 適用 (wrangler/dashboard) + 再デプロイ (! bash scripts/deploy-prod.sh)
2. 本番でサブドメインから撮影→識別→保存 再確認
3. 横展開: release §3.2 サブドメイン設定時に R2 CORS 更新もセット化 (flow 反映候補)
