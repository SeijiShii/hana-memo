# hana-memo / 植物の名前わかるんメモ

> **一行で言うと**: 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA。

| 項目 | 内容 |
|---|---|
| ユーザー | 直接 = 最終読者 = 散歩 / 通勤 / 園芸が日常にある人。副次: 子供の自然学習をしたい親、植物初心者 |
| 解決する課題 | 散歩中に見つけた草花の名前を調べないまま忘れる / 既存アプリは「同定」が主役で「自分のノート」が脇役 |
| 提供価値 | 「自分の発見ノート」を主役、AI 同定はそれを支える脇役。SNS 機能・競争・中毒性を排した自分のペースの発見体験 |
| 現フェーズ | 企画 → MVP 設計中 |
| 最終更新 | 2026-05-25 |

---

## 1. プロダクト概要

散歩・通勤・園芸の途中で見つけた草花を 1 タップで撮影 → AI (OpenAI Vision) が植物名を 1〜3 候補で提示 → ユーザーが選択 or 訂正 or「分からないまま保存」できる PWA。蓄積された発見はタイムライン / 地図 / 図鑑モードで振り返れ、月次・季節別の植物発見ノートとして育っていく。

既存代替手段 (PictureThis / GreenSnap / Google Lens / iNaturalist) は「同定機能」や「SNS コミュニティ」が主役で「自分のノート」が脇役だが、本サービスは「自分の発見ノートが主役、AI 同定はそれを支える脇役」という設計反転で空白を埋める。SNS・ランキング・他人との比較は意図的に入れない。

### 1.1 主要ユースケース
1. **UC1 発見の記録**: 散歩中に草花を撮影 → AI が名前を 1-3 候補で提示 → ユーザーが選択 / 訂正 / 「分からないまま保存」も可
2. **UC2 ノートを見返す**: 月次 / 季節別 / 場所別に記録を振り返り (タイムライン / 地図 / 図鑑モード)
3. ~~**UC3 図鑑化**: 蓄積した発見を PDF 図鑑として書き出し (PWYW 課金で高解像度・カスタムレイアウト)~~ **(撤去: billing revise_001、2026-05-26 — PDF エクスポート / PWYW / pdf_unlock を全廃。課金は AI クレジット ¥100=10回 のみ)**
4. **UC4 親子学習**: 親子で散歩しながら撮影、家に帰って一緒に名前を確認 (教育用途)
5. **UC5 季節レコメンド**: 「去年の今頃に見た花」を自動レコメンド (年比較)

### 1.2 スコープ
**含むもの**:
- 撮影 → AI 同定 → 保存の中核フロー
- 個人のノート閲覧 (タイムライン / 地図 / 図鑑)
- ~~図鑑 PDF 出力 (PWYW)~~ (撤去: billing revise_001、2026-05-26)
- 季節レコメンド (アプリ内バッジ)
- **認証**: 起動時に Clerk Guest Users (β) で自動 UUID 発行 → 撮影・保存・無料枠まで匿名で完結。「他端末で見たい」「課金したい」となった時に Google OAuth で**後リンク** (linkIdentity、同 uid 維持) して永続化
- 法務書類 (プラポリ / 利用規約 / 特商法表記)

**含まないもの（明示除外）**:
- SNS 機能 (フォロー / いいね / コメント / 公開タイムライン)
- ランキング / 他人との比較
- 共有は任意 (デフォルト OFF、明示操作のみ)
- 学術投稿連携 (iNaturalist 等)
- プッシュ通知乱発 (UC5 季節レコメンドはアプリ内バッジのみ)
- リアルタイムコラボ機能 (single-user 個人ノート)

### 1.3 ドキュメントフォルダ分割設計

> **重要**: ここで設計するのは `docs/` 配下の**ドキュメント置き場**の構造であって、実装コード (`src/`) の構造ではない。

#### 1.3.1 機能フォルダ（業務ドメイン別）

| フォルダ | 含む機能 | 担当する画面 / API | 依存 | 優先度 | 基盤 |
|---|---|---|---|---|---|
| `docs/account/` | サインアップ / ログイン / 設定 / オプトアウト管理 | サインアップ画面・ログイン画面・設定画面 | `_shared/auth` | 3 | ❌ |
| `docs/capture/` | 撮影 → AI 同定 → 保存の中核フロー (UC1) | カメラ画面・同定結果画面・保存ダイアログ | `_shared/storage`, `_shared/ai`, `_shared/db`, `account` | 4 | ❌ |
| `docs/notebook/` | ノート閲覧 (タイムライン / 地図 / 図鑑モード) (UC2) | タイムライン画面・地図画面・図鑑画面・詳細画面 | `_shared/db`, `_shared/storage`, `account` | 4 | ❌ |
| ~~`docs/export/`~~ | ~~図鑑 PDF 出力 (UC3)~~ **(撤去: billing revise_001、2026-05-26 — 機能全廃。export→billing 依存も解消)** | — | — | — | ❌ |
| `docs/memory/` | 季節レコメンド「去年の今頃」(UC5) | アプリ内バッジ・レコメンドフィード | `notebook` | 5 | ❌ |
| `docs/billing/` | 低価格単発課金 (AI 同定追加枠 ¥100=10回、ゲスト可) | 課金画面 | `_shared/ai` (使用量参照) | 4 | ❌ |
| `docs/legal/` | プラポリ / 利用規約 / 特商法表記 / 同意 UI / Cookie バナー | `/legal/*` 配下静的ページ・同意 UI | (なし) | 1 | ❌ |

#### 1.3.2 横断フォルダ（機能をまたぐ技術設計）

| フォルダ | 責務 | 含む設計 | 依存 | 優先度 | 基盤 |
|---|---|---|---|---|---|
| `docs/_shared/db/` | DB スキーマ・マイグレーション・認可ポリシー | テーブル定義 (users / plants / discoveries / images / api_usage) / インデックス / Drizzle クエリ層認可 (`where user_id = ctx.userId`、Postgres RLS は補助) | (なし) | 1 | ✅ |
| `docs/_shared/types/` | TypeScript 共通型 | DTO / Drizzle スキーマ由来型 / API 入出力型 | (なし) | 1 | ✅ |
| `docs/_shared/helpers/` | ヘルパ・ユーティリティ | 日付処理 / 画像 WebP 変換 / EXIF 削除 / 位置情報丸め | (なし) | 1 | ✅ |
| `docs/_shared/analytics/` | 計測基盤 (Sentry + 自前コストログ) | エラー報告 / OpenAI API call ログ / コスト集計 / .env 単価管理 | (なし) | 1 | ✅ |
| `docs/_shared/auth/` | 認証・認可基盤 | Clerk ラッパ (Guest Users β + OAuth Linking) / セッション管理 / JWT → ctx.userId | `_shared/db` | 2 | ✅ |
| `docs/_shared/storage/` | ストレージ | Cloudflare R2 (S3 互換) ラッパ / 画像アップロード / private bucket / Presigned URL | `_shared/db` | 2 | ✅ |
| `docs/_shared/ai/` | AI クライアント | OpenAI Vision クライアント / プロンプト構築 (位置・季節・履歴注入) / 出力後処理 / フォールバック | `_shared/types`, `_shared/analytics` | 2 | ✅ |

#### 1.3.3 依存・優先度・基盤の定義

- 優先度は依存関係から自動算出された **topological sort 順**
- 優先度 1 = 依存なし（基盤の基盤）
- 横断は全て基盤扱い（✅）、機能は他機能から多く参照されない設計 (single-user ツールのため疎結合) のため基盤フラグなし
- **循環依存なし**（topological sort 確認済み）

#### 1.3.4 命名規約
- 機能フォルダ: ケバブケース業務名（例: `capture`, `notebook`）
- 横断フォルダ: `_shared/<技術領域>/`（`_` 接頭辞で機能と視覚的に区別）

### 1.4 実装コードフォルダ構成（たたき台）

> Q11 + BaaS Pivot (D20260522-114) で Vite + React + TypeScript + Neon (Drizzle) + Clerk + Cloudflare R2 + Vercel Functions を確定したため、フロント SPA + サーバーレス関数テンプレートを採用。
> 既に実装が進行中 (Phase 3.5) のため、以下は**実装済み構成に追随**したもの。**機能境界の名前は §1.3 機能フォルダと揃える**。

```
src/
  app/                # ルート統合・AppShell・Provider・Container (実 hook/SDK 配線)
  features/           # 機能単位（§1.3.1 と命名統一、各 pages/ + components/）
    account/ capture/ notebook/ memory/ billing/ legal/   # (export は billing revise_001 で全廃)
  shared/             # 横断（§1.3.2 と命名統一）
    db/               # Drizzle スキーマ + Neon クライアント
    types/            # 共通型 (Drizzle スキーマ由来 + DTO)
    helpers/          # 画像変換 / EXIF / 位置丸め / 日付 / URL guard
    analytics/        # Sentry (beforeSend scrub) + コストログ
    auth/             # Clerk ラッパ (Guest Users β + OAuth Linking)
    storage/          # Cloudflare R2 (S3 互換) ラッパ
    ai/               # OpenAI Vision クライアント + rate limit
  components/         # 共通 UI 部品 (shadcn/ui ベース) + illustrations/
  lib/                # cn 等 UI ユーティリティ
  main.tsx / App.tsx
api/                  # Vercel Functions (Node、group catch-all 統合 24→11、Hobby 12-fn 上限対応)
  _lib/               # 共通 router (createGroupRouter) + clerk / ratelimit / cron / user
  health.ts           # smoke
  <group>/[...path].ts + <group>/_handlers/*   # 9 群: storage/billing/capture/notebook/auth/cron/legal/account/memory (export 群は撤去)
drizzle/              # Drizzle migration (旧 supabase/migrations 相当)
  migrations/         # drizzle-kit generate 出力 SQL
drizzle.config.ts
e2e/                  # Playwright E2E
scripts/              # dev.sh (O36 launcher)
public/               # PWA manifest / icons
```

機能名は §1.3 と意味として揃える（命名形式は TypeScript 慣習に従いケバブ）。

---

## 2. 前提条件・制約

- **業務前提**:
  - 個人開発、seiji 単独
  - α 公開は招待制 (口コミ広がり想定)
  - SNS 機能は意図的に入れない (charter §2.2 競争・中毒性回避)
- **技術制約**:
  - Neon 無料枠厳守 (DB 0.5GB×10 / コンピュート 191.9h/月) + Cloudflare R2 (Storage 10GB、エグレス無料) + Clerk (10K MAU)
  - Vercel Hobby 無料枠厳守 (帯域 100GB/月)
  - OpenAI API のみ従量課金 (gpt-4o-mini Vision、ユーザー月 10 回無料、超過は content-unlock 課金で吸収)
- **体制・予算・納期**:
  - seiji 単独 / 初期 $0 / 運用月額 $0-30 (DAU 30-300 想定) / MVP 1-2 ヶ月、α 公開 2 ヶ月以内

---

## 3. 非機能要件

> **2026-05-22 更新**: BaaS Pivot により Supabase 表現を Neon スタックに置換。E2E 自動化方針 (perspectives O33) 追記。

