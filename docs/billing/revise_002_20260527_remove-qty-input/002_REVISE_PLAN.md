# billing 変更計画書 (数量入力撤去)

> **入力**: `./001_REVISE_SPEC.md`, `src/features/billing/pages/BillingPage.tsx` (+ .test.tsx), `pricing.ts`
> **最終更新**: 2026-05-27

---

## 1. 既存ファイル変更一覧
| ファイル | 変更内容 (概要) | リスク | 関連 § |
|---|---|---|---|
| `src/features/billing/pages/BillingPage.tsx` | `qty` state / `qtyValid` / `<input>` / 「数量 (1〜1 セット)」label / 合計表示 / 数量エラー を削除。購入セクションを「固定文言 + 単一ボタン」に。`onCheckout({type:'ai_credits', quantity:1})` を直接送信。`AI_QTY_MIN/MAX` import は不要化 (`AI_CREDITS_PER_UNIT` と `aiCreditsAmountJpy(1)`/`formatJpy` は固定表示に流用可) | 低 (UI のみ) | §7.1 |
| `src/features/billing/pages/BillingPage.test.tsx` | 数量入力 (`aria-label="数量"`) / 合計 / 数量エラーの assertion を削除。「購入する」押下で `onCheckout` が `quantity:1` で呼ばれる test に更新。残回数表示・成功表示・Checkout 失敗エラーの test は維持 | 低 | §003 |

## 2. 新規ファイル一覧
| ファイル | 責務 | LOC |
|---|---|---|
| (なし) | | |

## 3. 削除ファイル一覧
| ファイル | 削除理由 | 代替 |
|---|---|---|
| (なし。BillingPage 内の数量 UI ブロックのみ削除) | | |

## 4. マイグレーション要否
- DB スキーマ変更: ❌ / 既存データ変換: ❌ / 設定変更: ❌ / ストレージ: ❌ → **MIGRATION 不要**

## 5. 実装 Phase 分割 (/flow:tdd 連携)
### Phase 1 (RED→GREEN→IMPROVE)
- 対象: BillingPage.test.tsx 更新 (RED: 数量入力が無い + 購入で quantity:1) → BillingPage.tsx の数量 UI 撤去 (GREEN) → IMPROVE (固定表示の文言/レイアウト整え)。
- ゴール: 数量入力が DOM に存在せず、購入ボタン1つで quantity=1 が送信される。typecheck + unit green。

## 6. 依存関係順序
単一ファイル + test のみ。順序依存なし。

## 7. ロールアウト計画
| ステップ | 内容 | 検証 |
|---|---|---|
| 1 | 実装 + unit green | `npm test` |
| 2 | 次回 prod デプロイに同梱 | `scripts/deploy-prod.sh` → /billing 目視 (数量入力が無い) |

## 8. リスク・注意点
- `aiCreditsAmountJpy(1)` / `AI_CREDITS_PER_UNIT` を固定表示に使えば、価格・付与数のハードコード重複を避けられる (pricing SoT 維持)。
- i18n: 文言「¥100 で AI識別が10回ふえます」「¥100 で購入する」はハードコード JA (本 PJ は i18n 未導入)。`formatJpy` + `AI_CREDITS_PER_UNIT` を埋め込み、数値ハードコードを避ける。

## 9. 完了の定義 (DoD)
- [ ] 数量入力 (`aria-label="数量"`) が DOM に無い
- [ ] 購入ボタン押下で `onCheckout({type:'ai_credits', quantity:1})`
- [ ] 残回数・成功・Checkout 失敗エラーの既存挙動は維持 (回帰なし)
- [ ] typecheck 0 / billing unit green
- [ ] prod デプロイ後 /billing で数量入力が無いことを目視

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-27 | 初版作成 | /flow:revise |
