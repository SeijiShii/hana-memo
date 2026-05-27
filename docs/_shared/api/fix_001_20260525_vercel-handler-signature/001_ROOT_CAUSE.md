# 根本原因分析: Vercel handler-signature バグ

> **入力**: `./000_調査レポート.md` + 公式 docs + ローカル決定的実験
> **最終更新**: 2026-05-25

---

## 1. 5 Whys

| # | 問い | 答え |
|---|---|---|
| Why 1 | なぜ全エンドポイントが hang するか? | handler が返した `Response` が Vercel から送出されず、リクエストが完了 signal を受け取れないため。 |
| Why 2 | なぜ返した Response が送出されないか? | Vercel が handler を **Node `(req, res)` 形**として呼び出している (= 返り値を見ず `res.end()` を待つ)。handler は `res` を一切触らないので永久に未完了。 |
| Why 3 | なぜ Vercel が Node 形と誤認するか? | default export が `export default function handler(...)` (素の関数) であり、Vercel の対応形 (fetch object / named method export / Node (req,res)) のどれにも一致しないため、レガシーな `(req,res)` 形にフォールバック解釈される。 |
| Why 4 | なぜ非対応の形で書かれたか? | 実装時に「Web Request/Response を使う Vercel handler = `export default async function handler(req: Request): Promise<Response>`」と誤解。Vercel が要求する default 形は **`export default { fetch(req) }` (オブジェクト)** であって、素の default 関数ではない。両者は見た目が近く混同しやすい。 |
| Why 5 | なぜ実装〜865 test を通過して検出されなかったか (根本原因)? | **unit test が handler の default export を実際に呼ばず、named helper (`parseUploadUrlBody` 等) だけを import してテストしていた**。= Vercel の「実 invocation contract (default export の形)」を検証する層が存在せず、型チェックも通る (素の関数も `(req: Request)=>Promise<Response>` として型整合) ため、誤った形がそのまま 23 file に量産・固定化された。 |

**根本原因**: テストが「純関数ロジック」だけを検証し、**プラットフォーム (Vercel) との結合契約 = handler export の形**を一度も検証していなかった。型システムもこの契約を強制しない (素の関数も fetch object もコンパイルが通る)。

## 2. 直接原因

| ファイル | 行 | 問題 |
|---|---|---|
| `api/**/*.ts` の 23 handler | default export 行 | `export default async function handler(req: Request): Promise<Response>` (素の default 関数) = Vercel 非対応形 |

(`api/health.ts` のみ Node `(req,res)` 形で偶然動作していた。)

## 3. 根本原因 (詳細)

Vercel Node.js runtime の対応 default-export 形は公式に 3 種 (https://vercel.com/docs/functions/runtimes/node-js, 2025-12-01):
1. `export default { fetch(req: Request): Response }` — fetch Web Standard export
2. `export function GET/POST(req: Request)` — named method export
3. `export default (req: VercelRequest, res: VercelResponse) => void` — Node legacy

`export default function handler(req: Request): Response` は **どれでもない**。Vercel は (3) と解釈し IncomingMessage を渡す + 返り値 Response を破棄 → hang。

## 4. 寄与要因

| 種別 | 内容 |
|---|---|
| **テスト不足** | handler の default export を呼ぶ統合/契約テストが皆無。named helper のみ検証 (最大の寄与要因)。 |
| 型システムの非強制 | 素の関数も fetch object も `tsc` を通る。型では誤形を弾けない。 |
| 量産テンプレ | Phase 3.5 で同一の誤テンプレを 23 file に複製 → 単一誤りが全 API に伝播。 |
| ローカル runtime 検証の遅延 | `vercel dev` での実起動検証が release 直前まで未実施 (headless unit のみで「動く」と判断していた)。 |

## 5. 仮説と検証

| 仮説 | 検証方法 | 結果 |
|---|---|---|
| 素の default 関数形が原因 | 無 import の最小 `export default function(req)` を vercel dev で叩く | HANG → 確定 |
| fetch object 形なら動く | 最小 `export default { fetch }` を叩く | 200 → 確定 |
| `{ fetch: 名前付き関数 }` でも動く (最小 diff 修正の妥当性) | property 形を叩く | 200 → 確定 |
| 本番でも同様 (vercel dev 固有でない) | 公式 docs の対応形リストと照合 | 素の default 関数は非対応形 → 本番でも hang と判断 |

## 6. 更新履歴

| 日付 | 変更 | 実行者 |
|---|---|---|
| 2026-05-25 | 初版 | /flow:fix |
