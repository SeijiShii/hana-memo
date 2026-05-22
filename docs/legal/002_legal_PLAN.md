# legal 実装計画書

> **入力**: `./001_legal_SPEC.md`, `../_shared/db/001_db_SPEC.md`, `../concept.md` §9
> **最終更新**: 2026-05-22

---

## 1. 実装対象ファイル一覧

### 1.1 アプリ層 (`src/features/legal/`)
| ファイル | 責務 | 依存 | LOC |
|---|---|---|---|
| `pages/InitialConsent.tsx` | 初回起動同意 UI (3 チェックボックス) | _shared/auth, _shared/db | ~120 |
| `pages/ReConsent.tsx` | 改訂時再同意ダイアログ (該当 doc_type のみ) | _shared/db | ~90 |
| `pages/LegalPage.tsx` | `/legal/*` の汎用 Markdown レンダラ | react-markdown | ~50 |
| `pages/ContactForm.tsx` | お問い合わせフォーム ([論点-009] 解決後) | Supabase Edge Function | ~80 |
| `components/ConsentCheckbox.tsx` | 単一同意チェックボックス + ラベル + リンク | (なし) | ~40 |
| `hooks/useConsentStatus.ts` | 自分の最新同意状態 hook (DB + localStorage) | _shared/db | ~50 |
| `hooks/useLatestVersions.ts` | アプリ定数 `LATEST_VERSIONS` vs 自分の同意済バージョン比較 | (定数) | ~30 |
| `lib/consentApi.ts` | recordConsent / getLatestConsents 関数 | _shared/db, _shared/helpers/id (hashIp) | ~60 |
| `lib/latestVersions.ts` | `LATEST_VERSIONS` 定数 + 改訂履歴コメント | (なし) | ~20 |
| `index.ts` | barrel | 全 above | ~10 |

### 1.2 静的ドキュメント (`docs/legal/` に Markdown 原稿、`src/features/legal/content/` に build-time import)
| ファイル | 責務 |
|---|---|
| `docs/legal/privacy_policy.md` | プライバシーポリシー本文 (v1.0.0) |
| `docs/legal/terms_of_service.md` | 利用規約本文 (v1.0.0) |
| `docs/legal/specified_commercial_transactions.md` | 特商法表記 (v1.0.0) |
| `docs/legal/ai_usage_consent.md` | AI 利用同意文 (v1.0.0) |
| (build-time) `src/features/legal/content/*.md?raw` | Vite `?raw` import で文字列化 |

### 1.3 ルーティング追加 (`src/app/router.tsx`)
| ルート | コンポーネント | 認証 |
|---|---|---|
| `/legal/privacy` | `<LegalPage doc="privacy_policy" />` | 不要 |
| `/legal/terms` | `<LegalPage doc="terms_of_service" />` | 不要 |
| `/legal/specified-commercial-transactions` | `<LegalPage doc="scta" />` | 不要 |
| `/legal/ai-usage` | `<LegalPage doc="ai_usage_consent" />` | 不要 |
| `/legal/contact` | `<ContactForm />` | 不要 (匿名でも可) |
| (modal) `<InitialConsent />` | アプリ起動時の Gate | 認証直後 |
| (modal) `<ReConsent />` | LATEST_VERSIONS 不一致時 Gate | 認証後 |

### 1.4 Supabase 関連
| ファイル | 責務 |
|---|---|
| `supabase/migrations/20260522_017_rpc_record_consent.sql` | RPC `record_consent(doc_type, doc_version)` 定義 (auth.uid() 内包) |
| `supabase/functions/contact-mail/index.ts` | (論点-009 解決後) Resend で問合せメール送信 |

## 2. 実装 Phase 分割

### Phase 1: 静的ページ + ルーティング ([最優先])
- ゴール: `/legal/*` が build 時 Markdown を表示できる
- 着手条件: Vite + React Router セットアップ済
- 含む: LegalPage / Markdown 原稿 4 種 (privacy_policy, terms_of_service, scta, ai_usage_consent)