| 項目 | 目標値 | 根拠 |
|---|---|---|
| 性能 | 撮影 → AI 同定 → 結果表示まで 5 秒以内 (P95) | UX 体感許容、wants.md 確定 |
| 可用性 | SLA なし、Neon / Vercel / Clerk / R2 標準稼働 | 個人開発、SLA 提供は不可能 |
| セキュリティ | 画像は Cloudflare R2 の private bucket、Vercel Function で Clerk JWT 検証 + objectKey ownership 検証 → 60 分 Presigned URL 発行。DB は Drizzle クエリ層で `user_id = ctx.userId` を必ず強制 | 個人写真の流出防止 |
| プライバシー | 位置情報は default OFF、ON 時は ~100m 丸めをデフォルト、共有時は EXIF 削除 | 散歩ルート特定リスク回避、個人情報保護法対応 |
| 起動摩擦 | 初回起動 → 撮影まで 0 タップの認証 (Clerk Guest Users β で自動 sign-in) | charter §1.1「無料で触り始められる」適合、気軽さ最優先 |
| データ永続性 | 匿名のままだとブラウザストレージクリア / 機種変更でデータ消失リスクあり → アプリ内で「リンク推奨」バナー表示 | 匿名スタートのトレードオフを UI で明示 |
| 運用・監視 | Sentry 無料枠でエラー監視 (opt-in)、自前コストログで OpenAI 使用量を日次集計、Neon / R2 / Clerk / Vercel 無料枠超過アラート (80% / 100% / 120% で Slack 通知) | 個人運用で破綻しない最小構成 |
| **E2E テスト自動化** (perspectives O33) | **全 E2E シナリオを Playwright で自動化**。人力は「自動化で代替不可」(デバイス触感 / 視覚微差 / 本番前最終 / 法務文面目視) のみ例外。CI: critical-path は PR ごと、nightly でフル E2E | 工数膨張回避 + リリース後デグレ早期検知 |
| AI 同定精度 | gpt-4o-mini Vision で「日本の散歩で見かける一般的な植物」を上位 1 候補で 70%、上位 3 候補で 85% を目標 (運用検証で調整) | 既存サービス比較から仮置き、PoC で精度測定し閾値再設定 |
| AI コスト上限 | DAU 300 までは月額 $30 以内 (ユーザー月 10 回無料 + 超過は課金で回収) | 無料枠厳守ポリシー、課金で AI コストを吸収する設計 |
| スケール上限 | DAU 300 で Neon Free (0.5GB×10 DB + 191.9h コンピュート) 到達想定 → Launch ($19/月) 移行ポイント | wants.md データ規模感 + Neon 無料枠から算出 |

---

## 4. 全体アーキテクチャ

> **2026-05-22 更新**: BaaS スタックを charter §0 デフォルト (Neon + Vercel + Clerk + Cloudflare R2 + Drizzle) に切替。Supabase 廃止 (D20260522-114)。

```
[Browser PWA]
   ├─ Vite + React + TS + Tailwind + shadcn/ui
   ├─ vite-plugin-pwa (Service Worker + offline cache)
   ├─ 画像取得 (camera API) → WebP 変換 + EXIF 削除 → リサイズ
   ├─ Clerk SDK (Guest Users β + OAuth Linking)
   │
   ├──→ [Vercel] (ホスティング + Functions)
   │      ├─ Frontend SPA 配信 (Hobby 無料枠)
   │      ├─ Vercel Functions (Node 20): identify-plant / stripe-webhook / export-revenue / check-quota / purge-deleted-users / storage upload-url & signed-url / clerk-webhook
   │      └─ Vercel Cron: 日次集計 / 月次収益 / purge cron
   │
   ├──→ [Neon] (Postgres、サービス専用 DB)
   │      ├─ PostgreSQL (users / discoveries / plants / images / api_usage / billing_unlocks / consent_logs / discovery_edits / user_settings)
   │      ├─ Drizzle ORM (drizzle-kit で migration 自動生成)
   │      └─ 行アクセス制御は Drizzle クエリ層で `where user_id = ctx.userId` を強制 (Clerk uid を Vercel Function に渡す)
   │
   ├──→ [Clerk] (Auth)
   │      ├─ Guest Users (β、匿名 sign-in 相当)
   │      ├─ Google OAuth Linking (linkIdentity、同 uid 維持)
   │      └─ Webhook → Vercel Function → Neon users テーブル同期
   │
   ├──→ [Cloudflare R2] (Object Storage、S3 互換)
   │      ├─ Bucket: plant-images (private)
   │      └─ Presigned URL (60 分、PUT/GET) を Vercel Function 経由で発行 (user_id チェック)
   │
   ├──→ [OpenAI API] (Vision)
   │      └─ gpt-4o-mini で植物同定 (Vercel Function 経由、API key 秘匿)
   │           (位置 + 季節 + メタ を prompt 注入、store=false)
   │
   ├──→ [Stripe] (課金、Checkout + Webhook)
   │
   └──→ [Sentry] (エラー監視、opt-in user のみ)
```

### 4.1 主要コンポーネント

| 名前 | 責務 | 技術領域 (具体名は例示) |
|---|---|---|
| PWA フロント | UI / 撮影 / 画像前処理 / Clerk SDK | Vite + React + TS + Tailwind + vite-plugin-pwa + Clerk SDK |
| Auth | Guest 起動 + OAuth Linking | **Clerk** (Guest Users β + Google OAuth) |
| DB | RDBMS、サービス専用 DB | **Neon Postgres** (無料 10 DB 並立、auto-suspend) + **Drizzle ORM** |
| Storage | private object storage | **Cloudflare R2** (S3 互換、エグレス無料、Presigned URL) |
| サーバーレス関数 | identify-plant / stripe-webhook / storage URL 発行 / cron | **Vercel Functions** (Node 20 runtime) + Vercel Cron |
| AI 同定 | 植物画像 → 名前 + 育成情報 | OpenAI gpt-4o-mini Vision (Vercel Function 経由) |
| 計測 | エラー監視 + API 使用量集計 | Sentry (opt-in) + 自前 Neon テーブル (api_usage) |
| ホスティング | 静的配信 + Edge | Vercel Hobby |
| 課金 | PWYW + content-unlock | Stripe Checkout + Webhook |
| Realtime | (廃止) | poll fallback (5s ごと client fetch、D20260522-115) |

### 4.2 技術スタック（方向性）
- **フロント**: モダン SPA + PWA（例: Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa）
- **Auth**: Identity SaaS with Guest mode（例: **Clerk** Guest Users β + Google OAuth Linking）
- **DB**: マネージド Postgres、サービスごとに独立 DB（例: **Neon** 無料 10 DB 並立）
- **ORM**: 型付き SQL ビルダ（例: **Drizzle ORM** + drizzle-kit）
- **Storage**: S3 互換 object storage、エグレス無料（例: **Cloudflare R2**）
- **サーバーレス関数**: フロントと同居 (例: **Vercel Functions** Node 20、**Vercel Cron** で schedule)
- **AI**: 商用 Vision LLM (例: OpenAI gpt-4o-mini)、サーバーレス関数経由で API key 秘匿
- **インフラ**: サーバーレス静的ホスティング (例: Vercel Hobby)
- **監視・ログ**: エラー追跡 SaaS (例: Sentry 無料枠、opt-in user のみ) + 自前 API 使用量ログ (Neon テーブル)
- **CI/CD**: クラウド CI (例: GitHub Actions、Vercel preview deploy 連携)

### 4.3 リソース選定たたき台

> **注**: 各サービスの pricing は変動する。実際の採用判断時は必ず最新の公式 pricing を確認。
> 以下は概念設計時点での選定根拠と桁感 (USD 月額) を示すたたき台。商用化想定は段階的（MVP 無料運用 → 課金導入で AI コスト吸収）。

| カテゴリ | 推奨具体名 | 代替候補 | 選定根拠 | 想定単価 (USD/月、桁感) |
|---|---|---|---|---|
| フロント FW | React + TypeScript | Vue + TS / SvelteKit | エコシステム + AI Coding 親和性 + shadcn/ui 採用 | $0 (OSS) ※ 2026-05 時点想定、最新 pricing 要確認 |
| ビルドツール | Vite | Next.js / Astro | SPA + PWA で十分、サーバー不要 | $0 ※ 同上 |
| 状態管理 | Zustand + TanStack Query | Redux Toolkit / Jotai | 軽量、HTTP クライアント (Clerk + Vercel Function 呼出) との相性 | $0 ※ 同上 |
| UI ライブラリ | Tailwind CSS + shadcn/ui | Chakra UI / MUI | カスタマイズ柔軟 + shadcn の copy-paste 性 | $0 ※ 同上 |
| PWA | vite-plugin-pwa | Workbox 直接 | Vite ネイティブ統合 | $0 ※ 同上 |
| **DB** | **Neon (Postgres)** | Supabase / Cloudflare D1 / 自前 PostgreSQL on VPS | charter §0 デフォルト、無料 10 DB 並立 (マイクロサービス連発対応、Supabase 2 プロジェクト制約回避)、auto-suspend、100% Postgres 互換 | $0 (Free: 0.5GB×10 DB、コンピュート月 191.9h) → $19 (Launch) ※ 同上 |
| **ORM / マイグレーション** | **Drizzle ORM + drizzle-kit** | Prisma / TypeORM / Kysely / raw SQL | Neon と相性良、TypeScript 型生成、SQL に近い書き味、edge runtime 対応 | $0 (OSS) ※ 同上 |
| **Auth** | **Clerk (Guest Users β + Google OAuth Linking)** | Lucia + 自前 / Auth.js / Supabase Auth | charter §0 デフォルト、Guest Users β で匿名→OAuth Linking 設計を再現、UI 部品込み | $0 (Free 10,000 MAU) → $25 (Pro) ※ 同上 |
| **画像ストレージ** | **Cloudflare R2 (S3 互換)** | AWS S3 / Supabase Storage | charter §0 デフォルト、エグレス無料 (画像配信コストゼロ)、Presigned URL で 60 分 TTL | $0 (Free 10GB) → 従量 ($0.015/GB) ※ 同上 |
| **サーバーレス関数** | **Vercel Functions (Node 20)** + Vercel Cron | Cloudflare Workers / Supabase Edge Fn / Hono on Bun | charter §0 整合、フロントと同居、OpenAI/Stripe/Resend SDK が Node 20 で動く | $0 (Hobby: 100k invocations/月、Cron 2 件) ※ 同上 |
| 画像処理 | ブラウザ Canvas API + browser-image-compression | Sharp on Vercel Function | クライアント完結でコスト 0 | $0 ※ 同上 |
| AI Vision | OpenAI gpt-4o-mini Vision (Vercel Function 経由) | Anthropic Claude Vision / Google Gemini Vision / PlantNet API | 安価 ($0.001/req) + 同定精度 + 日本語植物名対応 | $1〜$30 (DAU 30→300) ※ 単価は OpenAI 公式 pricing で要確認 |
| ホスティング | Vercel Hobby | Cloudflare Pages / Netlify | Vite 親和性 + プレビューデプロイ + Functions 同居 | $0 (Hobby) ※ 同上 |
| エラー監視 | Sentry (Free、opt-in user のみ) | LogRocket / Datadog | エラー 5K/月無料、個人ツールに十分 | $0 (Free) ※ 同上 |
| アナリティクス | (MVP 見送り → 自前コストログのみ) | PostHog Cloud / GA4 | 利用分析は α 後に判断 [論点-005] | $0 ※ 同上 |
| CI/CD | GitHub Actions | CircleCI / Vercel Preview のみ | GitHub 無料枠 + Vercel preview 自動 + Drizzle migration apply | $0 ※ 同上 |
| ドメイン | お名前.com / Cloudflare Registrar | Google Domains 後継 | カスタムドメイン (例: hana-memo.app)、α 後に取得判断 | $1-2/月 (年 $12-24) ※ 同上 |
| 課金 | Stripe Checkout + Webhook | Paddle / Pay.jp | PWYW + content-unlock + 日本対応 | $0 + 手数料 3.6% + ¥40 ※ 同上 |
| 法務書類 | テンプレ採用 (Termly / 自前ドラフト + 適宜法務確認) | 弁護士フル委託 | 個人ツール、初期はテンプレで開始 | $0-50 (テンプレ SaaS) ※ 同上 |

