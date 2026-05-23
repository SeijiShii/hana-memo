# _shared/ai E2E テスト計画 (レート制限 + SSRF 防御強化)

> **入力**: [./001_REVISE_SPEC.md](./001_REVISE_SPEC.md), [../../../concept.md](../../../concept.md) §1.1, [../../../capture/004_capture_E2E_TEST.md](../../../capture/004_capture_E2E_TEST.md) (存在時)
> **最終更新**: 2026-05-23

> _shared/ai 自体は横断モジュールで独立した E2E は持たない。本 E2E 追加は **capture / billing / account の既存 E2E に組み込む**形で実施する。

---

## 1. 変更 UC シナリオ

### UC1: AI 同定リクエストのレート制限 (新規、capture/UC1 派生)

| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| E2E-AI-RL-01 | OAuth リンク済 user、quota 残あり | 1 分間に 11 回連続で `/api/identify-plant` を呼出 | 11 回目が HTTP 429、UI に「混雑しています、X 秒後に再試行」トースト表示 + `Retry-After` 秒数表示 |
| E2E-AI-RL-02 | E2E-AI-RL-01 の続き | `Retry-After` 経過後に再撮影 | カウンタリセット、200 で同定成功 |
| E2E-AI-RL-03 | OAuth リンク済 user、quota 残あり | 撮影 → AI 同定 (1 回目) | 200、通常通り 5 秒以内に結果表示 (リグレッション) |
| E2E-AI-RL-04 | 匿名 user (trial 3 回未消化) | 撮影 → AI 同定 (1 回目) | 200、通常通り |

### UC2: SSRF 防御 (新規、capture/UC1 異常系派生)

| シナリオ ID | 前提 | 操作ステップ | 期待結果 |
|---|---|---|---|
| E2E-AI-SSRF-01 | OAuth リンク済 user | 撮影 → 通常の `imageObjectKey = "user_abc/2026/.../img.webp"` を送信 | 200 (allowlist HIT、defense-in-depth で `assertSafeImageUrl` も pass) |
| E2E-AI-SSRF-02 | 攻撃者シミュレーション (改変 client) | `imageObjectKey = "../user_xyz/img.webp"` を直接 POST | 400 + `{ error: 'validation_error', reason: 'path traversal' }` |
| E2E-AI-SSRF-03 | 攻撃者シミュレーション | `imageObjectKey = "user_xyz/img.webp"` (他人 uid) を直接 POST | 400 + `{ error: 'validation_error', reason: 'userId prefix mismatch' }` |
| E2E-AI-SSRF-04 | 攻撃者シミュレーション (将来の URL 受領経路想定) | 自前 mock server で `assertSafeImageUrl("https://evil.com/x.webp")` を呼ばせる経路 | throw `SsrfError`、500 (or 400) |

## 2. リグレッションシナリオ (既存 UC、重要度高)

| UC | シナリオ ID | 確認観点 |
|---|---|---|
| capture/UC1 (撮影→同定) | E2E-CAP-01〜10 既存全件 | レート制限導入後も通常フローが破綻していないこと、5 秒以内同定が維持されていること |
| capture/UC1 quota | E2E-CAP-QUOTA-* 既存 | rate limit middleware が quota チェックより**前**に走り、quota=0 でも先に 429 が出る順序になっていないこと (期待: rate limit → quota の順) |
| billing UC | E2E-BILL-* 既存 | Stripe Webhook の rate limit (100/min) が正規 traffic を阻害しないこと |
| _shared/auth UC | E2E-AUTH-* 既存 | Clerk Webhook の rate limit / dedupe が user 同期を阻害しないこと |

## 3. 移行検証シナリオ

なし (実装着手前、データ移行なし)。

## 4. 環境要件差分

| 項目 | 前回 | 今回 | 理由 |
|---|---|---|---|
| Upstash Redis (dev) | 不要 | **必須** (CI で mock、ローカル `vercel dev` で実 dev インスタンス接続) | rate limit テスト |
| `UPSTASH_REDIS_REST_URL` | 不要 | `.env.local` に追加 | 同上 |
| `UPSTASH_REDIS_REST_TOKEN` | 不要 | `.env.local` に追加 | 同上 |

## 5. 期待 KPI

| 指標 | 目標 |
|---|---|
| `E2E-AI-RL-01` (429 検知) | < 1 秒で 429 返却 |
| `E2E-AI-RL-02` (window 経過後) | カウンタリセット後 1 リクエスト目が 200 |
| `E2E-AI-SSRF-01〜04` 全件 | < 500ms で判定 |
| 既存 E2E-CAP-* リグレッション | 既存 SLA 維持 (撮影→結果 5 秒以内 P95) |

## 6. テスト実行戦略

- **PR ごと (critical-path)**: E2E-AI-RL-01, E2E-AI-SSRF-02 (最低限のセキュリティ確認)
- **nightly (フル E2E)**: 全シナリオ (リグレッション含む)
- **Upstash モック**: CI ローカルでは in-memory mock を使用、Vercel preview deploy では実 dev Upstash 接続
- **手動 smoke test (α 公開前)**: 実 Upstash 本番接続で 11 req 投入 → 429 確認

## 7. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf`) | /flow:revise |