### Phase 2: 初回同意 UI + DB 連携
- ゴール: 起動 → InitialConsent モーダル → 3 件 INSERT → メイン画面
- 含む: InitialConsent / ConsentCheckbox / useConsentStatus / consentApi / recordConsent RPC
- 依存: `_shared/auth` 完了 (匿名 session 確立), `_shared/db` migration 適用済

### Phase 3: 改訂時再同意
- ゴール: LATEST_VERSIONS と consent_logs を比較 → 差分があれば ReConsent モーダル
- 含む: ReConsent / useLatestVersions / latestVersions.ts

### Phase 4: お問い合わせフォーム ([論点-009] 解決後)
- ゴール: `/legal/contact` で送信 → Edge Function → Resend
- 自前実装案採用前提

## 3. 依存関係順序

```mermaid
graph TD
  Auth[_shared/auth (匿名 session)] --> IC[InitialConsent]
  DB[_shared/db (consent_logs)] --> IC
  DB --> RC[ReConsent]
  Help[_shared/helpers/id.hashIp] --> CA[consentApi.recordConsent]
  IC --> CA
  RC --> CA
  LV[latestVersions.ts] --> RC
  Markdown[Markdown 原稿] --> LP[LegalPage]
  EF[Edge Function contact-mail] --> CF[ContactForm]
  Resend[Resend SDK] --> EF
```

## 4. 既存ファイル影響
- `src/app/App.tsx` に「未同意なら InitialConsent / 改訂未対応なら ReConsent を gate 表示」ロジック追加
- `src/app/router.tsx` に `/legal/*` ルート追加
- `.env.example` に `VITE_LEGAL_LATEST_VERSIONS` を追加 (アプリ定数だが env 上書きも許可、リハーサル用)
- `package.json` に `react-markdown`, `remark-gfm` を追加
- `vite.config.ts` に `assetsInclude: ['**/*.md']` または `?raw` import を許可

## 5. 横断フォルダ追加・変更
| 横断フォルダ | 追加・変更内容 |
|---|---|
| `_shared/db/migrations/` | `20260522_017_rpc_record_consent.sql` 追加 |
| `_shared/helpers/id.ts` | `hashIp` 関数を追加 (既存設計に含む想定) |
| `_shared/types/domain.ts` | `ConsentLog`, `DocType`, `DocVersion` 型追加 |

## 6. リスク・注意点
- **同意未取得で AI 呼び出される競合**: InitialConsent モーダル表示中はメイン画面操作を完全に blocking する (React Portal + overlay)
- **localStorage 改竄**: 起動時に DB 真実と照合、localStorage は高速化目的のみで信頼境界に置かない
- **Markdown XSS**: ユーザー生成コンテンツではないが、`react-markdown` の rehype プラグインで HTML タグ無効化
- **doc_version 単調増加**: semver 比較は文字列比較で不可。`compare-versions` ライブラリ or 自前実装
- **改訂頻度**: 法務改訂時に LATEST_VERSIONS 定数の更新と Markdown 原稿 commit を必ずセット (PR テンプレで縛る)
- **匿名 user の同意ログ**: user_id は anonymous uid。account upgrade (OAuth link) しても uid は維持されるため、同意履歴も継承される (`_shared/auth` 設計と整合)
- **個情法**: ip_hash 保存は法的同意取得の証跡確保用 (短期保存、90 日で削除する cron 推奨 → `[論点-009 関連]` で詰める)

## 7. DoD
- [ ] `/legal/privacy` 等で書類が表示される (4 ルート)
- [ ] 起動 → 同意 → メイン画面の golden path が動く
- [ ] LATEST_VERSIONS を bump → 再同意ダイアログが出る
- [ ] consent_logs に 3 件 (初回) / 該当数 (再同意) が記録される
- [ ] RLS で他 user の consent_logs が見えないことを確認
- [ ] localStorage 不可環境 (private mode) でも動作する
- [ ] アクセシビリティ: キーボードのみで同意完了できる、スクリーンリーダーでチェックボックス読み上げ可能
- [ ] vitest + Playwright で UC1〜UC4 が green

## 8. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
