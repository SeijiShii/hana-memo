# _shared/analytics 変更計画書 (Sentry beforeSend PII スクラブ実装)

> **入力**: [./001_REVISE_SPEC.md](./001_REVISE_SPEC.md), [../../../concept.md](../../../concept.md) §3 NFR / §9.1, [../001_analytics_SPEC.md](../001_analytics_SPEC.md), [../002_analytics_PLAN.md](../002_analytics_PLAN.md)
> **最終更新**: 2026-05-23

---

## 1. 既存ファイル変更一覧

| ファイル | 変更内容 (概要) | リスク | 関連 SPEC § |
|---|---|---|---|
| `docs/_shared/analytics/001_analytics_SPEC.md` | §1.1 `initSentry` シグネチャに `beforeSend` / `beforeBreadcrumb` / `initialScope` 追記、§4.1 入力チェックに `analytics_opt_in=false` 完全 OFF を明記、§4.2 エラーケースに E-AN-005/E-AN-006 追加、§5.1 NFR に scrub 性能目標追加、§6.1 認可に PII スクラブ方針追加、§6 に security + legal-required タグ追加 | 中 (SPEC 構造変更) | REVISE_SPEC §7 |
| `docs/_shared/analytics/002_analytics_PLAN.md` | §1.1 アプリ層に `scrubber.ts` 追加、§2 Phase 0.5 「PII scrubber + beforeSend 統合」追加、§6 リスクに「scrub 漏れ = 法令違反リスク」追記 | 中 | REVISE_PLAN §2 |
| `docs/_shared/analytics/003_analytics_UNIT_TEST.md` | §1.1 scrubber 新節 + §1.2 sentry に beforeSend テスト + §1.3 Slack 通知テスト追加 | 低 | REVISE_UNIT_TEST §1 |
| `docs/_shared/helpers/001_helpers_SPEC.md` | §1 提供 IF に `sha256Hex(input: string): string` 関数を明示 (既存仕様再確認 or 新規追加) | 低 | REVISE_SPEC §7.2 |
| `docs/legal/001_legal_SPEC.md` | プラポリ §9.1 (Sentry 委託先記載) の追記項目を「TODO」として追加 (実際の追記は別 revise セッションで対応) | 低 (TODO のみ) | REVISE_SPEC §8.3 |

> 既存 4 文書 (001-003 + INDEX) は本サブフォルダ内の改修文書を作るのみで直接書き換えない。後続 `/flow:tdd _shared/analytics` セッションで親文書に反映 (TDD Phase 0 でマージ判断)。

## 2. 新規ファイル一覧

| ファイル | 責務 | 依存 | LOC 見積 |
|---|---|---|---|
| `src/shared/analytics/scrubber.ts` | `scrub<T>(value): T` + `PII_PATTERNS` (7 種正規表現) + nested object 再帰 | (なし) | ~80 |
| `src/shared/analytics/scrubber.test.ts` | scrubber 単体テスト (UT-AN-SCRUB-01〜15) | vitest | ~120 |
| `src/shared/helpers/hash.ts` (既存確認 or 新規) | `sha256Hex(input: string): string` (Web Crypto SubtleCrypto) | (なし) | ~30 |

## 3. 削除ファイル一覧

なし。

## 4. マイグレーション要否

| 項目 | 要否 | 補足 |
|---|---|---|
| DB スキーマ変更 | ❌ | scrub は実行時関数、DB 変更なし |
| 既存データ変換 | ❌ | 既存データなし (実装着手前) |
| 設定ファイル変更 | ❌ | `.env` 変更なし (Sentry DSN は既存維持) |
| ストレージパス変更 | ❌ | — |

## 5. 実装 Phase 分割 (`/flow:tdd-phase` 連携)

> 本 revise は既存 `_shared/analytics/002_analytics_PLAN.md` の Phase 1-4 に対する増分。Phase 0.5 を新規追加。

### Phase 0.5 (新規): PII scrubber + sentry beforeSend
- **対象**: `scrubber.ts` 新規、`sentry.ts` (initSentry) を beforeSend/beforeBreadcrumb で拡張、`captureException` を scrub 経由に変更
- **ゴール**: PII を含む文字列を Sentry mock に投げて、event.message が全 mask 化されている
- **依存**: なし (Phase 1 cost.ts より前)
- **テスト**: UT-AN-SCRUB-01〜15 + UT-AN-SENTRY-01〜05 (UNIT_TEST §1 追加)

