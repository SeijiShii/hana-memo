# _shared/db 単体テスト計画

> **入力**: `./001_db_SPEC.md`, `./002_db_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース一覧

### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| UT-DB-001 | マイグレーション適用 | `supabase migration up` (フレッシュ DB) | 全 14 ファイル適用成功、エラーなし |
| UT-DB-002 | 型生成 | `supabase gen types typescript --local` | `src/shared/types/supabase.ts` 生成、全テーブル + enum が型に含まれる |
| UT-DB-003 | users INSERT (匿名) | `auth.signInAnonymously()` → public.users 自動 INSERT (trigger) | row 作成、is_anonymous=true、email=null |
| UT-DB-004 | users UPDATE (OAuth リンク) | linkIdentity 後 trigger で email + oauth_provider 設定 | is_anonymous=false, linked_at=now |
| UT-DB-005 | discoveries INSERT (自分) | RLS pass、必須フィールド埋め | row 作成 |
| UT-DB-006 | discoveries SELECT (自分) | `eq('user_id', auth.uid())` | 自分の行のみ返却 |
| UT-DB-007 | plants SELECT (全 user) | 認証 user (匿名含む) で SELECT | 全 plants 返却 (公開マスタ) |
| UT-DB-008 | api_usage INSERT | service='openai', endpoint='gpt-4o-mini-vision' | row 作成 |
| UT-DB-009 | api_usage_monthly マテビュー | api_usage 100 件 INSERT → REFRESH MATERIALIZED VIEW → SELECT | 集計行返却、total_calls=100 |
| UT-DB-010 | user_settings 自動作成 | users INSERT trigger で user_settings も同時 INSERT | row 作成、defaults 適用 |
| UT-DB-011 | consent_logs INSERT | 同意ダイアログ → INSERT | row 作成、agreed_at=now |
| UT-DB-012 | updated_at trigger | users UPDATE → updated_at が now() に更新される | updated_at が変更 |
| UT-DB-013 | seed 適用 | `supabase db reset` | plants 50 件、テスト user 1 件 |

### 1.2 異常系
| ID | 対象 | 失敗条件 | 期待振る舞い |
|---|---|---|---|
| UT-DB-101 | RLS 拒否 (他 user SELECT) | user_A で user_B の discoveries SELECT | 空配列返却 (エラーではない、Supabase 仕様) |
| UT-DB-102 | RLS 拒否 (他 user INSERT) | user_A が user_B の user_id で INSERT | RLS 違反エラー |
| UT-DB-103 | api_usage UPDATE 試行 | append-only 違反 | RLS により拒否 |
| UT-DB-104 | api_usage DELETE 試行 | 同上 | 同上 |
| UT-DB-105 | billing_unlocks 匿名 user で INSERT | 匿名 user_id で INSERT | RLS により拒否 ([論点-007]) |
| UT-DB-106 | discoveries.captured_at FUTURE | now() + 1 day で INSERT | CHECK 制約違反 |
| UT-DB-107 | images.original_size_bytes > 10MB | 15MB で INSERT | CHECK 制約違反 |
| UT-DB-108 | plants 書込試行 (非 service_role) | 認証 user で INSERT/UPDATE | RLS により拒否 |
| UT-DB-109 | stripe_session_id 重複 | 同一 session_id で 2 回 INSERT | UNIQUE 制約違反 (冪等性は API 層で吸収) |
| UT-DB-110 | 未認証 SELECT | 全テーブルに対し anon 未認証で SELECT | 空配列 or 拒否 (RLS) |

### 1.3 境界値
| ID | 対象 | 境界 | 期待振る舞い |
|---|---|---|---|
| UT-DB-201 | plant_candidates 空配列 | `discoveries.plant_candidates = '[]'::jsonb` | INSERT 成功、ユーザー「分からない」相当 |
| UT-DB-202 | location 完全 null | `location_lat = null, location_lng = null` | INSERT 成功 (位置 OFF 時) |
| UT-DB-203 | location_precision_m = -1 | エリア名のみ設定 | INSERT 成功 |
| UT-DB-204 | api_usage 大量 INSERT (1k 件) | 1 transaction で 1k INSERT | 5s 以内完了 (Supabase Free CPU 制約内) |
| UT-DB-205 | マテビュー REFRESH 性能 | api_usage 100k 件 → REFRESH | 30s 以内 (PLAN §5.1 NFR) |
| UT-DB-206 | season_months 範囲外 | `[0, 13]` (1-12 外) | CHECK 制約 or アプリ層バリデーション (今回 DB 側に置く案 / Phase 2 で検討) |

## 2. Mock 方針

| 対象 | 方針 | 理由 |
|---|---|---|
| Supabase Local Postgres | **実物** (supabase start) | DB スキーマ + RLS の検証は本物のエンジンで行う |
| auth.users (Supabase Auth) | **実物** (signInAnonymously API) | RLS は auth.uid() に依存、モックでは再現困難 |
| pg_cron | **モック** (UNIT では呼ばない、refresh は手動 trigger) | テスト時間短縮 |
| 時刻 | **固定値注入** (`SET LOCAL search_path` + `current_setting('app.test_now')` 等で) | UNIT-DB-204/205 等の再現性 |

## 3. カバレッジ目標

| 種別 | 目標 | 根拠 |
|---|---|---|
| マイグレーション SQL 行カバレッジ | 100% (全 CREATE / ALTER / INDEX 実行) | DB スキーマは全文実行が前提 |
| RLS ポリシー分岐カバレッジ | 100% (全ポリシーの SELECT/INSERT/UPDATE/DELETE) | RLS の漏れは即セキュリティ事故 |
| TypeScript ラッパ行カバレッジ | 80% | concept から継承 |
| TypeScript ラッパ分岐カバレッジ | 70% | concept から継承 |

## 4. 既存ユーティリティ依存

- `@supabase/supabase-js` (v2 系、Anonymous Auth 対応版)
- (テスト時) `vitest` or `node:test` (concept §4.3 で確定、本 PLAN では未決→ `/flow:feature` 全体完了時の choice)

## 5. テスト実行環境

- フレームワーク: 言語非依存 (テストツール、例: vitest)
- 並列実行: ❌ (DB スキーマ共有のため Phase 単位で直列)
- 実行コマンド (例示): `supabase test db` (PostgreSQL レベル) + アプリ層テスト (vitest 等)
- CI: GitHub Actions で `supabase start` → migration → test → seed → test

## 6. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
