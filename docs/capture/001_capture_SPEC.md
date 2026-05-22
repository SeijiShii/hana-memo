# capture 機能仕様書

> **役割**: 撮影 → AI 識別 → 保存の中核フロー (UC1)
> **タグ**: feature / auth-required / external-api / stateful
> **最終更新**: 2026-05-22
> **入力アーティファクト**: `../concept.md` §1.1 UC1, §5.2, `../_shared/ai/001_ai_SPEC.md`, `../_shared/storage/001_storage_SPEC.md`

> **2026-05-22 BaaS Pivot 反映**: 本 SPEC 内で Supabase 関連の表現 (例: `supabase.from(...).insert`、Supabase Storage、Edge Function、Anonymous Auth、RLS `auth.uid()`) は **Neon (Drizzle ORM) + Clerk (Guest Users + linkIdentity) + Cloudflare R2 (Presigned URL) + Vercel Functions** に読み替えること。具体的な SDK 呼出と RLS 代替 (Drizzle 層 `where user_id = ctx.userId`) は実装フェーズ `/dev-spec` で再設計する。マッピング詳細は concept.md §6 / `_shared/{auth,db,storage,ai}` SPEC を参照。

---

## 1. 詳細 UC

### UC 1: 撮影 → AI 識別 → 詳細表示
- **トリガー**: メイン画面の「撮影」ボタン
- **前提**: 認証済 (匿名でも可)、同意済 (legal UC1 完了)、ai_consent_revoked_at = null
- **入力**: ネイティブ camera 起動 → 撮影 1 枚
- **処理ステップ**:
  1. `<input type="file" accept="image/*" capture="environment">` 経由で撮影 → File 取得
  2. _shared/helpers/image.ts で WebP 変換 + 2048px リサイズ + EXIF strip
  3. 並行で `navigator.geolocation.getCurrentPosition()` (user_settings.location_precision に従う)
  4. プレビュー画面表示 (「これでよい / 撮り直し」)
  5. 「これでよい」 → discovery INSERT (status=identifying, captured_at, season, location, image_url=暫定)
  6. Storage upload (uploadPlantImage)
  7. images テーブル INSERT (storage_path + discovery_id)
  8. discovery 更新 (image_id 反映)
  9. identifyPlant(discoveryId, imageUrl, ...) 呼出 (非同期)
  10. ユーザーは即一覧画面 (notebook) に戻れる
  11. 識別完了 → discovery 更新 + in-app バナー通知 (Realtime subscription)
- **出力**: discoveries 1 行 + images 1 行 + Storage object 1 件 + 識別結果バナー
- **代替フロー**:
  - quota 0 → 課金画面誘導 modal
  - 匿名 trial 超過 → OAuth 誘導 modal
  - AI 識別失敗 → discovery.status=pending、一覧で「再識別」ボタン表示

### UC 2: 識別失敗時の手動再識別
- **トリガー**: notebook 一覧で status=pending の discovery の「再識別」ボタン
- **処理**: retryIdentify(discoveryId) 呼出 → 同じ payload で AI 再呼出 → 更新

### UC 3: 撮影中の中断
- **トリガー**: 撮影プレビュー画面で戻る or アプリ閉じる
- **処理**: discovery 未作成のためデータ無し、Storage upload 未実行
- **出力**: なし

## 2. 入出力

### 2.1 API
| メソッド | パス | 入力 | 出力 | 認証 |
|---|---|---|---|---|
| (Edge Function) `identify-plant` | POST | IdentifyInput | IdentifyResult | JWT |
| (Supabase) `from('discoveries').insert` | DB | discovery row | inserted | RLS |
| (Supabase) `from('images').insert` | DB | image row | inserted | RLS |
| (Storage) `upload` | PUT | WebP blob | path | RLS |
| (Realtime) `discoveries:id=eq.X` | sub | — | row event | RLS |

### 2.2 画面入力
| 画面 | フィールド | 必須 | 説明 |
|---|---|---|---|
| 撮影 | 写真 (camera 起動経由) | ✅ | 1 枚 |
| プレビュー | 補助メモ (textarea) | 任意 | 最大 200 文字、IdentifyInput.userNote に渡す |
| プレビュー | 「これでよい」「撮り直し」 | ✅ | |

### 2.3 副作用
- DB 書込: `discoveries` (INSERT + UPDATE), `images` (INSERT)
- Storage: WebP object PUT
- Edge Function 呼出: identify-plant
- Realtime sub 開始 (識別完了通知用)

