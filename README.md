# hana-memo / 植物の名前わかるんメモ

> 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA。

「自分の発見ノート」を主役に、AI 同定はそれを支える脇役。SNS 機能・ランキング・他人との比較は意図的に入れず、自分のペースの発見体験に振り切っている。

## 概要

散歩・通勤・園芸の途中で見つけた草花を 1 タップで撮影 → AI (OpenAI Vision) が植物名を 1〜3 候補で提示 → ユーザーが選択 / 訂正 / 「分からないまま保存」できる。蓄積した発見はタイムライン / 地図 / 図鑑モードで振り返れ、月次・季節別の発見ノートとして育っていく。

- **ユーザー**: 散歩 / 通勤 / 園芸が日常にある人、子供の自然学習をしたい親、植物初心者
- **現フェーズ**: MVP 実装中 (Phase 3.5 app/api bootstrap)

## 主要機能

| 機能 | 概要 |
|---|---|
| capture | 撮影 → AI 同定 → 保存の中核フロー (UC1) |
| notebook | ノート閲覧 (タイムライン / 地図 / 図鑑モード) (UC2) |
| export | 図鑑 PDF 出力 (UC3、PWYW 課金) |
| memory | 季節レコメンド「去年の今頃」(UC5) |
| billing | PWYW + content-unlock 課金 |
| account | サインアップ / ログイン / 設定 / オプトアウト |
| legal | プラポリ / 利用規約 / 特商法表記 / 同意 UI |

横断基盤: `_shared/{db, types, helpers, analytics, auth, storage, ai}`

## 技術スタック

- **フロント**: Vite + React + TypeScript + Tailwind CSS + vite-plugin-pwa
- **DB**: Neon Postgres + Drizzle ORM
- **認証**: Clerk (Guest Users β + Google OAuth Linking)
- **Storage**: Cloudflare R2 (S3 互換、Presigned URL)
- **Functions**: Vercel Functions (Node 20)
- **AI**: OpenAI gpt-4o-mini Vision (Vercel Function 経由)
- **課金**: Stripe Checkout + Webhook
- **監視**: Sentry (opt-in、PII scrub) / Rate Limit: Upstash

## 開発

```bash
nvm use                       # Node 20
npm install
cp .env.example .env.local    # 値を埋める (取得手順は docs/PREREQUISITES.md)
./scripts/dev.sh              # .env.local チェック → DB ping → vercel dev → smoke
# または
npm run dev                   # フロントのみ (Vite)
```

| コマンド | 用途 |
|---|---|
| `npm run dev` | Vite dev サーバ |
| `npm run build` | typecheck + 本番ビルド (dist/) |
| `npm test` / `npm run test:coverage` | Vitest (one-shot / カバレッジ) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle マイグレーション / GUI |

## 開発状態

- 設計 (Phase 1-2): 14 対象すべて完了 (機能 7 + 横断 7)
- 実装 (Phase 3): **コア 14/14 完遂** (UI/SDK 非依存ロジック、Vitest 373 green)
- Phase 3.5 app/api bootstrap: 進行中 (フロント shell + dev 起動スクリプト = 完了、SDK glue wiring = 次)

## 設計ドキュメント

- [全体概念・要件・設計](./docs/concept.md) — プロジェクト中央書類 (`/flow:concept` で生成・更新)
- [開発シナリオ](./docs/SCENARIO.md) — next-step 判断用ナラティブ
- [機能フォルダ INDEX](./docs/INDEX.md) — 全機能 + 横断フォルダのリスト
- [AI 用エントリポイント](./docs/DOC_MAP.md) — 目的別アクセスガイド
- [実装前準備チェックリスト](./docs/PREREQUISITES.md) — API キー / アカウント / 法務書類

## ライセンス

All Rights Reserved (公開前、ライセンス未確定)