### 4.4 想定コストサマリ

| 区分 | 月額目安 (USD) | 内訳の例 |
|---|---|---|
| 個人・無料枠 | $0 | Neon Free + Vercel Hobby + Clerk Free + R2 Free + Sentry Free + ドメイン年 $12-24 別途 |
| MVP α 公開 (DAU 10-30) | $1〜$3 | + OpenAI ($1-3) |
| スモール商用 (DAU 100) | $10〜$30 | + OpenAI ($10) + Neon Launch 移行候補 ($19 if コンピュート超過) |
| 中規模 (DAU 300+) | $30〜$100 | + OpenAI ($30) + Neon Launch ($19) + Clerk Pro ($25 if 10k MAU 超過) + R2 従量 ($1-5) + ドメイン + 課金手数料 |

**本プロジェクトのレンジ**: **個人・無料枠 → MVP α 公開 → スモール商用**（段階移行）
**根拠**: seiji 単独運用、初期 $0、AI コストは課金で吸収。Neon Launch 移行は DB ストレージ 0.5GB or コンピュート 191.9h 超過時、Clerk Pro は 10k MAU 超過時。

### 4.5 ローカル開発環境計画

#### 4.5.1 開発スタイル
**選定**: ハイブリッド (フロントはホスト、DB は Neon Branch、Auth は Clerk dev mode、Storage は R2 dev bucket、Vercel Functions は `vercel dev`)
**理由**: BaaS サービスごとに独立、ローカル emulator は使わずクラウドの dev 環境に直接接続 (Neon branch + Clerk dev + R2 dev bucket)。Vercel dev で Functions も再現可能。

#### 4.5.2 必要サービス（ローカル起動対象）

| サービス | 役割 | ローカル起動方式 | ポート | 永続化 |
|---|---|---|---|---|
| Vite dev server | フロント開発 | `npm run dev` (ホスト) | 5173 | host-fs |
| Vercel dev | Functions ローカル再現 + フロント proxy | `vercel dev` (ホスト) | 3000 | host-fs |
| Neon (dev branch) | DB | クラウド (リモート) | — | クラウド永続 |
| Clerk (dev keys) | Auth | クラウド (リモート) | — | クラウド永続 |
| Cloudflare R2 (dev bucket) | Storage | クラウド (リモート) | — | クラウド永続 |
| OpenAI API | 本番接続 (モックなし、無料枠で開発) | `.env.local` の API キー | — | — |
| Drizzle Studio (任意) | DB GUI | `npx drizzle-kit studio` | 4983 | (なし) |

> Neon の **branch 機能**で本番 DB の clone を 1 秒で作成 (Copy-on-Write)、dev 環境専用 DB として運用。コスト無料枠内。

#### 4.5.3 環境変数・シークレット管理

- **`.env.example`**: 必須キー一覧（ダミー値、Git コミット可）
- **`.env.local`**: 実値（Git コミット禁止、`.gitignore` 必須）
- **シークレット管理方針**: 平文 `.env.local`（個人開発、後で direnv or 1Password CLI 検討）
- **平文コミット禁止項目**:
  - `OPENAI_API_KEY`
  - `DATABASE_URL` (Neon connection string、本番)
  - `CLERK_SECRET_KEY` (Vercel Function only)
  - `VITE_CLERK_PUBLISHABLE_KEY` (frontend 露出可)
  - `CLERK_WEBHOOK_SIGNING_SECRET` (Vercel Function only)
  - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (Vercel Function only)
  - `STRIPE_SECRET_KEY` (Vercel Function only) / `STRIPE_WEBHOOK_SECRET`
  - `VITE_STRIPE_PUBLISHABLE_KEY` (frontend 露出可)
  - `SENTRY_DSN` (本番)
  - `SLACK_QUOTA_WEBHOOK_URL` / `SLACK_REVENUE_WEBHOOK_URL`
- **コスト単価管理 (§4.6.2)**:
  - `COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS=0.00015`
  - `COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS=0.0006`
  - `COST_OPENAI_GPT4O_MINI_PER_IMAGE=0.001` (vision)
  - `COST_R2_PER_GB_PER_MONTH=0.015`
  - `COST_R2_EGRESS_PER_GB=0` (R2 はエグレス無料)
  - `COST_NEON_PER_COMPUTE_HOUR=0.16` (Launch tier 想定、Free では 191.9h まで $0)
  - `COST_CLERK_PER_MAU_OVERAGE=0.02` (10k MAU 超過後の単価想定)
  - (※ 2026-05 時点想定、最新 pricing で要更新)

#### 4.5.4 起動・停止・リセットコマンド

| 操作 | 抽象表現 | 例 |
|---|---|---|
| 起動 (フロントのみ) | Vite dev | `npm run dev` |
| 起動 (Functions 込み) | Vercel dev | `vercel dev` |
| 停止 | プロセス終了 | Ctrl+C |
| ログ | Vercel Function ログ | `vercel logs` (deploy 済) / dev はコンソール出力 |
| DB 接続確認 | psql or drizzle | `psql $DATABASE_URL -c '\dt'` / `npx drizzle-kit studio` |
| マイグレーション生成 | スキーマ差分 → SQL | `npx drizzle-kit generate` |
| マイグレーション適用 | DB に SQL 反映 | `npx drizzle-kit migrate` (or `npm run db:migrate`) |
| ブランチ DB 作成 | Neon branch from main | `neonctl branches create --name dev` |
| DB リセット | dev ブランチ削除 → 再作成 | `neonctl branches delete dev && neonctl branches create --name dev` |
| 型生成 | Drizzle schema から TS 型 | 自動 (drizzle-kit が `db/schema.ts` で生成済の型を export) |

#### 4.5.5 開発フロー上の留意点

- **初回セットアップ**: Vercel CLI install + `vercel link` + Neon CLI install + `.env.local` 取得 (5 分)
- **マイグレーション**: コード変更後 `drizzle-kit generate` → 確認 → `drizzle-kit migrate` で適用
- **シードデータ**: `db/seed.ts` に Drizzle insert script、`npm run db:seed` で実行
- **ホットリロード**: Vite HMR (フロント) / Vercel dev は Function 再起動が必要
- **OS 別差異**:
  - Mac / WSL2 / Linux: Node 20 と Vercel CLI があれば全て同じ (Docker 不要、Neon は cloud)
- **OpenAI 開発**: モックせず本番 API 接続、`.env.local` の使用量を api_usage で追跡

#### 4.5.6 CI/CD との関係

- **CI 環境**: GitHub Actions (Docker 不要、Node 20 のみ)。Drizzle migration の dry-run / typecheck / vitest
- **本番との差異**: dev は Neon dev branch + Clerk dev key、本番は Neon main branch + Clerk prod key、`.env.production` で吸収
- **E2E テスト**: Playwright + Vercel preview deploy URL に対して実行 (preview ごとに ephemeral Neon branch 推奨、CI で `neonctl branches create --name ci-$SHA` → 終了時 delete)

#### 4.5.7 dev 起動スクリプト計画 (`scripts/dev.sh`、perspectives O36)

> 本 PJ は Docker 不要・Neon cloud のため、O36 が想定する「複数コンテナの順序起動」型ではなく **`vercel dev` 一発 + 前段 health check + 起動後 smoke** の薄い構成で足りる。動作確認用のワンショット起動エントリポイントとして `scripts/dev.sh` を Phase 3.5 bootstrap で生成する。

| 項目 | 内容 |
|---|---|
| **launcher 種別** | bash (`scripts/dev.sh` 単体。stop は Ctrl+C trap で完結、別 stop script 不要) |
| **起動順序** | (1) `.env.local` 存在チェック (無ければ `.env.example` コピーを案内して exit 1) → (2) DB ping (health check) → (3) `vercel dev` 起動 (Vite frontend + Vercel Functions を 1 プロセス、port 3000) |
| **health check** | 起動前: `psql "$DATABASE_URL" -c 'select 1'` で Neon 接続確認 (失敗時 exit 1)。起動後: 下記 smoke endpoint を `curl` で疎通確認 (最大 N 秒リトライ) |
| **smoke test endpoint (2 件)** | ① `GET http://localhost:3000/` → 200 (Vite app shell) ／ ② `GET http://localhost:3000/api/health` → 200 `{ "ok": true }` (Phase 3.5 で軽量 health Function を作成) |
| **stop / cleanup** | Ctrl+C (SIGINT/SIGTERM) を `trap` で捕捉 → `vercel dev` 子プロセスを kill + 一時ログ削除。Neon は cloud のため停止対象なし |
| **生成タイミング** | Phase 3.5 app/api bootstrap の最初のタスク (`/flow:status` の bootstrap 基準 = `scripts/dev.sh` + CI yaml 存在、O36+O37) |

**疎通の考え方**: 外部 SDK (Clerk/R2/OpenAI/Stripe) はキー未設定でも dev shell が立ち上がることを優先。各 SDK は `.env.local` 未設定時に graceful degrade (機能無効 + 警告ログ) する方針 (glue wiring 時に担保)。

### 4.6 コスト・収益追跡と継続判断ループ

#### 4.6.1 PJ 性質別の必要レベル

**本 PJ の該当レベル**: **個人ツール → スモール商用への段階移行** (§4.4 から)

| PJ 性質 | コスト追跡 | 無料枠超過アラート | 収益指標 | BEP | レビュー | 撤退判断 | 判断主体 |
|---|---|---|---|---|---|---|---|
| 個人ツール / 無料枠 (MVP) | ✅ 必須 | ✅ 必須 | ❌ 不要 | ❌ 不要 | 四半期 | 必須 | 本人 (seiji) |
| スモール商用 (DAU 100+ 到達時) | ✅ 必須 | ✅ 必須 | ✅ 必須 | ✅ 必須 | 月次 | 必須 | 本人 (seiji) |

#### 4.6.2 コスト集計メカニズム（システム内部計測、全 PJ 性質で必須）

**外部請求ダッシュボードだけに頼らず、システム内部で能動的に積算する**。

**仕組み**:
1. **呼び出しログの積算記録**: OpenAI API call を 1 件ごとに `api_usage` テーブル (Neon) に記録
   - カラム: `user_id`, `service`, `endpoint`, `input_tokens`, `output_tokens`, `image_count`, `success`, `latency_ms`, `created_at`
2. **単価表は `.env` で管理** (§4.5.3 参照):
   - `COST_OPENAI_GPT4O_MINI_PER_IMAGE`, `COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS`, `COST_R2_PER_GB_PER_MONTH`, `COST_NEON_PER_COMPUTE_HOUR`, etc.
3. **概算コスト算出**: `usage × .env 単価` を Vercel Function or Vercel Cron 日次バッチで集計し、`api_usage_daily` Drizzle ビューに書き出す
4. **精度検証**: 月次で OpenAI / Neon / Clerk / R2 ダッシュボードと突合、誤差 > 10% で単価更新
5. **アラート閾値**:
   - OpenAI 月次予算 ($30) の 80% / 100% / 120% で Slack Webhook 通知 (check-quota Vercel Cron)
   - Neon 無料枠 (DB 0.5GB×10 / コンピュート 191.9h/月) の 80% / 100% で同様
   - Clerk MAU 10k の 80% / 100% で同様
   - R2 ストレージ 10GB / Functions 100k invocations の 80% / 100% で同様

