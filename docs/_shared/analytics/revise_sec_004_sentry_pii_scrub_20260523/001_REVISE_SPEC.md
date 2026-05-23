# _shared/analytics 変更仕様書 (Sentry beforeSend PII スクラブ実装)

> **改修種別**: 機能拡張 (セキュリティ + 法令対応)
> **issue / slug**: sec_004_sentry_pii_scrub
> **基準 SPEC**: [../001_analytics_SPEC.md](../001_analytics_SPEC.md)
> **最終更新**: 2026-05-23
> **タグ**: cross-cutting / analytics / auth-required (opt-in) / **security** / **legal-required (個人情報保護法)**

---

## 1. 変更概要

[SEC-004] Sentry に送信される event.message / breadcrumb / Slack 通知文に email / 緯度経度 / Stripe id / Clerk session token 等の PII が混入することを **`scrub<T>(value)` 共通関数 + Sentry `beforeSend` / `beforeBreadcrumb` フック + Slack 通知への適用** で防ぐ。個人情報保護法対応の核となる改修 (legal_required=true)。

---

## 2. 変更前 vs 変更後

### 2.1 UC 変更

| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| エラー監視 (Sentry 経由) | error.message に PII (email, lat/lng, Stripe id) がそのまま流れる可能性 | scrub 関数で全 PII を mask → Sentry に送信 | 委託先漏洩リスク回避 (個人情報保護法) |
| 無料枠超過アラート (Slack 通知) | 通知文中の user.email がプレーンで Slack に流れる | scrub 関数で `***@***` 化、もしくは集計サマリのみ送信 | 同上 |

### 2.2 入出力変更

| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `initSentry(user, opts)` | `Sentry.init({ dsn })` のみ | `Sentry.init({ dsn, beforeSend, beforeBreadcrumb, initialScope })` に拡張 | ✅ 後方互換 (内部実装変更) |
| `captureException(err, context)` | err / context をそのまま Sentry へ | `scrub(err)` `scrub(context)` を経由 | ✅ 内部変更のみ |
| Slack Webhook 通知 (`check-quota`, `export-revenue`) | テキストをそのまま POST | `scrub(text)` を経由してから POST | ✅ 内部変更のみ |
| `_shared/analytics/scrubber.ts` (新規) | **未存在** | `scrub<T>(value): T` + 7 パターン正規表現 + nested object 再帰対応 | ✅ 新規追加 |

### 2.3 データモデル変更

| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| (なし) | scrub は実行時の関数、データ保存なし | — |

### 2.4 バリデーション・エラー変更

| 対象 | 変更前 | 変更後 |
|---|---|---|
| `initSentry` 入力チェック (§4.1) | dsn 形式 (既存) | 同上 + `analytics_opt_in=false` なら init 完全 skip (PII 流出ゼロ保証) |
| `scrub` 引数チェック (新規) | — | 任意の値を受け取り、null/undefined は素通し、文字列/オブジェクト/配列は再帰スクラブ |

---

## 3. 影響範囲

| 対象 | 影響度 (高/中/低) | 説明 |
|---|---|---|
| `_shared/analytics` (本機能) | **高** | sentry.ts / cost.ts / scrubber.ts (新規) / check-quota.ts (Vercel Function) に組込 |
| `_shared/auth` | 低 | initSentry を呼ぶ起点、引数変更なし |
| `account` | 低 | analytics_opt_in トグル → initSentry 再呼出、引数変更なし |
| `billing` | 低 | export-revenue.ts (Slack 通知) に scrub 適用 |
| `legal` | **高** | プラポリ §9.1 に「Sentry エラー追跡委託先利用、PII はスクラブ後送信」明記が必要 |

---

## 4. 後方互換性

- **互換維持**: ✅ (関数シグネチャ変わらず、内部実装の厳格化のみ)
- 既存呼出元 (`_shared/auth`, `account`, `_shared/ai`) は変更不要

---

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (実装着手前、scrubber.ts 削除 + sentry.ts/cost.ts/check-quota.ts を旧版に戻すのみ)
- **DB マイグレーションのロールバック**: 不要 (DB 変更なし)
- **手順**: 旧 commit へ git revert、Sentry SDK 設定を `beforeSend` なしに戻す

