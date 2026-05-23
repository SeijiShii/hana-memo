# legal 単体テスト計画（プライバシーポリシー Sentry PII スクラブ開示の明記）

> **入力**: `./001_REVISE_SPEC.md`, `./002_REVISE_PLAN.md`, 既存 `src/features/legal/versions.test.ts`
> **最終更新**: 2026-05-24

---

## 1. 追加テストケース

### 1.1 正常系
| ID | 対象 | 入力 | 期待出力 |
|---|---|---|---|
| U-01 | `needsReConsent` | current={privacy_policy: 'v1.0.0'}, latest={privacy_policy: 'v1.1.0'} | privacy_policy が再同意必要リストに含まれる |
| U-02 | `LATEST_VERSIONS` | — | `privacy_policy === 'v1.1.0'` |

### 1.2 異常系 / 1.3 境界値
| ID | 対象 | 条件 | 期待 |
|---|---|---|---|
| — | (既存 parseSemver/compareVersion テストで担保済) | — | — |

## 2. 修正テストケース
| ID | 対象 | 修正前 | 修正後 | 理由 |
|---|---|---|---|---|
| M-01 | `versions.test.ts` で LATEST_VERSIONS.privacy_policy を 'v1.0.0' と断定する箇所 (あれば) | 'v1.0.0' | 'v1.1.0' | version bump 反映 |

## 3. 削除テストケース
| ID | 対象 | 削除理由 |
|---|---|---|
| (なし) | — | — |

## 4. リグレッション強化
- 既存 versions/consent テスト (legal TDD D20260523_033 の 22 件) 全維持
- `compareVersion('v1.0.0','v1.1.0') === -1` (minor 比較) を確認 (既存ロジックで担保)

## 5. Mock 方針差分
| 対象 | 前回 | 今回 | 理由 |
|---|---|---|---|
| — | 純関数テスト | 変更なし | — |

## 6. カバレッジ目標
| 種別 | 目標 | 根拠 |
|---|---|---|
| 行 | 80% | 既存継承 |
| 分岐 | 70% | 既存継承 |

## 7. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-24 | 初版作成 | /flow:revise (D20260524_046) |