#### 4.6.3 追跡するコスト指標

| 指標 | 集計頻度 | 集計元 | 備考 |
|---|---|---|---|
| OpenAI API コスト (gpt-4o-mini) | 日次 / 月次 | `api_usage` × .env 単価 | §4.6.2 メカニズム |
| Cloudflare R2 ストレージ使用量 | 日次 | R2 ダッシュボード API | 10GB 無料枠監視、エグレス無料 |
| Neon DB 使用量 (ストレージ + コンピュート時間) | 日次 | Neon ダッシュボード API | 0.5GB×10DB / 191.9h コンピュート 無料枠監視 |
| Clerk MAU | 月次 | Clerk ダッシュボード | 10k MAU 無料枠監視 |
| Vercel 帯域 / Functions invocations | 日次 | Vercel ダッシュボード | 100GB/月 + 100k invocations 無料枠監視 |
| Sentry エラー件数 | 日次 | Sentry ダッシュボード | 5K/月 無料枠監視 |
| インフラ総額 (合算) | 月次 | 上記合算 | §4.6.6 レビュー入力 |

#### 4.6.4 追跡する収益指標（スモール商用到達時のみ）

| 指標 | 計測元 | 備考 |
|---|---|---|
| 単発課金件数 (AI 追加枠) | Stripe API | 100 円 × 10 回追加 (ゲスト可、revise_001) |
| ARPU | 売上 / 課金ユーザー数 | スモール商用以降 |
| 課金ユーザー数 | Stripe API | 新規 + 既存 |
| Churn (60 日無アクティブ率) | アプリ DB | サブスクなしのため churn は「離脱」近似 |

##### 4.6.4.1 収益統計エクスポート機構（perspective O21 連携）

- **頻度**: 月次必須
- **出力先**:
  - 最低: `<root>/exports/revenue_<YYYYMM>.csv` (ローカル、.gitignore 対象)
  - 推奨: `~/ideas/feedback/hana-memo_revenue.csv` への定期コピー (アイデア出しフィードバック用、charter §4 連携)
- **CSV カラム** (最低限):
  ```
  date,paid_users,one_time_count_ai_unlock,one_time_count_pdf,arpu,new_signups,churn_60d_rate,external_api_cost,gross_margin
  2026-08-01,5,40,2,400,15,0.2,12,0.85
  ```
- **保護対象**: 個別ユーザー名 / メールは集計後のみ、PII エクスポート禁止
- **実装**: `<root>/src/scripts/export-revenue.ts` に集計バッチ、GitHub Actions の cron で月次実行

#### 4.6.5 BEP (損益分岐点)

- **固定費**: ドメイン $1-2/月 + (将来) Neon Launch $19/月 (DB 0.5GB or コンピュート 191.9h 超過時)。Clerk Pro $25/月 は 10k MAU 超過時のみ (DAU 数百では発生しにくい)
- **変動費**: OpenAI ($0.001/同定 × 件数) + Stripe 手数料 (3.6% + ¥40)
- **想定 ARPU**: 100 円 × 月 1 回課金 = ¥100/月/課金者
- **BEP 例 (Neon Launch 移行後)**: 月 $19 + ドメイン $2 = $21 ÷ ARPU($0.66/月) ≒ 課金ユーザー 32 人 (DAU 100-200 程度)
- **BEP 到達予測**: α 公開 → 6 ヶ月後 (粗い見立て、運用で再計算)

#### 4.6.6 レビューサイクル

| サイクル | 内容 | 参加者 |
|---|---|---|
| 日次 (自動) | OpenAI 使用量 + Neon / R2 / Clerk / Vercel 無料枠 + Sentry エラー件数アラート | システム自動 |
| 月次 (人間) | §4.6.3 コスト指標 + §4.6.4 収益指標 (商用到達後) + BEP 進捗 | seiji |
| 四半期 (人間) | 中期トレンド + 撤退判断ゲート評価 + idea registry feedback (`~/ideas/feedback/`) | seiji |

#### 4.6.7 継続 / 縮退 / 撤退判断基準

| 判断 | 基準 | 対応 |
|---|---|---|
| 継続 | コスト < $30/月 (MVP 期) または BEP 到達 (商用期) | 通常運用 |
| 縮退 | OpenAI 月 $30 超過 + 課金回収率 < 100% | AI 機能を月 5 回無料に制限 / 課金単価見直し |
| 一時停止 | Neon / Clerk 無料枠 100% 超過 + 有料移行未決 | 新規受付停止 / 既存ユーザー優先 |
| 撤退 | DAU が 3 ヶ月連続 < 5 + 課金 0 + 改善見込みなし | サービス終了プロセス (データエクスポート提供 → 課金停止 → DB 削除) |

**本 PJ の撤退基準**: 上表の通り。**個人ツールとして「楽しみながら作る」要素もあるため、撤退判断は経済性だけでなく『自分が使い続けたいか』も含めて四半期レビューで判断**。

#### 4.6.8 判断主体と決裁プロセス

- **判断主体**: seiji 単独
- **判断ログ**: 月次・四半期レビュー結果は `docs/AI_LOG/` のレビューセッションファイル (`D<date>_<sess>_review_<period>.md`) に記録 (将来の `/flow:review` で運用)
- **撤退時の対応手順**:
  1. ユーザーへ告知 (アプリ内通知 + メール、最低 30 日前)
  2. データエクスポート手段提供 (CSV + 画像 zip)
  3. Stripe 課金停止 (新規 + 既存)
  4. Vercel deploy 削除 + Neon DB 削除 + Clerk App 削除 + R2 Bucket 削除 + OpenAI / Sentry のキー無効化
  5. データ削除 (告知期間終了後、consent_logs は user_id NULL 化のみで保持)

### 4.7 公開戦略・ドメイン・リバースプロキシ (Q12.10 由来、perspectives O29)

> マイクロサービスの**撤退リスク最小化**を主軸。「閉じる前提でも違和感ない」構成。

#### 4.7.1 ドメイン情報
- **公開 URL (告知 URL)**: `https://hana-memo.givers.work` (2026-05-27 当て、release_002 サブドメイン設定)。既存の `givers.work` (ConoHa 管理) のサブドメインを使用 = 新規ドメイン取得コストなし・撤退は DNS 1 行削除 + Vercel domain rm で完結 (撤退リスク極小)。記録: `services.toml`
- **フォールバック URL**: `hana-memo.vercel.app` (Vercel デフォルト、DNS 伝播前 / 撤退後)
- **DNS**: ConoHa の `givers.work` ゾーンに `A hana-memo 76.76.21.21` (Vercel anycast)
- **将来**: 独自 apex (`hana-memo.app` 等) は正式運用拡大時に再検討 (現状サブドメインで十分)
- **旧方針 (〜2026-05-27)**: MVP は `hana-memo.vercel.app` で独自ドメイン取得せず、の方針だったが、既存 `givers.work` のサブドメインなら取得コストゼロ・撤退容易のため告知前に当てた (告知 URL を後から変えると周知やり直しになるため)

#### 4.7.2 公開構成パターン
- **採用パターン**: **(A) PaaS 完結 (Vercel + Neon + Clerk + R2)** — 運用負担ゼロ、最推奨
- **構成図**:
  ```
  ユーザー → Vercel CDN (Frontend SPA, /legal/*, /auth/callback)
                   ↓
                Vercel Functions (Node 20) ─┬─ Neon (Postgres + Drizzle)
                                            ├─ Clerk (Auth、Guest β + OAuth)
                                            └─ Cloudflare R2 (画像 private)
                   ↓
                外部 API (OpenAI Vision, Stripe Checkout, Slack Webhook)
  ```

#### 4.7.3 リバースプロキシ設定
- **採用**: なし (PaaS 完結パターン A のため不要)
- **将来 (B) VPS 相乗りに切替時の選定**: Caddy (SSL 自動、推奨)

#### 4.7.4 サブドメ命名規約
- 現状 single-app のためサブドメ運用なし
- 将来分割時: `api.hana-memo.app` (Vercel Functions API ラッパ等) / `admin.hana-memo.app` (管理画面) / `staging.hana-memo.app` (ステージング)

#### 4.7.5 撤退時の手順 (撤退コスト最小化、§4.6.7 連携)
1. ユーザーに事前通知 (アプリ内バナー + Email 通知、最低 30 日前)
2. データ持ち出し案内 (図鑑データ CSV/JSON/画像) — ⚠️ 専用 `/export` 機能は billing revise_001 で全廃。撤退時はアドホック出力 or account 削除前ダウンロードで対応 (要・撤退前に takeout 手段の再設計)
3. 課金停止 (Stripe: 新規 Checkout 受付停止、過去購入の unlock は保持)
4. **Vercel プロジェクト削除** (デフォルトドメインも同時失効)
5. Neon DB / Clerk App / Cloudflare R2 Bucket を削除 (法務トレース性確保のため consent_logs 等は user_id null 化のみで保持、削除は告知期間終了後)
6. OpenAI / Stripe / Sentry / Slack の API キー revoke
7. データバックアップを 6 ヶ月保管 (個人情報保護法対応)
8. `~/ideas/registry.jsonl` の `adopted_pj` を `status=retired` に更新 (将来実装)

#### 4.7.6 複数 PJ 相乗り時の隔離
- 本 PJ は単独運用 (パターン A) のため該当なし
- 将来 VPS 相乗りした場合は Docker container 別 + DB 別プロジェクト

#### 4.7.7 ロールバック・障害復旧
- Vercel: 過去 deploy へ instant rollback (ボタン 1 つ)
- Neon: Point-in-Time Recovery / branch restore (Free history retention 内)
- DNS は Vercel デフォルトのため切替不要

### 4.8 サービス公開周知 / マーケティング戦略 (Q12.11 由来、perspectives O31)

> 個人開発マイクロサービス「作ったが誰も知らない」を回避。既存活用 SNS 軸 + Build in Public + 製品内グロース。

#### 4.8.1 チャネル使い分け (開発者向け ↔ 一般向け)

| 層 | チャネル | 用途 | 本 PJ での採否 |
|---|---|---|---|
| 開発者向け | X / Zenn / Hacker News | Build in Public、技術記事 | X 既存活動継続 + Zenn 月 1 記事 |
| 一般向け SNS (視覚) | Instagram / TikTok / Pinterest | 植物写真と相性◎ | **Instagram** 採用 (写真メインのテーマ整合) |
| 一般向けコンテンツ | note / Substack | 一般読者にリーチ | note 月 1 記事 (使い方 / 季節の植物紹介) |
| ニッチコミュニティ | LINE オプチャ / FB グループ | ターゲットの巣に届く | ガーデニング系 FB グループ 1 つ |
| 検索流入 (SEO/ASO) | Google | 長期安定流入 | ★★★ 必須 (§4.8.3) |
| 製品内グロース | UGC 流出設計 | 最強の長期チャネル | ★★★ 必須 (§4.8.2) |

#### 4.8.1.1 個人開発マイクロサービスでの優先順位 (本 PJ 確定)

| 優先度 | チャネル | 本 PJ の採用 |
|---|---|---|
| ★★★ 必須 | 製品内グロース (UGC) + SEO | 採用、§4.8.2 / §4.8.3 |
| ★★★ 必須 | note (使い方記事) | 採用、月 1 |
| ★★ 推奨 | Instagram (植物写真) | 採用 (テーマ整合) |
| ★★ 推奨 | ガーデニング系 FB グループ 1 つ | 採用 |
| ★ 既存維持 | X | 継続 (週 1-3 ツイート) |
| 任意 | Product Hunt / YouTube | α 後判断 |

