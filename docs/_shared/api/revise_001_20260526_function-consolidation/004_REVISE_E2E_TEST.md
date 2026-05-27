# _shared/api E2E/検証計画 (function 統合)

> **入力**: `./001_REVISE_SPEC.md`, 既存 e2e/{smoke,billing}.spec.ts, /flow:release #071
> **最終更新**: 2026-05-26

---

## 1. 変更 UC シナリオ
本リファクタは**挙動不変**のため新規 UC なし。検証の主眼は「統合後も既存挙動が壊れない」+「関数数が上限内」。

## 2. リグレッションシナリオ (既存、重要度高)
| ID | シナリオ | 確認観点 | 区分 |
|---|---|---|---|
| RG-01 | no-key smoke 8 journey (`e2e/smoke.spec.ts`) | app boot / ナビ / 公開 legal / 空状態 / keyless | no-key (Class A) |
| RG-02 | billing no-key 3 journey (`e2e/billing.spec.ts`) | /billing 購入導線 / mustLink なし / 廃止機能なし | no-key (Class A) |
| RG-03 | ローカル課金系 happy path (実キー、dev.sh) | guest auth(200) / 撮影→識別 / quota→購入 / Checkout / webhook→credits=10 が**統合後も**通る | 実キー (release Phase2 相当) |

> RG-01/02 は `npm run test:e2e` (Class A)。RG-03 は dev.sh + 実キーで /flow:release Phase2 と同手順 (統合でルーティングが壊れていないことの最終確認)。

## 3. 統合固有の検証シナリオ
| ID | 検証 | 期待 |
|---|---|---|
| FC-01 | **関数数カウント** | `find api -name '*.ts' ! -path '*/_handlers/*' ! -path '*/_lib/*' ! -name '*.test.ts' \| wc -l` = **11** (≤12) |
| FC-02 | catch-all ルーティング到達 (dev.sh) | `/api/storage/upload-url` `/api/billing/status` `/api/auth/guest` `/api/cron/check-quota` `/api/auth/clerk-webhook` が各 200/想定ステータスで到達 |
| FC-03 | cron パス整合 | vercel.json crons の path が実ルート (`/api/cron/*`) と一致 |
| FC-04 | **preview deploy 再試行** (Class B) | 11 fn ≤ 12 で deploy 成功 (Hobby 上限クリア) → /flow:release Phase3 再開。**実 deploy は明示確認** |

## 4. 環境要件差分
| 項目 | 前回 | 今回 | 理由 |
|---|---|---|---|
| 関数数 | 24 | 11 | 統合 |
| vercel.json crons | `/api/<job>` | `/api/cron/<job>` | cron グループ化 |
| Clerk webhook URL | `/api/clerk-webhook` | `/api/auth/clerk-webhook` | auth グループ化 (deploy 時 dashboard 更新) |

## 5. 期待 KPI
| 指標 | 目標 |
|---|---|
| api/ 関数数 | 11 (≤12) |
| 既存 unit/E2E 回帰 | 0 (全 green 維持) |
| preview deploy | 成功 (上限クリア) |

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-26 | 初版作成 | /flow:revise |
