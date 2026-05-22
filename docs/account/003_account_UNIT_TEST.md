# account 単体テスト計画

> **入力**: `./001_account_SPEC.md`, `./002_account_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 useUserSettings hook
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-H01 | 初回 mount | DB fetch → state にセット |
| UT-AC-H02 | location_precision 更新 | upsert 1 回 + optimistic UI 即更新 |
| UT-AC-H03 | upsert 失敗 | rollback + toast 表示 |
| UT-AC-H04 | 別 tab で更新通知受信 | refetch (Supabase Realtime 想定) |

### 1.2 accountApi.ts (RPC ラッパ)
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-A01 | request_account_deletion 正常 | users.deleted_at set + reason 保存 |
| UT-AC-A02 | request_account_deletion reason 501文字 | 500 文字に trim |
| UT-AC-A03 | request_account_deletion 既 delete 済 | reject「すでに削除予約済です」 |
| UT-AC-A04 | cancel_account_deletion 正常 | deleted_at = null |
| UT-AC-A05 | cancel_account_deletion 未予約 | reject |

### 1.3 AccountSection コンポーネント
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-S01 | 匿名 user 表示 | 「Google で連携」ボタンのみ表示、ログアウト無し |
| UT-AC-S02 | OAuth user 表示 | email + 「ログアウト」表示、連携ボタンは「連携済」 disabled |
| UT-AC-S03 | リンクボタン押下 | linkGoogleIdentity 呼出 |

### 1.4 DeleteAccountModal
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-D01 | モーダル 1 表示 | 件数 (discoveries N、images M) 取得 + 表示 |
| UT-AC-D02 | モーダル 2 遷移 | reason textarea + ボタン |
| UT-AC-D03 | reason 501 文字 | 500 文字に trim |
| UT-AC-D04 | submit | request_account_deletion 呼出 + signOut + 遷移 |
| UT-AC-D05 | cancel | モーダル閉じる |

### 1.5 DeletionPendingGate
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-G01 | deleted_at=null | children 表示 (通常 UI) |
| UT-AC-G02 | deleted_at set | Gate 表示 (取消 or ログアウトのみ) |
| UT-AC-G03 | 取消押下 | cancel_account_deletion 呼出 + reload |

### 1.6 LocationPrecisionSection
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-L01 | デフォルト 'coarse' | radio coarse 選択済 |
| UT-AC-L02 | 'off' 選択 | user_settings 更新 + 注意書き表示 (「位置情報を記録しません」) |
| UT-AC-L03 | 'precise' 選択 | 個情リスク注意書き表示 |

### 1.7 AiConsentSection
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-AI01 | デフォルト ON | スイッチ ON |
| UT-AC-AI02 | OFF にする | ai_consent_revoked_at 更新 + 警告表示「以後 AI 識別は使えません」 |
| UT-AC-AI03 | 再度 ON | consent_logs に v1.0.0 INSERT + ai_consent_revoked_at = null |

### 1.8 PrivacySection
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-P01 | analytics_opt_in toggle | user_settings 更新 + Sentry reconfigure 呼出 |

### 1.9 purge-deleted-users Edge Function
| ID | シナリオ | 期待 |
|---|---|---|
| UT-AC-PG01 | 31 日前 delete user 1 件 | 削除実行 (auth.users + 関連 + storage) |
| UT-AC-PG02 | 30 日前 (境界) | 削除実行 (gte 30 日) |
| UT-AC-PG03 | 29 日前 | 削除しない |
| UT-AC-PG04 | Storage 削除失敗 | retry → 失敗時 Sentry alert + DB 削除しない (整合性確保) |
| UT-AC-PG05 | consent_logs | user_id NULL 化のみ、行削除しない |

### 1.10 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-AC-E01 | RLS 拒否 | 他 user の user_settings update | reject |
| UT-AC-E02 | OAuth redirect 失敗 | callback で state 不一致 | エラーモーダル |
| UT-AC-B01 | 削除 grace 期限ちょうど | 30.0 日 | 削除実行 |

## 2. Mock 方針
| 対象 | 方針 |
|---|---|
| supabase | mock |
| _shared/auth functions | mock |
| Sentry reconfigure | mock |
| Storage Admin API | mock |
| Date.now | useFakeTimers |

## 3. カバレッジ目標
| 種別 | 目標 |
|---|---|
| 行 | 80% |
| 分岐 | 75% |
| critical (削除フロー) | 95% |

## 4. 実行環境
- vitest + jsdom + @testing-library/react
- Edge Function: Deno test

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
