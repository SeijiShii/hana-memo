# 根本原因 + 修正 — capture C20260527-001 (撮影後プレビューに無言で戻る)

**起点クレーム**: ../claim_C20260527-001_20260527_capture-stuck/001_TRIAGE.md
**緊急度**: high (本番核心フロー) / **状態**: 修正実装済 (R2 CORS 適用待ち)

## 根本原因 (2 因合成)
1. **R2 CORS 未許可 origin**: サブドメイン `https://hana-memo.givers.work` が R2 バケット CORS の AllowedOrigins に無い (localhost + `*.vercel.app` のみ)。ブラウザ→R2 直 presigned PUT が CORS preflight で失敗 → `useCaptureFlow.capture` が throw。
2. **silent failure**: `PreviewPage.handleConfirm` が try/finally で catch 無し → throw で `navigate('/notebook')` 到達せず、finally が状態 reset → エラー非表示でプレビュー確認に戻る。

## 修正
- **(A) `scripts/r2-cors.json`**: `https://hana-memo.givers.work` を AllowedOrigins に追加。→ **ユーザーが R2 バケットへ適用** (wrangler r2 / Cloudflare dashboard。S3 互換 object token では bucket 設定変更不可)。
- **(B) `src/features/capture/pages/PreviewPage.tsx`**: handleConfirm に catch 追加 → `console.error` + エラー文言「保存できませんでした。通信状態を確認して、もう一度お試しください。」を表示し画面に留まる。`PreviewPage.test.tsx` に回帰テスト (onConfirm reject → エラー表示 + navigate しない)。

## 検証
- unit: PreviewPage 6 / PreviewContainer 2 green、typecheck 0。
- 本番検証 (ユーザー): R2 CORS 適用 + 再デプロイ後、サブドメインで撮影→識別→保存→/notebook 遷移。失敗時はエラー文言が出る (無言ループ解消)。

## 予防 (横展開)
release §3.1b / O44 = ブラウザ直アップロード設計では**本番 origin (サブドメイン含む) を CORS に追加**が必須。サブドメイン設定 (release §3.2) 時に R2 CORS 更新もセットにすべき (flow 反映候補)。
