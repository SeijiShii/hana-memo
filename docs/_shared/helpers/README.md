# _shared/helpers（横断設計）

ヘルパ・ユーティリティ。日付処理 / 画像 WebP 変換 / EXIF 削除 / 位置情報 ~100m 丸め / 季節判定 等。

## このフォルダに置くドキュメント

- `001_helpers_SPEC.md` — 各ヘルパの責務範囲
- `002_helpers_PLAN.md` — 実装計画
- `003_helpers_UNIT_TEST.md` — 単体テスト計画
- `estimate_YYYYMMDD.md` — 横断単位見積もり

## 関連

- 概念設計: `../../concept.md` §1.3.2
- 依存: (なし)
- 被依存: capture (画像変換 / EXIF / 位置丸め), memory (季節判定)
- 関連論点: [論点-004] 位置情報の保存粒度
- 実装コード対応: `src/shared/helpers/`
