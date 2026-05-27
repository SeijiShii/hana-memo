# クレーム判定レポート — capture C20260527-001

**判定**: バグ (fix) → fix_C20260527-001 へ分岐
**判定日**: 2026-05-27 / 緊急度: high (核心フロー・本番)

## クレーム原文
設定したドメイン (https://hana-memo.givers.work) で起動 → 撮影 → 「これでよい」→ AI判定に進んだ後、「これでよい」に戻り先に進まない (保存・遷移しない)。実機+本番。

## 三項照合
- **期待**: 撮影→これでよい→AI識別→R2保存→/notebook 遷移 (SPEC capture UC1)
- **既存仕様**: PreviewPage「これでよい → onConfirm → /notebook 遷移」。capture はブラウザ直 presigned PUT で R2 へ
- **現実**: 2 因の合成バグ —
  1. **R2 CORS が新サブドメイン origin を未許可** (`scripts/r2-cors.json` = localhost + `*.vercel.app` のみ、`https://hana-memo.givers.work` 無し)。サブドメインからの presigned PUT が CORS preflight で失敗 → `capture()` throw
  2. **PreviewPage `handleConfirm` に catch が無い** (`PreviewPage.tsx`、try/finally のみ) → onConfirm throw で `navigate('/notebook')` スキップ → finally で submitting/stage reset → **エラー非表示でプレビューに無言で戻る**

## 判定根拠
期待は SPEC 通り、現実が SPEC 不達 (保存・遷移せず) = バグ。新サブドメインが新 origin で R2 CORS 未許可 (既知パターン: R2 CORS は origin 毎) + silent failure (catch 無し) で不可視化していた。`*.vercel.app` 運用時は CORS 通過で動いていたため、サブドメイン化で顕在化。

## 修正 (fix_C20260527-001)
- **(A) R2 CORS**: `scripts/r2-cors.json` に `https://hana-memo.givers.work` 追加 → **ユーザーが R2 バケットに適用** (Class B/C、object-scoped token では bucket CORS 設定不可)
- **(B) PreviewPage**: catch 追加 → エラー表示 + 画面に留まる (無言ループ解消)。回帰テスト追加。Class A