> ⚠️ ロールバックは **法令違反リスクを伴う**ため、特別な理由 (本実装にクリティカルバグ等) がない限り実施不可

---

## 6. リリース戦略

- **方式**: 一括 (実装着手前のため TDD と同時、初回 α 公開と同時に有効化)
- **フィーチャーフラグ**: 不要 (PII スクラブは常時 ON、opt-out は `analytics_opt_in=false` 経由で Sentry 完全 OFF を意味する)
- **ロールアウト計画**:
  1. 設計反映 (本セッション): 2026-05-23
  2. TDD 実装: 後続 `/flow:tdd _shared/analytics` セッション
  3. 法務確認: プラポリ §9.1 への追記とレビュー (α 公開前必須)
  4. α 公開: SCENARIO §5 Phase 4 (期限未定、本論点解消が前提条件)

---

## 7. 詳細仕様 (新仕様)

### 7.1 詳細 UC (新仕様)

#### UC: PII を含むエラーの Sentry 安全送信 (新規)

- **アクター**: opt-in user (analytics_opt_in=true)
- **前提**: Sentry 初期化済
- **メインフロー**:
  1. アプリ内でエラー発生 (例: `Error("Invalid email: seiji@example.com")`)
  2. `captureException(err)` が呼ばれる
  3. `beforeSend(event)` フックで `scrub(event)` を実行
  4. event 内の文字列フィールドを全て再帰スクラブ (`event.message`, `event.exception.values[*].value`, `event.breadcrumbs[*]`, `event.request.headers`, `event.tags`)
  5. PII を `***@***` `<coord>` `<stripe_id>` 等の mask 文字列に置換
  6. Sentry に POST
- **NFR**: scrub 処理は P95 < 5ms (event 平均サイズ 2KB)、Sentry 送信レイテンシに影響しない

#### UC: Slack 通知の PII スクラブ (新規)

- **アクター**: Vercel Cron (`check-quota`, `export-revenue`)
- **メインフロー**:
  1. Cron が user.email 等を含む通知文を組み立て
  2. `scrub(text)` を経由
  3. Slack Webhook に POST
- **代替策**: 集計サマリのみ送信 (個別 user 名を載せない) を default として、PII スクラブは defense-in-depth

### 7.2 入出力 (新仕様)

#### `_shared/analytics/scrubber.ts` (新規)

```ts
export const PII_PATTERNS: { re: RegExp; mask: string }[] = [
  { re: /\b[\w.+-]+@[\w.-]+\.\w+\b/gi, mask: '***@***' },
  { re: /\b-?\d{1,3}\.\d{4,}\b/g, mask: '<coord>' },
  { re: /\b(cus|pi|cs|sub|in)_[A-Za-z0-9]+\b/g, mask: '<stripe_id>' },
  { re: /\bsess_[A-Za-z0-9_-]+\b/g, mask: '<clerk_session>' },
  { re: /\buser_[A-Za-z0-9]+\b/g, mask: '<clerk_uid>' },
  { re: /\b\d{3,4}-?\d{4}-?\d{4,}-?\d{4}\b/g, mask: '<card>' },
  { re: /\b0\d{1,4}-?\d{1,4}-?\d{4}\b/g, mask: '<phone-jp>' },
];

export function scrub<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') {
    let s = value;
    for (const { re, mask } of PII_PATTERNS) s = s.replace(re, mask);
    return s as T;
  }
  if (Array.isArray(value)) return value.map(scrub) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrub(v);
    return out as T;
  }
  return value;
}
```

#### `_shared/analytics/sentry.ts` (改修)

