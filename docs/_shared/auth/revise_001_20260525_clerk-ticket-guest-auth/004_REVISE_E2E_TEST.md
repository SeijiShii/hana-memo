# _shared/auth E2E テスト計画（匿名サインインを Clerk ticket 方式で実装可能化）

> **入力**: `./001_REVISE_SPEC.md`, `../../concept.md` §1.1 UC, 既存 `../004_auth_E2E_TEST.md`
> **最終更新**: 2026-05-25
> **責務分離**: ローカル headless スモークは `/flow:e2e` (Class A)、実キー軽め目視は `/flow:release` Phase 2。本書は両者の観点を定義。

---

## 1. 変更 UC シナリオ

### UC: 起動時の匿名サインイン → 撮影→識別→保存→図鑑反映
| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| E2E-AU-G01 | 実 Clerk test 鍵 + vercel dev、未サインイン | アプリ起動 | バックグラウンドで `/api/auth/guest`→ticket→session 確立。白画面でなく撮影画面に到達、`isSignedIn=true` |
| E2E-AU-G02 | G01 後 | 撮影 (file input) → 画像選択 | `/api/identify-plant` が 401 でなく 200、AI が植物名を返す (実 OpenAI ~$0.002) |
| E2E-AU-G03 | G02 後 | 「これでよい」→保存 | `/api/capture/discovery` で discovery 作成 + R2 upload。図鑑に 1 件反映 (現象「保存されない」の解消確認) |
| E2E-AU-G04 | G01 後リロード | 再起動 | 既存 session 継続 (二重 createUser しない)、図鑑に保存済みが残る |

## 2. リグレッションシナリオ（既存 UC、重要度高）
| UC | シナリオ ID | 確認観点 |
|---|---|---|
| keyless 起動 | E2E-AU-R01 | VITE_CLERK_PUBLISHABLE_KEY 不在時は従来どおり keyless バナー + white-screen しない (Gate が no-op) |
| OAuth 後リンク | E2E-AU-R02 | 匿名 user に Google link → 同 clerk_user_id 維持、図鑑データ継続 (linkWithGoogle 既存) |
| no-key headless smoke | E2E-AU-R03 | 既存 8 ジャーニー (app boot/ナビ/公開 legal) が引き続き green |

## 3. 移行検証シナリオ
- なし (MIGRATION 不要、α 未公開)。

## 4. 環境要件差分
| 項目 | 前回 | 今回 | 理由 |
|---|---|---|---|
| 実キー headless E2E | `/api` serving 不可で gated | vercel dev で serving 可 (D20260525_058 handler fix 後) | `/flow:e2e` ローカル headless が走れる |
| 必須 env | CLERK_*, DATABASE_URL, R2_*, OPENAI, Upstash | 同左 (追加なし) | guest endpoint は既存 CLERK_SECRET_KEY を使用 |

## 5. 期待 KPI
| 指標 | 目標 |
|---|---|
| 匿名 session 確立成功率 (起動) | ≥ 99% (retry 込み) |
| 起動→撮影可能までの体感 | 0 タップ (concept §4 充足) |

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版作成 | /flow:revise |
