# _shared/ai 実装計画書

> **入力**: `./001_ai_SPEC.md`, `../analytics/001_analytics_SPEC.md`, `../storage/001_storage_SPEC.md`
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/shared/ai/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `identify.ts` | identifyPlant / retryIdentify (Edge Function 呼出) | _shared/auth client | ~80 |
| `errors.ts` | QuotaExceededError, LinkRequiredError (re-export), AiServiceError | (なし) | ~30 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 Edge Function (`supabase/functions/identify-plant/`)
| ファイル | 責務 | LOC |
|---|---|---|
| `index.ts` | HTTP handler (auth / quota / openai / db / cost log) | ~200 |
| `prompt.ts` | buildPrompt(input) | ~80 |
| `schema.ts` | StructuredOutput schema (JSON) | ~50 |
| `openai-client.ts` | OpenAI SDK ラッパ + retry | ~80 |
| `quota.ts` | checkQuota(userId) / consumeQuota(userId) | ~60 |

### 1.3 マイグレーション (なし)
- discoveries テーブルは既存 (`_shared/db` で定義済)

## 2. 実装 Phase 分割

### Phase 1: Edge Function スケルトン
- ゴール: 認証チェック + dummy response 返す
- 含む: index.ts (skeleton), CORS 設定, auth jwt 検証

### Phase 2: OpenAI 連携
- ゴール: 実 API 呼出で IdentifyResult 取得
- 含む: openai-client.ts, prompt.ts, schema.ts, retry

### Phase 3: quota + cost log
- ゴール: 呼出前 quota チェック、呼出後 api_usage INSERT
- 含む: quota.ts, _shared/analytics/cost との連携

### Phase 4: フロント側 identifyPlant
- ゴール: capture から呼出可能
- 含む: src/shared/ai/identify.ts

## 3. 依存関係順序

```mermaid
graph TD
  Auth[_shared/auth (JWT)] --> EF[Edge Function]
  Storage[_shared/storage signed URL] --> EF
  EF --> OAI[OpenAI API]
  EF --> DB[(discoveries)]
  EF --> AU[(api_usage)]
  Analytics[_shared/analytics cost.ts] --> EF
  EF --> FE[src/shared/ai/identify.ts]
  FE --> Capture[capture feature]
```

## 4. 既存ファイル影響
- `supabase/config.toml` に function `identify-plant` 登録
- `.env` (Supabase secret) に `OPENAI_API_KEY` 追加
- `_shared/analytics/cost.ts` に identify-plant 用 logging を呼出側 (Edge Function) で行う

## 5. 横断フォルダ追加・変更
| 横断フォルダ | 追加・変更内容 |
|---|---|
| `_shared/types/ai.ts` | IdentifyInput, IdentifyResult (本 SPEC で定義) |
| `_shared/db/001_db_SPEC.md` の discoveries | status enum + confidence カラム (既存設計) を再確認 |

## 6. リスク・注意点
- **OpenAI API key 漏洩**: 漏れたら即 revoke → 月予算限度超える前に Sentry でアラート設定 (key 露出検知)
- **OpenAI レート制限**: tier 1 で TPM 制限あり、Edge Function 並列実行で枯渇可能性 → 429 retry + バックオフ
- **Structured Output サポート**: gpt-4o-mini の対応モデルバージョン必須 (`gpt-4o-mini-2024-07-18` 以降)
- **画像 URL 5MB 制限**: OpenAI 側の制限。Storage が 5MB 制限なので一致
- **Edge Function 30s timeout**: OpenAI が遅延すると timeout → retry 含めて 25s 以内に完了させる設計 (1 回呼出 5s 目安)
- **コスト爆発**: 月 $30 予算 → 1 回 $0.003 として 10,000 回。匿名 SPAM 抑止が効かないと 1 日で枯渇可能性。quota.ts + check-quota の二段防御
- **構造化出力エラー (E-AI-003)**: gpt が schema を満たさないことは稀だが、起きたら pending で保存 + Sentry で報告
- **discovery status='pending' のリトライ UX**: 「30 分以内に自動再試行 + 手動再試行可」設計、自動 cron は将来実装

## 7. DoD
- [ ] capture から identifyPlant 呼出で 5 秒以内に IdentifyResult が返る
- [ ] quota 0 で 402 + UI が課金画面に遷移
- [ ] 匿名 trial 超過で 401 + UI が OAuth 画面に遷移
- [ ] OpenAI 5xx で 3 回 retry → 最終 pending
- [ ] discoveries.status, confidence, scientific_name 等が正しく更新される
- [ ] api_usage INSERT で cost が記録される
- [ ] Edge Function key が response/log に絶対に出ない
- [ ] vitest (フロント) + Deno test (Edge Function) pass

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
