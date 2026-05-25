# AI_LOG セッション D20260525_058 — /flow:fix _shared/api handler-signature

**実行日時**: 2026-05-25 13:30 〜 14:05 (+09:00)
**コマンド**: /flow:fix (｜ /flow:auto D20260525_057 反復2 から dispatch)
**対象機能 + issue**: 横断 `_shared/api` / 001 vercel-handler-signature
**severity**: critical
**実行者**: Claude (Opus 4.7) + seiji
**状態**: 完了 (修正済 + 検証済)
**含まれる decision**: D20260525-061 〜 D20260525-068

---

## 主要決定サマリ（人間向け要約）

| ID | テーマ | 採用 | type |
|---|---|---|---|
| D20260525-061 | severity | critical (API 層全体が本番で hang) | auto-recommended |
| D20260525-062 | 再現可否 | 再現可 (vercel dev で決定的) | auto-recommended |
| D20260525-063〜065 | 5 Whys 根本原因 | unit が named helper のみ検証、Vercel 結合契約 (export 形) を未検証 | auto-recommended |
| D20260525-066 | 修正方針 | 23 handler を `export default { fetch: handler }` に機械変換 (本体不変) + vercel.json runtime 削除 | auto-recommended |
| D20260525-067 | regression | export-shape 契約テスト (`api/_handler-contract.test.ts`) を runtime import で追加、broken 形で fail を実証 | auto-recommended |
| D20260525-068 | 実装方針 | 確定済機械修正 + live 検証可のため /flow:fix 内で実装まで完遂 (別 /flow:tdd を起こさない) | auto-recommended |

## 根本原因 (5 Whys 要約)

全 23 `/api/*` handler が `export default async function handler(req: Request): Promise<Response>` (Vercel 非対応の素の default 関数形) を使用 → Vercel が Node `(req,res)` 形と誤認 → 返り Response を破棄 → **本番含め全 API hang**。865 unit が handler を直呼びせず named helper のみ検証 = プラットフォーム結合契約を検証する層が無く、型でも弾けず見逃した。

## 修正 + 検証結果

- **コード**: 23 handler を `{ fetch: handler }` 形へ変換 (本体不変、最小 diff) + `vercel.json` の無効 `functions.runtime: "nodejs20.x"` 削除 (engines.node が Node version 担保)
- **regression**: `api/_handler-contract.test.ts` 新規 — `import.meta.glob` で全 endpoint を runtime import、default が `{fetch}` (Web) or arity≥2 (Node) であることを assert。一時 broken file で「arity 1 → fail」を実証後に削除
- **検証**: typecheck exit 0 / `npm test` 865→**890 green** (+25 契約) / `vercel dev` で `/api/storage/upload-url` POST(no-auth) が **hang(HTTP000) → 401(1.6s)** に改善
- 対象外: `api/health.ts` (Node 形、動作中) は不変

## 依存関係
- 検出元: D20260525_056 (release Phase 2) / dispatch 元: D20260525_057 反復2
- depends_on: Phase 3.5 app/api bootstrap 系 (D20260524_049/050/051 の handler 量産)

## 生成・更新アーティファクト
- 新規: `docs/_shared/api/INDEX.md` + `fix_001_20260525_vercel-handler-signature/{README,000,001,002,003,004,INDEX}.md`
- コード: `api/**/*.ts` 23 handler + `api/_handler-contract.test.ts` + `vercel.json`
- 本 AI_LOG + INDEX 再生成

## 学習・改善
- 「外部プラットフォーム結合コードは実装テンプレ確定直後に runtime 1 回疎通」を再発防止策に登録 (Postmortem §8)。縦スライス検証 §1.5.8 の射程だった。

---

## Decisions

