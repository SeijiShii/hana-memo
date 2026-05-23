# _shared/ai 単体テスト計画 (レート制限 + SSRF 防御強化)

> **入力**: [./001_REVISE_SPEC.md](./001_REVISE_SPEC.md), [./002_REVISE_PLAN.md](./002_REVISE_PLAN.md), [../003_ai_UNIT_TEST.md](../003_ai_UNIT_TEST.md)
> **最終更新**: 2026-05-23

---

## 1. 追加テストケース

### 1.1 Vercel Function: `/api/identify-plant` (既存 §1.2 への増分)

| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-H10 | 11 req/min を同一 uid で投入 | 11 件目が 429 + `Retry-After: <seconds>` ヘッダ + body `{ error: 'rate_limited', retry_at: <unix_ms> }` |
| UT-AI-H11 | 10 req/min ぎりぎり (60 秒に分散) | 全件 200 |
| UT-AI-H12 | rate limit window 経過後 (60 秒待機) の再リクエスト | カウンタリセット、200 |
| UT-AI-H13 | `imageObjectKey = "../other_user/img.webp"` | 400 + `{ error: 'validation_error', reason: 'path traversal' }` |
| UT-AI-H14 | `imageObjectKey` 長さ 257 文字 | 400 + `{ error: 'validation_error', reason: 'key too long' }` |
| UT-AI-H15 | OpenAI が schema 違反返却 | discovery=pending + Sentry warn (既存 UT-AI-H08 と同等、SEC-003 で再確認) |

### 1.2 `_shared/helpers/url.ts` (新節)

#### 1.2.1 `assertSafeImageUrl`

| ID | 入力 | 期待 |
|---|---|---|
| UT-HEL-URL-01 | `https://<account>.r2.cloudflarestorage.com/path/img.webp` (allowlist HIT) | resolve (no throw) |
| UT-HEL-URL-02 | `http://example.com/x.webp` (http、allowlist 外) | throw `SsrfError('protocol')` |
| UT-HEL-URL-03 | `https://evil.com/x.webp` (allowlist 外 host) | throw `SsrfError('host')` |
| UT-HEL-URL-04 | `https://169.254.169.254/x.webp` (private IP literal) | throw `SsrfError('host')` (allowlist 不一致) or `SsrfError('private IP')` (DNS resolve 後) |
| UT-HEL-URL-05 | `file:///etc/passwd` | throw `SsrfError('protocol')` |
| UT-HEL-URL-06 | `gopher://evil.com/_` | throw `SsrfError('protocol')` |
| UT-HEL-URL-07 | `not-a-url` | throw (`new URL()` で TypeError) |
| UT-HEL-URL-08 | allowlist hit + DNS が private IP に解決 (mocked) | throw `SsrfError('private IP')` (DNS rebinding 防御) |
| UT-HEL-URL-09 | allowlist hit + DNS が IPv6 link-local (`fe80::1`) に解決 | throw `SsrfError('private IP')` |
| UT-HEL-URL-10 | allowlist hit + DNS が複数 IP 返す (1 個 public + 1 個 private) | throw `SsrfError('private IP')` (どれか 1 つでも private なら拒否) |

#### 1.2.2 `validateObjectKey`

| ID | 入力 | 期待 |
|---|---|---|
| UT-HEL-OK-01 | `validateObjectKey("user_abc/2026/05/23/img.webp", "user_abc")` | no throw |
| UT-HEL-OK-02 | `validateObjectKey("../user_xyz/img.webp", "user_abc")` | throw `ValidationError('path traversal')` |
| UT-HEL-OK-03 | `validateObjectKey("user_xyz/img.webp", "user_abc")` (他人 uid) | throw `ValidationError('userId prefix mismatch')` |
| UT-HEL-OK-04 | `validateObjectKey("a".repeat(257), "user_abc")` | throw `ValidationError('key too long')` |
| UT-HEL-OK-05 | `validateObjectKey("user_abc/" + "a".repeat(247), "user_abc")` (255 char、prefix 含む) | no throw |

### 1.3 `api/_lib/ratelimit.ts` (新ファイル)

| ID | シナリオ | 期待 |
|---|---|---|
| UT-AI-RL-01 | `withRateLimit('test', limit=10/min, handler)` 1 回呼出 | handler 実行、success=true |
| UT-AI-RL-02 | 11 回連続呼出 | 11 回目が `success=false`、`{ limit, remaining, reset }` を返す |
| UT-AI-RL-03 | key が異なれば別カウンタ (`test:a` と `test:b` で各 10) | 全て success |
| UT-AI-RL-04 | Upstash Redis 接続失敗 (mocked network error) | **fail-open** (rate limit 判定を skip して handler 実行) + Sentry warn (本体処理を rate limit 障害で止めない方針) |
| UT-AI-RL-05 | retry-after 計算 (reset - now) | 0 < retry_after <= 60 秒 |

## 2. 修正テストケース

| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| UT-AI-H09 | 既存「`image_url が他 user の storage path` で 400」 | (既存テスト) | `validateObjectKey` 経由で 400 (新エラーメッセージ `{ reason: 'userId prefix mismatch' }`) | SSRF guard 統合 ([SEC-003]) |
| UT-AI-F04 | 既存「5xx で AiServiceError」 | (既存テスト) | 5xx に加え **429 を捕捉して RateLimitError を新規 throw、フロント側で exponential backoff 3 回** | [SEC-001] レート制限 UX |

## 3. 削除テストケース

なし。

## 4. リグレッション強化

- **既存テスト維持**: UT-AI-F01〜F06, UT-AI-H01〜H09, UT-AI-P01〜P05, UT-AI-S01〜S06, UT-AI-O01〜O05, UT-AI-Q01〜Q04, UT-AI-E01〜E02, UT-AI-B01 (全 30 件) は全て継承
- **追加チェック**: rate limit middleware が**認証検証より後 + quota 検証より前** に挿入されていること (順序間違えると認証なしでも rate limit カウントが増える等の副作用)
- **追加チェック**: `validateObjectKey` が presigned URL 発行**より前**に呼ばれていること (検証なしで R2 にアクセスする経路を作らない)

## 5. Mock 方針差分

| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| `@upstash/ratelimit` | (なし) | mock (in-memory counter) | 本物の Upstash Redis を CI で叩かない |
| `dns.promises.lookup` | (なし) | mock (allowlist host → 8.8.8.8、private IP テスト用に 10.0.0.1 等を返す) | DNS rebinding テスト用 |
| `@clerk/backend` JWT 検証 | mock (既存) | (継続) | — |

## 6. カバレッジ目標

| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 (フロント) | 85% | 既存継承 + 429 ハンドリング追加分 |
| 行 (Vercel Function) | 90% | 既存継承 + rate limit / SSRF guard 追加分 |
| 行 (`_shared/helpers/url.ts`) | 95% | 新規ファイル、エラー分岐含めて高カバレッジ必須 |
| 分岐 | 80% | 既存継承 |

## 7. 実行環境

- vitest (フロント + Vercel Function、Node 20)
- Upstash Redis 実呼出は手動 smoke test のみ (CI mock、capture E2E でも 1 件確認)

## 8. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/ai --resume sec_001-003_rate_limit_ssrf`) | /flow:revise |