## 3. データモデル
新規エンティティなし。既存 `discoveries`, `images` (`_shared/db/001_db_SPEC.md`) を使用。

### 3.1 ステータス遷移 (discoveries.status)
```
identifying → identified  (confidence >= 0.6)
            → pending     (AI 失敗 / confidence < 0.6 / structured output 不適合)
            → unknown     (AI が植物検出失敗 / 永続失敗確定)
pending → identifying (retry 中)
```

## 4. バリデーション + エラーケース

### 4.1 バリデーション
| 対象 | ルール | エラーメッセージ |
|---|---|---|
| 画像ファイル | 取得成功必須、5MB 以下に変換可能 | 「画像を取得できませんでした」 |
| 補助メモ | 任意、最大 200 文字 | 200 文字で trim |
| location | user_settings.location_precision=off なら無視 | (silent) |
| ai_consent_revoked_at | null 必須 | 「AI 同意が必要です」 → 設定画面誘導 |

### 4.2 エラーケース
| ID | 条件 | 対応 |
|---|---|---|
| E-CA-001 | カメラ許可拒否 | 「カメラを許可してください」 + 設定誘導 |
| E-CA-002 | WebP 変換失敗 | 「画像処理に失敗」+ 撮り直しボタン |
| E-CA-003 | Storage upload 失敗 | retry 2 回 → 失敗時 discovery DELETE + エラー表示 |
| E-CA-004 | identify quota 0 | 課金画面誘導 modal、discovery は pending で保持 |
| E-CA-005 | identify link_required (匿名 trial 超過) | OAuth 誘導 modal、discovery pending |
| E-CA-006 | identify 500 | discovery.status='pending'、再識別ボタン表示 |
| E-CA-007 | geolocation 取得失敗 / timeout | location=null で続行 (UX 影響なし) |
| E-CA-008 | Realtime 接続失敗 | poll fallback (5s ごと discovery fetch) |

## 5. 機能固有 NFR + 既存機能連携

### 5.1 NFR
| 項目 | 目標値 | 根拠 |
|---|---|---|
| 撮影 → プレビュー表示 | < 1s (WebP 変換 + リサイズ含む) | UX |
| プレビュー → discovery INSERT + upload | < 3s | UX |
| AI 識別完了 (P95) | < 5s | concept §3 NFR |
| Realtime 通知遅延 | < 2s | UX (バナー出現) |
| カメラ無し端末対応 | フォルダ選択 fallback (input file 標準動作) | 互換性 |

### 5.2 連携
| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/auth` | session + trial 確認 | initSession 済前提、enforceTrialLimit |
| `_shared/db` | INSERT/UPDATE | discoveries, images |
| `_shared/storage` | upload | uploadPlantImage |
| `_shared/helpers/image` | WebP 変換 | convertToWebP, stripExif |
| `_shared/helpers/location` | 100m 丸め | roundLocation |
| `_shared/helpers/season` | 季節判定 | getCurrentSeason |
| `_shared/ai` | identify | identifyPlant |
| `_shared/analytics/cost` | logApiUsage は Edge Function 側 | — |
| `legal` | AI 同意確認 | enforce ai_consent |
| `account` | location_precision 参照 | user_settings |
| `billing` | quota 残確認 | 撮影前 check |
| `notebook` | 撮影後遷移先 | navigate('/notebook') |

## 6. タグ別追加

### 6.1 認可 (auth-required)
- discovery INSERT は auth.uid()=user_id RLS
- images INSERT も同様
- Storage path に user_id を含めて RLS 整合

### 6.2 状態遷移 (stateful)
- discoveries.status enum: identifying / identified / pending / unknown
- pending → retryIdentify で identifying に戻る
- terminal: identified / unknown (unknown は復旧不可)

### 6.3 外部 API (external-api)
- OpenAI Vision (Edge Function 経由)
- Geolocation API (ブラウザ)

## 7. スコープ外
- 連続撮影モード (1 枚ずつ)
- 動画
- ギャラリーから複数枚同時アップロード (MVP 後)
- 撮影後の画像編集 (crop, brightness 等)
- AI 結果の手動補正 → notebook 側

## 8. 未決事項
> 現時点で本 SPEC 起因論点なし
>
> 関連: [論点-004] 位置情報粒度 (account 側で確定済)、[論点-006] 匿名 trial 回数 (3 回採用済)

## 9. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