### Phase 3.5 (新規): Slack 通知 scrub 統合
- **対象**: `check-quota.ts` / `export-revenue.ts` で scrub 経由化
- **ゴール**: Slack mock server で受信した通知文に PII が含まれていない
- **依存**: Phase 0.5 完了 + Phase 3 check-quota 既存実装
- **テスト**: UT-AN-CHECKQUOTA-PII-01〜03 (UNIT_TEST §1 追加)

### Phase 1-4 (既存): cost.ts / matview / check-quota / Slack
- 変更なし (Phase 0.5 完了後に既存通り進行)

## 6. 依存関係順序

```mermaid
graph TD
  Helpers[helpers/hash.ts sha256Hex] --> Scrubber[scrubber.ts]
  Scrubber --> Sentry[sentry.ts initSentry/captureException]
  Scrubber --> CheckQuota[api/check-quota.ts Slack 通知]
  Scrubber --> ExportRevenue[api/export-revenue.ts Slack 通知]
  Sentry --> Account[account: analytics_opt_in トグル時の再 init]
  Sentry --> AuthSetup[_shared/auth: 初回 initSentry トリガ]
  Legal[legal SPEC: プラポリ §9.1 TODO] -.別 revise.-> LegalRevise[/flow:revise legal sentry-disclosure]
```

## 7. ロールアウト計画

| ステップ | 内容 | 期日 | 検証方法 |
|---|---|---|---|
| 1 | 本 revise 設計反映 (SPEC/PLAN/UNIT_TEST、本セッション) | 2026-05-23 | git commit ハッシュ |
| 2 | TDD 実装 (`/flow:tdd _shared/analytics`、Phase 0.5 → Phase 1-3 → Phase 3.5 → 4) | 後続 | `npm run test` (scrubber.test.ts pass) |
| 3 | mock Sentry server で event 検証 (E2E) | TDD 完了後 | E2E-AN-PII-01〜05 全て pass |
| 4 | プラポリ §9.1 追記 (`/flow:revise legal sentry-disclosure`) | α 公開前必須 | 法務レビュー pass |
| 5 | α 公開と同時に有効化 | SCENARIO §5 Phase 4 | Sentry dashboard で実 event を目視確認 (PII 混入ゼロ) |

## 8. リスク・注意点

- **scrub 漏れ = 法令違反リスク**: 7 パターンで網羅できないケース (例: 「seijiの電話番号は0312345678」のように区切りなしの数字) を α 運用で観測 → 漏れたパターンを追加する運用必須
- **regex の偽陽性**: 7 桁以上の連続数字を `<card>` 認定する誤検知が起こり得る (例: ISBN、商品コード)。alpha 運用で観測後にパターン調整
- **DNS 等の URL 内文字列**: e.g. `https://example.com/?user=seiji@example.com` 中の email を mask する → URL 構造を維持しつつ mask (本実装はクエリ内 email も検出)
- **performance**: 1 event 平均 2KB、scrub 処理は 7 × replace = 14 回程度の文字列走査、P95 < 5ms 維持。大量 breadcrumb (>100 件) の event でも < 50ms に収まる設計
- **opt-out 完全性**: `analytics_opt_in=false` で `Sentry.init` を完全 skip + 既存初期化済の場合は `Sentry.close()` で停止。残存 breadcrumb もクリア
- **Web Crypto SubtleCrypto**: フロント `sha256Hex` の実装に必要。ブラウザサポートは IE 以外問題なし、Vercel Function (Node 20) も globalThis.crypto で利用可

## 9. 完了の定義 (DoD)

- [ ] 本サブフォルダの 4 文書 (001-004) + INDEX が品質ゲート通過
- [ ] `_shared/analytics/001_analytics_SPEC.md` の §1 / §4 / §5 / §6 に本 revise 内容が反映 (TDD 着手前 or TDD Phase 0.5 で対応)
- [ ] `_shared/helpers/001_helpers_SPEC.md` に `sha256Hex` の責務追記 (既存ならスキップ)
- [ ] concept §8 [論点-014] の status 履歴に「revise 設計反映完了 (commit hash)」を追記、status は `dispatched-to-revise` 維持
- [ ] `_pending/sec_004_sentry_pii_scrub/` を `_pending_archive/` に移動 (revise 完了 signal)
- [ ] SCENARIO §5 cursor 更新 (次の推奨を `/flow:tdd` 連続実装に進行)
- [ ] 法務追加項目 (プラポリ §9.1 追記) を `docs/legal/INDEX.md` の TODO に追加

## 10. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub`) | /flow:revise |