```yaml
- id: D20260525-061
  timestamp: 2026-05-25T13:30:00+09:00
  command: /flow:fix
  phase: Step 1.3 severity 推定
  question: 本バグの severity は?
  options: [critical, high, medium, low]
  recommended: critical
  chosen: critical
  chosen_type: auto-recommended
  depends_on: [D20260525-060]
  context: health 以外の全 API endpoint が本番で hang = API 層全滅。データ損失なしだが全機能停止級。

- id: D20260525-062
  timestamp: 2026-05-25T13:31:00+09:00
  command: /flow:fix
  phase: Step 2.1 再現可否
  question: 再現可否は?
  options: [再現可, 再現困難, 再現不可]
  recommended: 再現可
  chosen: 再現可
  chosen_type: auto-recommended
  depends_on: [D20260525-061]
  context: vercel dev で対象 endpoint を叩くと 100% hang、最小ハンドラ実験で決定的に再現。

- id: D20260525-063
  timestamp: 2026-05-25T13:40:00+09:00
  command: /flow:fix
  phase: Step 4.1 Why3
  question: なぜ Vercel が handler を Node (req,res) 形と誤認するか?
  chosen: default export が素の `export default function handler(...)` で、Vercel 対応形 (fetch object/named method/Node) のどれにも一致せずレガシー (req,res) にフォールバック解釈されるため
  chosen_type: auto-recommended
  depends_on: [D20260525-062]
  context: 公式 docs (node-js runtime, 2025-12-01) の対応形 3 種と照合。

- id: D20260525-064
  timestamp: 2026-05-25T13:41:00+09:00
  command: /flow:fix
  phase: Step 4.1 Why4
  question: なぜ非対応形で書かれたか?
  chosen: 「Web Request/Response を使う handler = export default async function handler(req: Request)」と誤解。Vercel 要求の default 形は `{ fetch(req) }` オブジェクトで、見た目が近く混同
  chosen_type: auto-recommended
  depends_on: [D20260525-063]

- id: D20260525-065
  timestamp: 2026-05-25T13:42:00+09:00
  command: /flow:fix
  phase: Step 4.1 Why5 (根本原因)
  question: なぜ実装〜865 test を通過して検出されなかったか?
  chosen: unit が handler default export を呼ばず named helper のみ import = Vercel 結合契約 (export 形) を検証する層が皆無。型も素の関数と fetch object を区別できず弾けない
  chosen_type: auto-recommended
  depends_on: [D20260525-064]
  context: 根本原因。regression は export 形そのものを検証する必要 (→ D20260525-067)。

- id: D20260525-066
  timestamp: 2026-05-25T13:50:00+09:00
  command: /flow:fix
  phase: Step 5 修正方針
  question: 23 handler の修正形は?
  options:
    - "`export default { fetch: handler }` (property 形、本体不変、最小 diff) (recommended)"
    - "`export default { async fetch(req){...} }` (method 形、本体 re-indent 要)"
    - 各 handler を Node (req,res) 形に書換 (本体大改修)
  recommended: "`export default { fetch: handler }`"
  chosen: "`export default { fetch: handler }`"
  chosen_type: auto-recommended
  depends_on: [D20260525-065]
  context: property 形が vercel dev で 200 を実証済。本体・helper・config 不変で最小 diff。vercel.json runtime 無効値も併せて削除。

- id: D20260525-067
  timestamp: 2026-05-25T13:55:00+09:00
  command: /flow:fix
  phase: Step 6 regression
  question: 再発防止テストの形は?
  chosen: import.meta.glob で全 endpoint を runtime import し default が {fetch} or arity>=2 であることを assert (`api/_handler-contract.test.ts`)。新規 endpoint も自動的に検査対象
  chosen_type: auto-recommended
  depends_on: [D20260525-065]
  context: broken 形 (arity1) で fail することを一時 file で実証 → 修正後 25 green。型で弾けない契約をテストで強制。

- id: D20260525-068
  timestamp: 2026-05-25T14:00:00+09:00
  command: /flow:fix
  phase: Step 5/実装
  question: /flow:fix 内で実装まで行うか、docs のみで /flow:tdd に渡すか?
  options:
    - /flow:fix 内で実装完遂 (機械的・確定済・live 検証可) (recommended)
    - docs のみ生成し /flow:tdd で実装
  recommended: /flow:fix 内で実装完遂
  chosen: /flow:fix 内で実装完遂
  chosen_type: auto-recommended
  depends_on: [D20260525-066]
  context: 根本原因確定 + 機械的変換 + vercel dev で即 live 検証可能なため、別 skill cycle を起こすより効率的。890 green + 401 応答で検証済。
```
