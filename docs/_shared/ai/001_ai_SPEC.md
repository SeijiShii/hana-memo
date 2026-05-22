# _shared/ai 仕様書

> **役割**: AI クライアント (OpenAI Vision Edge Function ラッパ + プロンプト構築 + 出力構造化)
> **タグ**: cross-cutting / external-api / 基盤
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../../concept.md` §1.3.2, §3, §6, §7, `../analytics/001_analytics_SPEC.md`

---

## 1. 提供インターフェース

### 1.1 フロント側ラッパ (`src/shared/ai/identify.ts`)
| 関数 | シグネチャ | 説明 |
|---|---|---|
| `identifyPlant` | `(input: IdentifyInput) => Promise<IdentifyResult>` | Edge Function `identify-plant` を呼ぶ |
| `retryIdentify` | `(discoveryId: string) => Promise<IdentifyResult>` | 既存 discovery (status=pending) を再識別 |

### 1.2 Edge Function (`supabase/functions/identify-plant/`)
| ファイル | 責務 |
|---|---|
| `index.ts` | HTTP handler、auth 確認 → quota 確認 → OpenAI 呼出 → DB 更新 → cost log |
| `prompt.ts` | system / user message 構築、構造化メタ注入 |
| `schema.ts` | OpenAI structured output schema 定義 |
| `openai-client.ts` | OpenAI SDK ラッパ (retry 内蔵) |

### 1.3 型 (`_shared/types/ai.ts` で定義)
```ts
type IdentifyInput = {
  discoveryId: string;       // capture 側で先に DB に row を作成済
  imageUrl: string;          // 署名 URL (60 分有効)
  capturedAt: string;        // ISO 8601
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  location?: { lat: number; lng: number }; // 100m 丸め済
  userNote?: string;         // 任意
};

type IdentifyResult = {
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  keyFeatures: string[];     // 3-5 個
  confidence: number;        // 0-1
  similarSpecies: { commonName: string; reasonForLikely: string }[];
  status: 'identified' | 'pending' | 'unknown';
};
```

## 2. 入出力

### 2.1 外部 API
| サービス | エンドポイント | 認証 |
|---|---|---|
| OpenAI Chat Completions | POST /v1/chat/completions | OpenAI API key (Edge Function 内のみ) |

### 2.2 副作用
- DB 更新: `discoveries` (commonName, scientific_name, status, confidence 等)
- DB 書込: `api_usage` (logApiUsage 経由)
- 外部呼出: OpenAI API (画像 + テキスト送信)

## 3. データモデル
新規定義なし。`_shared/types/ai.ts` の `IdentifyInput`, `IdentifyResult` に集約。

### 3.1 OpenAI Structured Output Schema
```json
{
  "type": "object",
  "properties": {
    "common_name":     { "type": "string" },
    "scientific_name": { "type": "string" },
    "family":          { "type": "string" },
    "genus":           { "type": "string" },
    "key_features":    { "type": "array", "items": { "type": "string" }, "minItems": 1, "maxItems": 5 },
    "confidence":      { "type": "number", "minimum": 0, "maximum": 1 },
    "similar_species": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "common_name":      { "type": "string" },
          "reason_for_likely":{ "type": "string" }
        },
        "required": ["common_name", "reason_for_likely"]
      }
    }
  },
  "required": ["common_name", "scientific_name", "family", "genus", "key_features", "confidence", "similar_species"],
  "additionalProperties": false
}
```

### 3.2 プロンプト
```
[system]
あなたは日本国内の植物識別のエキスパート植物学者です。
ユーザーが撮影した植物画像と付帯メタを元に、最も可能性の高い種を JSON で返してください。
不確実な場合は confidence を 0.6 未満にし、similar_species に候補を最大 3 つ挙げてください。
学名はラテン語、その他は日本語で返してください。

[user]
画像: <image_url>
撮影日時: 2026-05-22T13:14:00+09:00
季節: 春
おおまかな撮影位置 (約100m精度): 緯度 35.681, 経度 139.767  (東京駅周辺)
ユーザーの補助メモ: 「葉が細長く花は白い」
```

## 4. バリデーション・エラー

### 4.1 入力チェック
| 関数 | チェック | 失敗時 |
|---|---|---|
| identifyPlant | discoveryId 形式 | reject |
| identifyPlant | imageUrl の host が Supabase Storage | reject |
| Edge Function | quota 残あり | 402 Quota Exceeded + status=quota_exceeded |
| Edge Function | OAuth 必須条件 (匿名 trial 超過) | 401 + status=link_required |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-AI-001 | OpenAI 5xx / timeout | Edge Function 内で 3 回 retry (1s, 2s, 4s backoff) → 失敗時 discovery.status='pending' で保存、UI 表示 |
| E-AI-002 | OpenAI rate limit (429) | 待機 5s + retry 2 回 → 失敗時 pending |
| E-AI-003 | Structured output 不適合 | 構造で reject + pending、人手 fix 不可なら unknown |
| E-AI-004 | 画像が植物でない (gpt が拒否) | confidence=0、status=unknown、UI に「植物が検出できませんでした」 |
| E-AI-005 | quota 超過 | 402、課金画面へ誘導 |
| E-AI-006 | OpenAI ステータス overall outage | Sentry alert、status=pending で全件保留 |

## 5. NFR + 既存連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| identifyPlant 完了 | < 5s (P95) | concept §3 NFR |
| 1 回コスト | < $0.003 (gpt-4o-mini, detail=low, max_tokens=600) | 予算管理 |
| retry policy | 3 回 / exponential backoff (1s, 2s, 4s) | 安定性 |
| Edge Function timeout | 30s | Supabase Free 上限 |
| 月予算 | < $30 / month | concept §4.6 |

### 5.2 既存連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/auth` | session | Edge Function は user JWT 検証で auth.uid() 取得 |
| `_shared/db` | DB 更新 | discoveries テーブル更新 |
| `_shared/analytics` | logApiUsage | OpenAI 呼出ごとに必ず INSERT |
| `_shared/storage` | imageUrl 生成 | 呼出前に getSignedUrl |
| `capture` | identifyPlant 呼出 | 撮影直後 |
| `billing` | quota 確認 | 残回数 0 のとき購入誘導 |

## 6. タグ別追加

### 6.1 認可 (external-api)
- OpenAI API key は Vercel/Supabase env で Edge Function 専用変数 (`OPENAI_API_KEY`)
- フロント露出禁止 (`VITE_` 接頭辞は使わない)
- 抜けると Supabase project が即停止される可能性 → Sentry で env リーク監視

### 6.2 基盤
- 全 AI 呼出はこの module 経由に統一、フロントから直接 OpenAI を叩く実装は禁止 (CSP 設定で fetch を制限)

## 7. スコープ外
- 別 AI への切替 (Anthropic Claude, Gemini) → 必要なら interface 追加
- 自前モデル fine-tune → 不要
- 画像複数枚同時識別 → 1 枚ずつ呼出 (capture 機能側で順次)
- 音声入力 (whisper) → v2

## 8. 未決事項
> 現時点で本 SPEC 起因論点なし
>
> 関連: [論点-005] アナリティクス → AI 改善ループ構築は α 後判断

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