```ts
import * as Sentry from '@sentry/browser';
import { scrub } from './scrubber';
import { sha256Hex } from '../helpers/hash';

export function initSentry(user: User, opts: { dsn: string }) {
  if (!user.settings.analytics_opt_in) return;  // opt-out なら完全 OFF
  Sentry.init({
    dsn: opts.dsn,
    beforeSend(event) { return scrub(event); },
    beforeBreadcrumb(crumb) { return scrub(crumb); },
    initialScope: { user: { id: sha256Hex(user.id) } },  // Clerk uid hash 化済
  });
}

export function captureException(err: Error, context?: Record<string, unknown>) {
  Sentry.captureException(scrub(err), scrub(context) ? { extra: scrub(context) } : undefined);
}
```

#### `api/check-quota.ts`, `api/export-revenue.ts` (Vercel Cron、改修)

```ts
import { scrub } from '../src/shared/analytics/scrubber';

// 通知本文を組み立てた直後に scrub を必ず経由
const safeText = scrub(rawText);
await fetch(process.env.SLACK_QUOTA_WEBHOOK_URL!, {
  method: 'POST',
  body: JSON.stringify({ text: safeText }),
});
```

### 7.3 データモデル (新仕様)

(変更なし、scrub は実行時関数)

### 7.4 バリデーション・エラー (新仕様)

| ID | 条件 | 対応 |
|---|---|---|
| E-AN-005 (新規) | scrub 内で例外発生 (想定外の入力) | fallback: 元の値を返す + `console.warn` (本処理を止めない、ただし PII 漏れリスクあり → Sentry に Sentry 自身で warn alert) |
| E-AN-006 (新規) | `beforeSend` 経由で `null` を返す event (= Sentry 送信スキップ) | scrub 後に必要なフィールドが消えるケースは想定しない (mask 置換のみで構造は保持) |

### 7.5 機能固有 NFR + 既存連携 (新仕様)

| 項目 | 目標値 | 根拠 |
|---|---|---|
| `scrub` 処理時間 (P95) | < 5ms (event 平均 2KB) | UX (Sentry 送信レイテンシに影響しない) |
| Sentry 送信前 PII 検出率 | 100% (7 パターン全件) | 法令対応 (個人情報保護法) |
| Slack 通知前 PII 検出率 | 100% | 同上 |
| opt-out 動作 | `analytics_opt_in=false` で Sentry init 完全 skip | データ最小化原則 |

#### 既存連携 (追加分)

| 連携先 | 種別 | 依存内容 |
|---|---|---|
| `_shared/helpers/hash` | SHA-256 関数呼出 | Clerk uid hash 化 (既存維持) |
| `legal` (プラポリ) | プラポリ §9.1 への記載連携 | 「Sentry エラー追跡委託先利用、PII はスクラブ後送信」明記、α 公開前必須 |

---

## 8. タグ別追加項目

### 8.1 認可 (auth-required) — 既存維持

- initSentry は `analytics_opt_in=true` の user のみ実行 (既存)
- 匿名 user は OFF default (既存、§5.1 NFR で再確認)

### 8.2 security (新規タグ)

- L1 設計レビュー対応: [SEC-004] の SPEC 反映完了
- L2 実装前チェック: [../902_analytics_IMPL_SECURITY_CHECKLIST.md](../902_analytics_IMPL_SECURITY_CHECKLIST.md) §1 (Sentry beforeSend) を TDD 着手時に手元に置く

### 8.3 legal-required (新規タグ、個人情報保護法)

- 漏洩時の委託先漏洩扱い回避が必須要件
- プラポリ §9.1 への追記が法務上の必須対応 (α 公開前完了)
- 開示請求時に「Sentry に過去 90 日以内に送信されたデータ」を返答できる仕組み (Sentry SDK 経由でエクスポート可能、運用文書化推奨)

---

## 9. 未決事項

> 本 revise セッション起因の論点はなし。SEC-004 の対策方針 (案 A) は §8 [論点-014] で確定済。
>
> 関連:
> - [論点-014] [SEC-004] Sentry PII スクラブ: 本 SPEC 反映により設計レベル消化、TDD 実装後に status=closed
> - プラポリ §9.1 追記は `/flow:revise legal` で別途対応推奨 (本 revise の範囲外、α 公開前必須)

---

## 10. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-23 | 初版作成 (`/flow:revise _shared/analytics --resume sec_004_sentry_pii_scrub`) | /flow:revise |
