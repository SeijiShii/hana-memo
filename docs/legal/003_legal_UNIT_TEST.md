# legal 単体テスト計画

> **入力**: `./001_legal_SPEC.md`, `./002_legal_PLAN.md`
> **最終更新**: 2026-05-22

---

## 1. テストケース

### 1.1 consentApi.ts
| ID | 関数 | 入力 | 期待出力 |
|---|---|---|---|
| UT-LE-A01 | recordConsent 正常 | doc_type=privacy_policy, doc_version=v1.0.0 | consent_logs に 1 行 INSERT (user_id 自動) |
| UT-LE-A02 | recordConsent 3 件一括 | privacy + tos + ai_usage | 3 件 INSERT、トランザクション (RPC 内) |
| UT-LE-A03 | recordConsent INSERT 失敗 | mock supabase err | reject + retry 3 回後に最終 reject |
| UT-LE-A04 | getLatestConsents | userId | `{privacy_policy: 'v1.0.0', terms_of_service: 'v1.0.0', ai_usage: 'v1.0.0'}` |
| UT-LE-A05 | getLatestConsents 未同意 | userId without logs | `{}` 空 Object |
| UT-LE-A06 | recordConsent ip_hash | mock IP `203.0.113.1` | consent_logs.ip_hash が SHA-256(`salt:203.0.113.1`) |

### 1.2 useConsentStatus / useLatestVersions hook
| ID | 内容 | 期待 |
|---|---|---|
| UT-LE-H01 | useConsentStatus 初回 mount | DB fetch + localStorage 書込 |
| UT-LE-H02 | useConsentStatus localStorage hit | DB fetch スキップ (高速 path) |
| UT-LE-H03 | useConsentStatus localStorage 不可 | 毎回 DB fetch (フォールバック) |
| UT-LE-H04 | useLatestVersions match | needsReConsent=false |
| UT-LE-H05 | useLatestVersions privacy 不一致 | needsReConsent=true, diffs=['privacy_policy'] |
| UT-LE-H06 | useLatestVersions 全 doc 不一致 | diffs=['privacy_policy','terms_of_service','ai_usage'] |

### 1.3 InitialConsent コンポーネント
| ID | 内容 | 期待 |
|---|---|---|
| UT-LE-I01 | 初期表示 | 3 チェックボックス OFF、ボタン disabled |
| UT-LE-I02 | 1 件 ON | ボタン disabled (まだ全 ON でない) |
| UT-LE-I03 | 3 件 ON | ボタン enabled |
| UT-LE-I04 | ボタン押下 | recordConsent 3 回呼出 + onConsent コールバック |
| UT-LE-I05 | リンク押下 (プラポリ) | `/legal/privacy` に新タブで遷移 |
| UT-LE-I06 | 拒否 (バツ閉じ) | 「サービスを利用できません」モーダル表示 |
| UT-LE-I07 | キーボード操作のみ | Tab 移動 + Space で check + Enter で submit |

### 1.4 ReConsent コンポーネント
| ID | 内容 | 期待 |
|---|---|---|
| UT-LE-R01 | privacy のみ改訂 | privacy チェックのみ表示 (tos/ai_usage は表示しない) |
| UT-LE-R02 | 同意 | recordConsent 1 件呼出 |
| UT-LE-R03 | 「利用しない」押下 | onCancel コールバック (本セッション終了相当) |
| UT-LE-R04 | 差分要約表示 | 該当 doc_type の差分 prop で渡された文字列を表示 |

### 1.5 LegalPage コンポーネント
| ID | 内容 | 期待 |
|---|---|---|
| UT-LE-P01 | privacy doc を表示 | h1 「プライバシーポリシー」が出現 |
| UT-LE-P02 | XSS タグ無効化 | `<script>` を含むダミー md を入力 → 出力に script タグなし |
| UT-LE-P03 | リンク target_blank | 外部リンクは新タブ、内部は同タブ |
| UT-LE-P04 | 未知の doc type | 404 ページ |

### 1.6 latestVersions semver 比較
| ID | 内容 | 期待 |
|---|---|---|
| UT-LE-V01 | v1.0.0 == v1.0.0 | 一致 |
| UT-LE-V02 | v1.0.0 < v1.1.0 | 不一致 (再同意要) |
| UT-LE-V03 | v1.10.0 > v1.2.0 | 一致または「ユーザーが新しい」(再同意不要、警告 log) |
| UT-LE-V04 | 形式不正 | console.error + 安全側に倒し再同意要 |

### 1.7 異常系・境界
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| UT-LE-E01 | recordConsent RLS 拒否 | 他 user の user_id 指定 | reject (RPC 内で auth.uid() 強制) |
| UT-LE-E02 | consent_logs UPDATE 試行 | mock UPDATE 呼出 | DB レベル拒否 (append-only RLS) |
| UT-LE-E03 | doc_version null | recordConsent({doc_type, doc_version: null}) | バリデーション reject |
| UT-LE-B01 | 同時送信 | recordConsent 連打 (race) | 重複 INSERT 許容 (append-only ログ) |

## 2. Mock 方針

| 対象 | 方針 | 理由 |
|---|---|---|
| Supabase client | vitest mock | スキーマ + RLS は `_shared/db` UNIT でカバー済 |
| localStorage | jsdom 標準 + 一部 `localStorage.setItem = throwing` で不可環境 simulate | フォールバック検証 |
| react-router | MemoryRouter | 単体テストで Route 切替 |
| crypto.subtle (hashIp) | Node ネイティブ使用 | 環境差なし |
| Markdown 原稿 | vitest の `vi.importActual` + fixture md ファイル | 実 md と分離 |
| Date.now (ログ ts) | `vi.useFakeTimers` | テスト deterministic |

## 3. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行カバレッジ | 80% | アプリ層標準 |
| 分岐カバレッジ | 75% | 同意状態の各分岐網羅 |
| critical path (consent flow) | 95% | 法的同意は安全側に倒す必要があるため厚く |

## 4. テスト実行環境
- vitest + jsdom + @testing-library/react
- CI 並列実行可

## 5. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 | /flow:feature |