#### 4.8.1.2 サービステーマ別チャネル選定根拠

本サービス「散歩中の植物発見ノート」テーマ:
- ターゲット層: 個人 (散歩 / 通勤 / 園芸が日常)
- 視覚性: 高 (植物写真) → Instagram 適合
- ニッチ度: 中 (広く浅く SNS + 狭く深くガーデニング FB)
- 地域性: 日本中心、グローバル展開は MVP 外

→ **最終選定: Instagram (写真主体) + note (ストーリー) + X (Build in Public) + ガーデニング FB グループ 1 つ**

#### 4.8.1.3 既存活用 SNS と新規開設方針

新規アカウント開設は **Instagram のみ**。既存 X / note は継続活用。

| チャネル | 既存 | 本 PJ での運用 |
|---|---|---|
| X | あり | 週 1-3 ツイート (Build in Public 軸) |
| note | あり | 月 1 記事 (使い方 + 季節の植物) |
| Instagram | なし → 新規 | 月 4-8 投稿 (発見植物の写真コラージュ) |
| ガーデニング系 FB グループ | なし | 月 1 投稿程度、控えめに |

#### 4.8.2 製品内グロース設計 (★最強の長期チャネル、SPEC §1.1 反映)

##### 4.8.2.1 シェアしたくなる成果物
- **月次フォトコラージュ** (notebook UC6 で実装): 前月の identified 9 件を 1080x1080 grid 画像化、Instagram 想定
- **年次振り返り** (v2、MVP 範囲外): 1 年分の発見数 + 季節別ハイライト

##### 4.8.2.2 シェア導線設計
- シェアボタンは notebook UC6 内に常設 (強制シェアモーダル NG、charter §2.2 整合)
- Web Share API + X / Instagram / コピー URL fallback
- シェアコンテンツ末尾: 「hana-memo で記録 → hana-memo.vercel.app」(控えめなクレジット)
- 動的 OG 画像 (`/coll/{id}.png`、Vercel OG Image) で SNS 映え

##### 4.8.2.3 招待制 + 招待特典
- MVP では実装しない (charter §2.2 抵触リスク優先)
- v2 で「招待者 + 被招待者に 1 ヶ月分追加 AI 枠 (10 回)」を控えめに検討、競争・ランキングは絶対不可

##### 4.8.2.4 UGC が外部 SNS に流出する設計
- Instagram にコラージュ画像投稿 → 友人「これ何のアプリ?」→ 自然な口コミ
- ハッシュタグ提案 (UI 控えめ): `#hanamemo` `#散歩発見` (UI から提案、強制なし)

##### 4.8.2.5 アンチパターン (charter §2.2 NG、本 PJ 全て採用しない)
- 強制シェアモーダル
- 数字煽り (「N 人がシェア」)
- シェア競争ランキング
- 招待ガチャ / レア機能解放
- 「シェアした人だけ限定」プッシュ

##### 4.8.2.6 OK ライン
- ✅ シェアしなくても全機能使える (notebook E-NB-7 で検証必須)
- ✅ 月次コラージュは「見せたくなる」自然な成果物
- ✅ ユーザーが意図して選ぶシェア (押し付けない、見えない誘導もしない)
- ✅ シェアそのものが目的化していない (記録・振り返りが主役)

#### 4.8.3 SEO / ASO (★長期安定流入)

##### 4.8.3.1 検索キーワード設計
- 狙うキーワード (ロングテール):
  - 「植物 名前 アプリ 無料」
  - 「散歩 記録 アプリ」
  - 「草花 写真 識別」
  - 「庭の花 名前 AI」
- 競合: PictureThis / GreenSnap / Google Lens — 差別化軸は「SNS なし、自分のノート主役」を強調

##### 4.8.3.2 技術的 SEO
- 構造化データ: schema.org `MobileApplication` で OGP
- サイトマップ: `sitemap.xml` 自動生成 (Vite plugin)、Google Search Console 登録
- Core Web Vitals: LCP < 2.5s / CLS < 0.1 (concept §3 NFR 整合)
- モバイル対応: PWA 標準、レスポンシブ
- HTTPS: Vercel 自動 (§4.7 整合)

##### 4.8.3.3 コンテンツ SEO
- ヘルプ / 使い方 / FAQ ページ充実 (`/help/*` ルート、SEO 本体)
- note 月 1 記事:「今月見つけたい春の野草 10 選」「散歩を 5 倍楽しむ記録法」等
- ユーザー作品ギャラリー (許諾済 UGC、v2)

##### 4.8.3.4 ASO (将来 App Store / Google Play 配布時)
- MVP は PWA のみ、ネイティブ配布は v2 以降

##### 4.8.3.5 既存ドメイン活用
- なし (Vercel デフォルトドメイン)。将来 hana-memo.app 取得時は SEO 仕切り直し

#### 4.8.4 Build in Public ストーリー軸

継続コンテンツテーマ:
- **超高速 AI 駆動開発**: Claude Code (本 CLI) で 14 文書 4-5 時間で設計の可視化 → Zenn / X
- **マイクロサービスの透明化**: AI_LOG の decision を素材化「設計判断 N 件、その内訳」
- **撤退も透明化**: 失敗・撤退も含めて公開 (registry status=retired)
- **本 PJ 固有テーマ**: 「植物名アプリで AI 識別の限界とユーザー訂正のバランス」

#### 4.8.5 OGP / Twitter Card (公開時必須)

- `og:title`: 「hana-memo — 散歩で出会った植物の発見ノート」
- `og:description`: 「撮るだけで AI が名前を当てる。自分だけの植物図鑑が育つ PWA」
- `og:image`: 動的生成 (Vercel OG Image)、トップは静的画像
- `og:url`: canonical URL
- `twitter:card`: `summary_large_image`

#### 4.8.6 エコシステム配置

| プラットフォーム | 用途 | 本 PJ |
|---|---|---|
| Product Hunt | 英語圏ローンチ | α 後判断、グローバル展開時 |
| Indie Hackers | 収益公開 | α 後判断 |
| Hacker News (Show HN) | 開発者露出 | 英語化したら |
| Awesome リスト (GitHub) | カテゴリ別露出 | 該当なし (PWA カテゴリ薄) |

#### 4.8.7 コンテンツペース (継続性重視)

- 最小: note 月 1 記事 + X 週 1-3 ツイート + Instagram 月 4 投稿
- 標準: + Zenn 月 1 技術記事
- 集中: ローンチ時のみ X 毎日 + note 週 1

**疲弊しない最小ペースを優先**。

#### 4.8.8 ユーザー投稿のシェア促進
§4.8.2 製品内グロースで統合済。追加設計なし。

#### 4.8.9 計測 (perspectives O02 / O15 連携)
- 流入元: Vercel Analytics (free 枠) で referer / UTM 計測
- ランディング CVR: signup (匿名 user 生成) / first capture を KPI
- SNS 投稿効果: 各投稿に UTM パラメータ
- consent banner: GDPR 対象外 (国内向け) のため bare bones で OK、ただし analytics opt-out UI は提供 (account 機能で実装済)

---

## 5. データ設計（高レベル）

### 5.1 主要エンティティ

> **2026-05-22 更新**: BaaS Pivot により、auth.users は Clerk 管理、public.users (Neon) はアプリ拡張テーブル。Clerk Webhook で同期。

- **users** (Neon `public.users`): Clerk から Webhook 同期 (`clerk_user_id`, `email?`, `is_anonymous: bool`, `linked_at: timestamp?`, `deleted_at?`, `deletion_reason?`, `fingerprint_hash?`, `trial_used_count int default 0`, `ai_credits_remaining int default 0`, `created_at`) — `pdf_unlocked` 列は billing revise_001 (2026-05-26、migration 0003) で削除済
  - 起動時に Clerk Guest Users (β) で `is_anonymous=true` の sign-in 完了 → Clerk Webhook (`user.created`) → Vercel Function → Neon `users` に行作成
  - Google OAuth リンク後は Clerk Webhook (`user.updated`) で `linked_at` set、`is_anonymous=false`
  - 匿名 user の SPAM 抑止 (D20260522-057): trial 3 回 + fingerprint hard cap
- **discoveries**: 発見レコード (id, user_id, image_id, captured_at, location_lat/lng (任意, ~100m 丸め), common_name, scientific_name, family, genus, key_features (jsonb), confidence, similar_species (jsonb), status enum, original_common_name, user_overridden_name, user_note, deleted_at?, created_at, updated_at)
- **plants**: 植物マスタ (id, scientific_name, common_name_ja, family, season_months[], care_info, image_ref) — AI 同定結果をキャッシュして再利用 (将来用、MVP は discoveries に直接保存)
- **images**: 画像メタ (id, user_id, discovery_id, r2_object_key, original_size_bytes, mime, exif_stripped bool, created_at)
- **api_usage**: AI 呼び出しログ (id, user_id, service, endpoint, input_tokens, output_tokens, image_count, success, latency_ms, created_at) — §4.6.2 コスト集計の源泉
- **billing_unlocks**: 課金履歴 (id, user_id, type enum, amount_jpy, stripe_checkout_session_id UNIQUE, stripe_payment_intent_id, stripe_receipt_url, created_at) — `type` enum の `pdf_unlock` 値は履歴行互換のため残置 (revise_001 以降 `ai_credits` のみ生成)

- **user_settings**: ユーザー設定 (user_id, location_precision enum, ai_consent_revoked_at?, analytics_opt_in bool default false, updated_at)
- **consent_logs**: 同意ログ (id, user_id, doc_type enum, doc_version, agreed_at, ip_hash) — 法務改訂時の再同意トレース、append-only
- **discovery_edits**: 編集履歴 (id, discovery_id, user_id, edited_at, field_name enum, before_value, after_value) — UC2 audit-like、append-only

### 5.2 データフロー

```
[撮影] → ブラウザ Canvas で WebP 変換 + EXIF 削除 + リサイズ
         ↓
   [Vercel Function: /api/storage/upload-url] (user_id 検証 + R2 Presigned PUT URL 発行)
         ↓
   [Cloudflare R2] (Client が直接 PUT、original を private bucket に保存、エグレス無料)
         ↓
   [Neon images INSERT] (Drizzle insert)
         ↓
   [Vercel Function: /api/identify-plant] ← (Clerk JWT 検証 → Drizzle で discoveries INSERT status=identifying)
         ↓
   [Vercel Function: OpenAI Vision 呼出] (画像 R2 URL 署名 + プロンプト = 季節 + 位置 + メタ、Structured Output)
         ↓
   [api_usage INSERT (Drizzle)]
         ↓
   [discoveries UPDATE (Drizzle insert)] (common_name, scientific_name, confidence, status=identified/pending)
         ↓
   [UI 更新] (poll fallback で 5s ごと client fetch、Realtime なし)
```

**行アクセス制御**: Vercel Function で Clerk JWT → ctx.userId 取得し、Drizzle クエリで必ず `where eq(table.user_id, ctx.userId)` を強制。`plants` のみ全ユーザー read 可 (マスタとして共有、書き込みは Vercel Function 経由)。 Postgres RLS も補助的に適用可 (Neon サポート) だが、MVP は Drizzle 層の防御で十分。

---

## 6. 外部連携

> **2026-05-22 更新**: BaaS Pivot により Supabase → Neon + Clerk + R2 + Vercel Functions に変更 (D20260522-114)。

| 連携先 | 用途 | 方式 | 認証 |
|---|---|---|---|
| OpenAI API (gpt-4o-mini Vision) | 植物同定 + 育成情報生成 | REST API (Vercel Function 経由) | OPENAI_API_KEY (.env、Vercel Function env のみ) |
| **Clerk (Guest Users β)** | 起動時 UUID 自動発行 (認証 0 タップ) | Clerk SDK + Guest Users API | CLERK_PUBLISHABLE_KEY (frontend) + CLERK_SECRET_KEY (Vercel Function) |
| **Clerk (Google OAuth Linking)** | 「他端末で見たい / 課金したい」時の永続化リンク | Clerk linkIdentity (Google OAuth、same uid 維持) | Google Cloud Console で OAuth Client 発行 (Clerk dashboard で接続設定) |
| **Clerk Webhook** | Clerk user 変更 → Neon users テーブル同期 | Vercel Function `/api/clerk-webhook` (signing secret 検証) | CLERK_WEBHOOK_SIGNING_SECRET |
| **Neon** | Postgres DB (サービス専用、無料 10 DB 並立) | Drizzle ORM + drizzle-kit migration | DATABASE_URL (postgresql:// + pooler 推奨) |
| **Cloudflare R2** | 画像 private storage (S3 互換、エグレス無料) | AWS SDK S3 (Presigned URL 60 分、Vercel Function 経由) | R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY (Vercel Function only) |
| Stripe Checkout | PWYW + 一回課金 | Stripe Checkout Session API (Vercel Function 経由) | 公開キー (フロント) + 秘密キー (Vercel Function) + Webhook signing secret |
| Sentry | エラー監視 (opt-in user のみ) | Sentry JS SDK | DSN (公開) |
| Slack Webhook (quota / revenue) | 無料枠超過 + 月次収益通知 | Vercel Cron Functions → Webhook POST | SLACK_QUOTA_WEBHOOK_URL / SLACK_REVENUE_WEBHOOK_URL |
| (任意将来) PlantNet API | 学術同定補完 | REST API | API キー |

**外部 AI サービス利用**: あり（OpenAI gpt-4o-mini Vision、Q12.5 で確定、§4.3 / §4.4 / §3 NFR / §6 に反映済み）。
- データプライバシー: `store=false` 指定 (学習データ利用拒否)、ユーザー設定で AI OFF 可（デフォルト ON）
- フォールバック: AI ダウン時は「同定保留、後で再試行」モード
- 差別化根拠 (Q12.5 (7)): (a) ユーザー文脈の自動収集 (位置 + 季節 + 履歴を prompt 注入) + (c) 出力後処理 (同定結果 + 育成情報を自分のノート構造に整形) + (e) UI 統合 (1 タップで保存 + ノート化、生 LLM 出力ではなく業務 UI として提供) — 「ChatGPT に直接画像を投げるより本サービス経由が良い」根拠

**アナリティクス・計測ツール利用**: 最小構成 (Q12.6 で確定)
- 採用: Sentry (エラー監視) + 自前 `api_usage` テーブル (OpenAI コスト集計)
- 見送り: GA4 / PostHog / Mixpanel 等の利用分析ツール (α 公開後の判断 → [論点-005])
- データプライバシー: Sentry は IP 匿名化 ON、ユーザー識別子はハッシュ化 (`user_id` raw は送らない)
- オプトアウト: 個人情報保護法対応のため、Cookie バナーで Sentry opt-in 確認 (default OFF、ユーザー設定で ON に変更可能 — エラー追跡のためむしろ ON 推奨表記)
- 計測イベント: エラー (Sentry 自動) + AI 呼び出し (`api_usage` テーブル) のみ

---

## 7. 決定事項ログ

| 日付 | 決定内容 | 根拠 | 影響セクション | decision_id |
|---|---|---|---|---|
| 2026-05-22 | 技術スタック = Vite + React + TS + Supabase + Vercel + OpenAI gpt-4o-mini Vision | wants.md / Q10-11 | §4.2 §4.3 | [D20260522-011](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | リソース選定 + 想定単価 (USD/月) を §4.3 にたたき台確定。商用化は段階移行 | Q11 | §4.3 §4.4 | [D20260522-012](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | ローカル開発 = BaaS local (Supabase CLI) | Q12 / wants | §4.5 | [D20260522-013](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | 外部 AI = OpenAI gpt-4o-mini Vision (使う)、差別化根拠 (a)(c)(e) 明示 | Q12.5 / wants | §6 §3 NFR §4.6 | [D20260522-014](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | アナリティクス = Sentry + 自前コストログのみ (MVP)、利用分析は α 後判断 | Q12.6 | §3 NFR §6 [論点-005] | [D20260522-015](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | 認証 = Supabase Auth (Google OAuth + メールマジックリンク)、パスキーは v2 | Q12.7 | §6 §4.3 [論点-001] | [D20260522-016](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | **認証フロー = 匿名 (Supabase Anonymous Auth) スタート + Google OAuth 後リンク** (charter §1.1 適合、気軽さ最優先、課金時のみ OAuth 必須) | seiji 指摘 | §1.2 §3 §4.1 §4.3 §5.1 §6 §8 [論点-006][論点-007] | [D20260522-022](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | 法務 = プラポリ / 利用規約 / 特商法表記 / 個人情報保護法対応、GDPR 不要 | Q12.8 / wants | §9 | [D20260522-017](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | 機能フォルダ 7 + 横断 7 で分割、優先度 topological sort 算出 | Step 5.3 | §1.3 | [D20260522-019](./AI_LOG/D20260522_001_concept_initial.md#decisions) |
| 2026-05-22 | **BaaS Pivot: Supabase → Neon + Vercel + Clerk + Cloudflare R2 + Drizzle ORM** に全面切替 (charter §0 整合、Supabase 2 プロジェクト制約回避、マイクロサービス連発対応) | charter §0 更新 + seiji 確認 | §4.1〜4.3 / §5 / §6 / §10 / 横断 5 + 機能 7 文書 + PREREQUISITES | [D20260522-114](./AI_LOG/D20260522_016_concept_baas_pivot.md#decisions) |
| 2026-05-22 | Realtime 廃止 → poll fallback (5s ごと) | BaaS Pivot 派生 | capture / notebook SPEC | [D20260522-115](./AI_LOG/D20260522_016_concept_baas_pivot.md#decisions) |
| 2026-05-22 | Edge Functions → Vercel Functions (Node 20) 移植、Vercel Cron で scheduled | BaaS Pivot 派生 | _shared/ai / _shared/analytics / billing | [D20260522-116](./AI_LOG/D20260522_016_concept_baas_pivot.md#decisions) |
| 2026-05-22 | Auth = Clerk Guest Users (β) + linkIdentity、Webhook で Neon users 同期 | BaaS Pivot 派生 | _shared/auth / account / 認証フロー | [D20260522-117](./AI_LOG/D20260522_016_concept_baas_pivot.md#decisions) |
| 2026-05-22 | Storage = Cloudflare R2 + Presigned URL 60 分 (RLS は Vercel Function で user_id 検証) | BaaS Pivot 派生 | _shared/storage / capture / export | [D20260522-118](./AI_LOG/D20260522_016_concept_baas_pivot.md#decisions) |
| 2026-05-22 | [論点-002] 季節レコメンド通知 = MVP アプリ内バッジのみ確定 (Push は α 後再判断 / v2) | memory SPEC | §1.1 / memory / §3 NFR | [D20260522-111](./AI_LOG/D20260522_015_feature_memory.md#decisions) |
| 2026-05-22 | [論点-003] 図鑑 PDF エンジン = クライアント側 html2canvas + jsPDF 確定 (案A) | export SPEC | §4.3 / export | [D20260522-104](./AI_LOG/D20260522_014_feature_export.md#decisions) |
| 2026-05-22 | [論点-004] 位置情報粒度 = coarse 約100m default + precise/off 設定可 確定 (案A) | account SPEC | §3 NFR / capture / account / legal | [D20260522-085](./AI_LOG/D20260522_010_feature_account.md#decisions) |
| 2026-05-22 | [論点-007] 匿名→リンク移行 = first-link-only / merge 機能なし 確定 (案C、重複時は guidance のみ。UX 文言は法務レビュー継続) | auth SPEC | _shared/auth / account / billing | [D20260522-058](./AI_LOG/D20260522_007_feature__shared_auth.md#decisions) |
| 2026-05-23 | [論点-012] SEC-002 `.env.example` = closed (23 キー作成、TDD _shared/db Phase 0) | /flow:tdd _shared/db | §4.5.3 / PREREQUISITES | [D20260523-067](./AI_LOG/D20260523_026_tdd__shared_db.md#decisions) |
| 2026-05-23 | [論点-013] SEC-003 SSRF = closed (`assertSafeImageUrl` + `validateObjectKey` を helpers/url.ts に共通化、storage/ai で全消費) | helpers TDD / commit 77c17d6 | _shared/{helpers,storage,ai} | [D20260523-079](./AI_LOG/D20260523_027_auto_continuous.md#decisions) |
| 2026-05-24 | [論点-015] SEC-007 drizzle-orm SQLi = closed (0.36.4→0.45.2 upgrade、ソース変更0 / Vitest 373 green / npm audit high 0) | /flow:tdd revise / commit de8522c | _shared/db / §3 NFR | [D20260524-017](./AI_LOG/D20260524_045_tdd__shared_db_revise_sec_007.md#decisions) |

---

## 8. 未決事項（論点リスト）

### [論点-001] パスキー (WebAuthn) 採否 (OAuth リンク後の追加要素として)
- **影響範囲**: §6 外部連携 / §4.3 認証 / `docs/account/` / `docs/_shared/auth/`
- **前提変更**: D20260522-022 で「匿名スタート + 後リンク」採用。OAuth リンク = Google のみ MVP 提供、メールマジックリンクは見送り。パスキーは「OAuth リンク済 user の追加認証要素」として v2 検討
- **詰めるべき問い**:
  1. Clerk のパスキーサポート (Passkeys、Authentication Strategies) は本 PJ 採用に耐えるか?
  2. リンク済 user の追加認証として v2 で導入すべきか?
- **推奨**: **MVP は Google OAuth リンクのみ、v2 でパスキー追加検討**
- **判断期限**: v2 計画着手時
- **担当**: seiji

### [論点-006] 匿名 user の SPAM 抑止策
- **status**: `open` (コア確定・数値継続) — 推奨案 (匿名 AI 同定 3 回 + device fingerprint hard cap) は capture/auth SPEC で**採用済** (D20260522-057)。**「3 回」が妥当かは α 運用挙動で再評価**するため open 維持
- **影響範囲**: `_shared/auth` / `_shared/db` (api_usage 行制限) / §4.6 コスト追跡
- **背景**: 匿名スタート採用 (D20260522-022) で「ブラウザ cookie をクリア → 別匿名 user として再生成 → AI 同定 10 回無料枠リセット」のループ悪用が成立してしまう
- **詰めるべき問い**:
  1. デバイスフィンガープリント (canvas + UA + IP hash) で「同一端末からの匿名 user 増殖」を検知するか?
  2. IP 単位レート制限 (1 IP につき 1 日 N 回まで) を設けるか?
  3. Cloudflare Turnstile (CAPTCHA 代替) を撮影時に挟むか?
  4. そもそも「匿名 user 1 名あたり生涯 10 回」ではなく「**端末識別子 + IP 単位での月間総量制限**」に変えるか?
- **候補案**:
  - 案 A: IP 単位レート制限 + デバイスフィンガープリント。利点: 低コスト。欠点: NAT 配下の正規ユーザーを巻き込む / VPN 切替で突破される
  - 案 B: Cloudflare Turnstile を AI 同定リクエストに挟む。利点: 強い抑止 / 無料。欠点: UX 悪化 (撮影ごとに CAPTCHA は最悪)
  - 案 C: 匿名 user のデイリー上限を絞る (3 回/日)、月総量は廃止。リンク済 user は 10 回/月 + 課金。利点: シンプル。欠点: 「気軽に試したい」UX 阻害
  - 案 D: 匿名 user は無料枠なし (AI 同定はリンク後のみ)、匿名は撮影 + 保存のみ。利点: SPAM 抑止 100%、AI コスト予測安定。欠点: AI 同定を試してから判断したいユーザー離脱
- **推奨**: **案 A + 案 D ハイブリッド = 匿名 user は AI 同定 3 回/総量 (お試し枠) + 端末フィンガープリント、リンク後に月 10 回無料 + 課金で追加**。理由: 「気軽に試す」を 3 回保証 + SPAM 抑止 + コスト予測安定。フィンガープリント漏れ対策は α 運用で測定。
- **判断期限**: `/flow:feature billing` 着手前 (AI コスト設計と直結)
- **担当**: seiji

### [論点-005] 利用分析ツール導入時期と選定
- **影響範囲**: §4.3 / §6 / `_shared/analytics` / `docs/legal/` (Cookie バナー)
- **詰めるべき問い**:
  1. MVP α 公開後、PostHog / Mixpanel / GA4 のいずれかを入れるか?
  2. 入れる場合、Cookie バナー (opt-in) は GA4 で必要、自前ホスト PostHog なら不要?
  3. KPI は何を計測するか (DAU / 同定回数 / 図鑑出力数 / 課金 CVR)?
- **候補案**:
  - 案 A: MVP は入れない、α 後にユーザーフィードバック + Sentry エラー傾向で判断
  - 案 B: MVP から PostHog Cloud (無料枠) を入れて初期から計測
  - 案 C: MVP から GA4 + Cookie バナー
- **推奨**: **案 A (MVP 見送り、α 後判断)**。理由: 個人ツール / 無料枠厳守。Cookie バナー実装コスト + プラポリ記述追加を α 検証フェーズに集中させない。
- **判断期限**: α 公開後 (1 ヶ月運用してから判断)
- **担当**: seiji

### [論点-011] レート制限の具体的実装 (SEC-001、Critical)

- **status**: `closed` (Upstash binding + identify-plant handler wiring 完了。残 E2E 実 Redis smoke は Milestone C 検証)
- **status 履歴**: 2026-05-23 09:07 open → 2026-05-23 09:29 dispatched-to-revise → 2026-05-23 09:55 revise 設計反映完了 → 2026-05-23 17:58 TDD rate-limit 判定コア実装完了 (`/flow:tdd _shared/ai` D20260523_032: `rate-limit.ts` `checkIdentifyRateLimit` + `IDENTIFY_RATE_LIMIT` 10/min、RateLimiter DI) → 2026-05-24 13:55 **closed** (`/flow:auto` 反復2 D20260524_050: `api/_lib/ratelimit.ts` Upstash `createIdentifyRateLimiter` (slidingWindow 10/60s) + `api/identify-plant.ts` `runIdentify` で `checkIdentifyRateLimit` を最初に強制、超過時 RateLimitedError→429。unit test で rate-limit 超過時 OpenAI/quota 不実行を検証)
- **dispatch 先**: `docs/_shared/ai/revise_sec_001-003_rate_limit_ssrf_20260523/` (4 文書完了)
- **seed**: `docs/_pending_archive/sec_001-003_rate_limit_ssrf/000_TRIGGER.md` (revise 完了で `_pending/` → `_pending_archive/` 移動)
- **対応 commit**: revise (D20260523_022) + closure (D20260524_050 反復2、`feat(ai): Phase 3.5 Milestone B`)。**closure 残**: 実 Upstash Redis への E2E smoke (Milestone C、Vercel preview)
- **影響範囲**: §3 NFR / §4.3 / §4.6.2 / `_shared/ai` / `_shared/auth` / `_shared/db` / `billing`
- **観点 ID**: O27_rate_limit_scope
- **severity**: Critical
- **検出根拠**: 全 SPEC を `@upstash/ratelimit` / `rateLimit` / `express-rate-limit` で grep → 0 件。fingerprint + `trial_used_count` 生涯 cap のみで時間単位 rate limit が未設計。AI コスト爆発リスク + Stripe/Clerk Webhook 攻撃面リスク
- **詰めるべき問い**:
  1. レート制限の実装手段: Upstash Ratelimit / Vercel Edge Config / Cloudflare WAF のどれを採用するか?
  2. エンドポイント別の閾値: AI 同定 / Storage URL / Webhook / 公開 API の各 limit
  3. 匿名 user の AI 同定 5 回目以降に Cloudflare Turnstile を挿入するか?
- **候補案**:
  - 案 A (採用): **Upstash Ratelimit (Vercel Function 統合)** — AI 同定 `10/min`、Storage `20/min`、Webhook `100/min`、公開 `5/min` + Turnstile。Turnstile は MVP 未実装、α 運用で発動条件を判断
  - 案 B (非採用): Cloudflare WAF のみ — 細粒度制御困難 / エンドポイント別設定不可
  - 案 C (非採用): 自前 (Neon table カウンタ) — Neon コンピュート無料枠を rate limit カウンタで消費するのは本末転倒
- **推奨**: **案 A 採用**
- **判断期限**: `/flow:tdd` `_shared/ai` または `capture` 着手前 (TDD 開始直前必須)
- **担当**: seiji
- **L1 レポート**: `./SECURITY_REVIEW_20260523.md#sec-001`

### [論点-014] Sentry beforeSend PII スクラブ実装 (SEC-004、High / 法令必須)

- **status**: `impl-complete / α前-smoke-pending` (scrub core + 実 Sentry beforeSend wiring + **legal 開示実装済**。closure 残 = α 前 実 Sentry 1 件投げ目視のみ)
- **status 履歴**: 2026-05-23 09:07 open → 2026-05-23 09:33 dispatched-to-revise → 2026-05-23 10:10 revise 設計反映完了 (TDD 待機中) → 2026-05-23 17:40 **TDD scrub core 実装完了** (`/flow:tdd _shared/analytics` D20260523_029: `scrubber.ts` 7 パターン 行 100%、`sentry.ts` beforeSend/beforeBreadcrumb + uid hash 100%、`slack.ts` buildSlackPayload。50 tests pass) → 2026-05-24 14:04 **実 Sentry beforeSend wiring 完了** (`/flow:auto` 反復3 D20260524_050: `sentry-client.ts` `initBrowserSentry` が `@sentry/browser` を `scrubBeforeSend` 付きで init、unit 検証。Slack scrub は check-quota cron が消費) → 2026-05-24 **legal 開示実装完了** (revise D20260524_046: `privacy_policy.md` §4 に Sentry スクラブ開示追記 + `versions.ts` privacy_policy=v1.1.0、公開済) → **2026-05-27 status 前進** (`/flow:audit` AUDIT-issue-001 reconcile: legal 開示が実装済なのに status が `dispatched-to-revise` のままだった drift を解消。closure 残は α 前 smoke のみ)
- **dispatch 先**: `docs/_shared/analytics/revise_sec_004_sentry_pii_scrub_20260523/` (4 文書完了、scrubber.ts + beforeSend + 7 パターン定義 + Slack 通知統合)
- **seed**: `docs/_pending_archive/sec_004_sentry_pii_scrub/000_TRIGGER.md` (revise 完了で archive 移動)
- **対応 commit**: revise (D20260523_024) + scrub core (D20260523_029) + 実 Sentry wiring (D20260524_050 反復3、`feat(analytics): Phase 3.5 Milestone B`)。**closure 残**: legal プラポリ TDD (`/flow:tdd legal sentry-disclosure`、Phase 4) + 実 Sentry/Slack への 1 件投げ目視 (PII 混入ゼロ、α 公開前)
- **法務 TODO**: プラポリ §4 に「Sentry エラー追跡委託先利用、PII はスクラブ後送信」追記。**✅ 実装済** (`docs/legal/revise_sentry_disclosure_20260524/` D20260524_046、`privacy_policy.md` 本文に開示文 + `versions.ts` v1.0.0→v1.1.0 公開済)。残 = α 公開前の実 Sentry 1 件目視 (PII 混入ゼロ確認) のみ
- **影響範囲**: §3 NFR / §9.1 / §9.2 / `_shared/analytics`
- **観点 ID**: O26_pii_logging (legal_required=true)
- **severity**: High (法令必須、severity-threshold 除外不可)
- **検出根拠**: `_shared/analytics/001_analytics_SPEC.md §6.1` で Clerk user id の SHA-256 hash 化は明示されているが、error.message / breadcrumb / Slack 通知文中の email / 位置 / Stripe id / Clerk session token に対するスクラブ機構が未設計。個人情報保護法の委託先漏洩リスク
- **詰めるべき問い**:
  1. スクラブ実装: `beforeSend` + `beforeBreadcrumb` の二段、または event 全体に再帰スクラブ?
  2. スクラブパターン: email / 緯度経度 / Stripe id / Clerk session / Clerk uid raw / カード番号 / 国内電話 (7 種) で十分か?
  3. Slack Webhook 通知文にも同じスクラブを適用するか?
- **候補案**:
  - 案 A (採用): **`scrub<T>(value)` 共通関数を `_shared/analytics/scrubber.ts` に作成、`Sentry.init({ beforeSend, beforeBreadcrumb })` + Slack 通知の両方に適用** (上記 7 パターン)
  - 案 B (非採用): Sentry の組込み Data Scrubbing 機能 (server-side) のみで対応 — クライアント送信時点で既に PII が含まれており、ネットワーク経路で流出する可能性
- **推奨**: **案 A 採用**
- **判断期限**: `/flow:tdd` `_shared/analytics` 着手前 (α 公開前必須)
- **担当**: seiji
- **L1 レポート**: `./SECURITY_REVIEW_20260523.md#sec-004`

### [論点-008] 季節レコメンド (UC5) の南半球対応

- **status**: `open` (MVP は北半球前提で実装済、memory SPEC / INDEX が本論点を参照)
- **影響範囲**: `docs/memory/` / §1.1 UC5
- **背景**: 「去年の今頃」レコメンドは月ベースで季節を推定 (memory 実装)。南半球ユーザーは季節が反転するため、緯度ベースの季節補正が必要になる可能性。本論点は memory SPEC で参照されていたが concept §8 に未登録だった drift を本 UPDATE で解消 (D20260524-027)
- **詰めるべき問い**:
  1. MVP は北半球前提のままで良いか (§1 ユーザー = 国内想定のため当面問題なし)?
  2. 海外展開時に緯度から南北半球を判定し季節ラベルを反転するか?
- **推奨**: **MVP は北半球前提のまま (国内向け)。海外展開検討時に緯度補正を追加**
- **判断期限**: 海外展開検討時 (MVP 範囲外)
- **担当**: seiji

### [論点-009] お問い合わせフォーム実装方針

- **status**: `open` (方向性は確定、実装タイミングが open)。AI_LOG/INDEX では open 追跡済だが concept §8 未登録だった drift を本 UPDATE で解消 (D20260524-027)
- **影響範囲**: `legal/` (フッタ + `/legal/contact`、§9.4 特商法の連絡先が依存) / `account/` (UI 配置候補) / §6
- **詰めるべき問い**:
  1. 自前フォーム (Vercel Function + Resend 無料枠) vs SaaS (Formspree / Tally)?
  2. URL は `/legal/contact` (法務・問合せ系を 1 箇所集約) か `/account/contact` か?
- **推奨**: **自前フォーム (Vercel Function + Resend 無料枠) + URL は `/legal/contact`** (BaaS Pivot 後の構成に読み替え。法務系を 1 箇所集約)
- **判断期限**: **α 公開前** (有償提供時は特商法表記・プラポリの「連絡先」として `/legal/contact` が必須。当初「account 着手前」だったが期限超過のため α 公開前ゲートに更新)
- **担当**: seiji

### [論点-010] 月次集計の規模拡大運用 (BigQuery / Materialized View)

- **status**: `open` (将来 defer)。AI_LOG/INDEX で open 追跡済の drift を本 UPDATE で解消
- **影響範囲**: §4.6.4.1 収益エクスポート / `_shared/analytics` / `billing`
- **詰めるべき問い**: 月数百件超で月次 cron 集計に遅延が出たら BigQuery 連携 or Materialized View のどちらで対応するか?
- **推奨**: **MVP は Neon 上の月次 cron 集計のまま。月 100 件超で遅延が顕在化したら Materialized View → BigQuery の順で検討**
- **判断期限**: 月 100 件超 (中規模商用移行時、MVP 範囲外)
- **担当**: seiji

---

## 9. 法務・コンプライアンス書類

### 9.1 必須書類チェックリスト

| 書類 | 必要性 | 状態 | 配置パス / URL | 備考 |
|---|---|---|---|---|
| プライバシーポリシー | ✅ | 未作成 | `/legal/privacy` | 画像 + 位置情報 + ユーザー識別、AI 送信を扱う公開 PJ、個人情報保護法対応必須 |
| 利用規約 | ✅ | 未作成 | `/legal/terms` | 公開 PJ、PWYW 課金あり |
| 特定商取引法に基づく表記 | ✅ | 未作成 | `/legal/specified-commercial-transactions` | 日本国内 + 有償課金 (PWYW + 一回課金) のため必須 |
| Cookie ポリシー | △ (利用分析導入時) | 未作成 | `/legal/cookies` | [論点-005] と連動、MVP では Sentry のみで minimal |
| AI 利用同意 (個別) | ✅ | 未作成 | 初回画像アップロード時の同意ダイアログ | 「OpenAI に画像送信される」旨を 1 回明示同意 |

### 9.2 対応地域法規

| 法規 | 対象ユーザー有無 | 対応方針 |
|---|---|---|
| GDPR (EU) | ❌ | 国内向け、EU ユーザー想定しない (アプリ全文日本語、対応外明記) |
| CCPA / CPRA (米加州) | ❌ | 同上 |
| 個人情報保護法 (日本) | ✅ | 取得目的明示 (撮影画像 + 位置 + 識別子) / 第三者提供同意 (OpenAI 送信) / 開示請求窓口メール公開 |
| その他 | ❌ | — |

### 9.3 書類作成方針

- **作成手段**: 自前ドラフト (テンプレ参考: Iubenda / 既存 SaaS のプラポリ) + α 公開前に法務知見ある人にレビュー依頼
- **配置場所**: `docs/legal/` 配下に原稿、公開時は `<app>/legal/` ルート (Next.js or Vite で静的配信)
- **公開導線**:
  - フッタリンク (全ページ): プラポリ / 利用規約 / 特商法表記 / お問い合わせ
  - 会員登録時の同意チェックボックス (プラポリ + 利用規約、`consent_logs` に同意記録)
  - 初回画像アップロード時の AI 利用同意ダイアログ
  - (任意) 初回起動 Cookie バナー (Sentry opt-in、[論点-005] と連動)
- **改訂時の運用**:
  - プラポリ / 利用規約改訂時はアプリ内通知 + メール、次回ログイン時に再同意取得
  - `consent_logs` で改訂前後の同意状態をトレース

### 9.4 特定商取引法 (日本国内 + 有償時)

- **販売事業者**: seiji (個人事業主、未開業の場合は「請求あれば遅滞なく開示」記載で氏名公開不要、ただし開業届提出推奨)
- **代表者**: seiji
- **所在地**: バーチャルオフィス利用検討 (個人住所開示回避)、開業確定後に決定
- **連絡先**: 公開用メールアドレス (Gmail / 独自ドメイン)、電話は「請求あれば遅滞なく開示」
- **販売価格・支払方法・引渡時期・返品条件**:
  - 単発課金 (AI 同定追加枠): 100 円 (税込) / 10 回追加 / Stripe Checkout / 即時付与 / デジタルコンテンツのため返品不可 (購入前に説明)。ゲスト (未連携) でも購入可 (revise_001)
- **動作環境**: 主要ブラウザ最新 (Chrome / Safari / Edge)、モバイル iOS Safari 15+ / Android Chrome 100+

---

## 10. Git リポジトリ・運用 (Q12.9 由来)

> 共通プロトコル: `~/.claude/flow-data/git-commit-policy.md`。本セクションは PJ オーバーライド層。

### 10.1 リポジトリ情報

| 項目 | 値 |
|---|---|
| リポジトリ URL | (未定、`git init` のみローカル) |
| 可視性 | private (初期、公開時に public 切替検討) |
| ホスティング | GitHub (推奨、確定後に origin set) |
| デフォルトブランチ | main |

### 10.2 ブランチ戦略

- **採用戦略**: Trunk-based + Protected main (個人 PJ だが事故防止)
- **protected_branches**: `[main]`
- **auto_branch_prefix**: `flow/` (flow コマンド自動切替時の prefix、形式: `flow/<command>-<YYYYMMDD>`)
- **PR 要件**: MVP 段階は単独開発のため PR レビューなし、main 直 push 可だが flow コマンドは feature ブランチ経由を推奨

### 10.3 コミット規約

- **採用形式**: Conventional Commits (`<type>(<scope>): <subject>`)
- **flow コマンド自動コミット**: `docs(flow:<command>): <target> — <一行要約>`
- **言語**: ja (日本語)
- **squash 戦略**: PR マージ時 squash (origin が GitHub に決まったら)

### 10.4 リリースタグ規約

- semver (`v1.0.0` = MVP α、`v1.1.0` 以降は機能追加、`v2.0.0` で破壊的変更)
- GitHub Releases + 自動 changelog (確定後に release-please 等導入)

### 10.5 CI / CD ワークフロー

- ワークフロー定義: 未定 (origin set 後に `.github/workflows/` で設定)
- 想定主要ジョブ:
  - lint / typecheck (eslint + tsc) — PR ごと
  - vitest 単体テスト — PR ごと
  - Playwright E2E (smoke) — PR ごと、フル E2E は nightly
  - Vercel auto deploy — main マージ時
  - Dependabot — 週次依存更新 PR

### 10.6 flow コマンド自動コミット方針

```yaml
auto_commit: true
branch_strategy: trunk-based
commit_message_lang: ja
protected_branches: [main]
auto_branch_prefix: "flow/"
staging_extra_paths: []
staging_exclude_paths: []
```

- `--no-commit` で都度抑制可
- 詳細挙動・skip 条件・dirty 対応は `~/.claude/flow-data/git-commit-policy.md` §1-§6 を参照

### 10.7 セキュリティ

- `.env*.local` / `secrets.*` を `.gitignore` で除外 (perspectives O25 連携)
- 秘密情報の誤コミット検知: pre-commit hook で gitleaks (将来導入)
- **公開 OK (frontend bundle 可)**: `VITE_CLERK_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` / `SENTRY_DSN`
- **Vercel Function env only (frontend 露出禁止)**: `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SIGNING_SECRET` / `DATABASE_URL` (Neon) / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `OPENAI_API_KEY` / `SLACK_QUOTA_WEBHOOK_URL` / `SLACK_REVENUE_WEBHOOK_URL`
- Vercel env スコープ: Production / Preview / Development を分離、preview は dev Neon branch を指す

## 11. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (wants.md ベース、idea I20260522-005 起点) | /flow:concept |
| 2026-05-22 | 認証フローを「匿名スタート + Google OAuth 後リンク」に変更 (charter §1.1 適合、気軽さ最優先)。§1.2 / §3 / §4.1 / §4.3 / §5.1 / §6 / §7 / §8 ([論点-001] 修正 + [論点-006] [論点-007] 新規追加) を更新 | /flow:concept (UPDATE、seiji 指摘) |
| 2026-05-22 | flow:concept 更新版に追随: §4.7 公開戦略・ドメイン・リバースプロキシ / §4.8 サービス公開周知 / §10 Git リポジトリ・運用 を追加 (旧 §10 → §11 に繰り下げ)。Q12.9 / Q12.10 / Q12.11 / perspectives O22/O29/O31 / charter §1.6 反映 | /flow:concept (UPDATE、コマンド更新の retroactive 適用) |
| 2026-05-22 | **BaaS Pivot** (charter §0.2 + perspectives O32 連携): Supabase → Neon + Vercel + Clerk + Cloudflare R2 + Drizzle ORM に全面切替。§4.1〜4.3 / §4.5 / §4.6.2-3 / §5 (RLS は Drizzle 層に移行) / §6 / §10.7 を書き換え。理由: Supabase 無料 2 プロジェクト制約はマイクロサービス連発に不適合、Neon は無料 10 DB 並立 (D20260522-114〜119) | /flow:concept (UPDATE、BaaS Pivot) |
| 2026-05-23 | `/flow:secure` プロダクト全体 L1+L2 実施。検出 6 件 (Critical 2 / High 2 / Medium 2) を [論点-011]〜[論点-014] として §8 に登録。L2 チェックリスト 5 件を `_shared/{auth,ai,storage,analytics,db}/902_*.md` に配置。L4 依存スキャンはロックファイル不在で skip (TDD 着手後に再実行) (D20260523-001〜018) | /flow:secure (プロダクト全体) |
| 2026-05-24 | **§8 未決事項の棚卸し** (`AUDIT_20260523_1825.md` 推奨 #1-#2 + SEC-007 closure 反映)。解決済み 7 論点 ([論点-002/003/004/007] 機能設計で確定 + [論点-012/013/015] SEC-002/003/007 closed) を §7 決定事項ログへ移動 + §8 から削除。open 維持 = [論点-001/005/006/011/014]。memory SPEC 参照の [論点-008] 南半球 season drift を §8 に追記 (D20260524-024〜029) | /flow:concept (UPDATE、棚卸し) |
| 2026-05-25 | **BaaS Pivot 伝播漏れの整合性修正** (冪等再実行 / 整合性チェック)。D20260522-114 の Supabase → Neon+Clerk+R2 切替で取り残された ~13 箇所を修正: §1.2 認証 (Clerk Guest β) / §1.3.2 横断責務 (Drizzle 認可・Clerk・R2) / §1.4 実装構成 (実装済み `api/` + `drizzle/` 構成に追随) / §2 無料枠 (Neon+R2+Clerk) / §4.6.5 BEP (Neon Launch $19 で再計算) / §4.6.6-7 アラート・撤退 / §4.7.2 構成図 (Vercel Fn→Neon/Clerk/R2) / §4.7.4-5-7 サブドメ・撤退手順・PITR / [論点-001] パスキー (Clerk)。履歴・§4.3 代替候補・§7 決定ログの Supabase は正当として保護 | /flow:concept (再実行、drift 修正) |
