# hana-memo / 植物の名前わかるんメモ

> **一行で言うと**: 散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA。

| 項目 | 内容 |
|---|---|
| ユーザー | 直接 = 最終読者 = 散歩 / 通勤 / 園芸が日常にある人。副次: 子供の自然学習をしたい親、植物初心者 |
| 解決する課題 | 散歩中に見つけた草花の名前を調べないまま忘れる / 既存アプリは「同定」が主役で「自分のノート」が脇役 |
| 提供価値 | 「自分の発見ノート」を主役、AI 同定はそれを支える脇役。SNS 機能・競争・中毒性を排した自分のペースの発見体験 |
| 現フェーズ | 企画 → MVP 設計中 |
| 最終更新 | 2026-05-22 |

---

## 1. プロダクト概要

散歩・通勤・園芸の途中で見つけた草花を 1 タップで撮影 → AI (OpenAI Vision) が植物名を 1〜3 候補で提示 → ユーザーが選択 or 訂正 or「分からないまま保存」できる PWA。蓄積された発見はタイムライン / 地図 / 図鑑モードで振り返れ、月次・季節別の植物発見ノートとして育っていく。

既存代替手段 (PictureThis / GreenSnap / Google Lens / iNaturalist) は「同定機能」や「SNS コミュニティ」が主役で「自分のノート」が脇役だが、本サービスは「自分の発見ノートが主役、AI 同定はそれを支える脇役」という設計反転で空白を埋める。SNS・ランキング・他人との比較は意図的に入れない。

### 1.1 主要ユースケース
1. **UC1 発見の記録**: 散歩中に草花を撮影 → AI が名前を 1-3 候補で提示 → ユーザーが選択 / 訂正 / 「分からないまま保存」も可
2. **UC2 ノートを見返す**: 月次 / 季節別 / 場所別に記録を振り返り (タイムライン / 地図 / 図鑑モード)
3. **UC3 図鑑化**: 蓄積した発見を PDF 図鑑として書き出し (PWYW 課金で高解像度・カスタムレイアウト)
4. **UC4 親子学習**: 親子で散歩しながら撮影、家に帰って一緒に名前を確認 (教育用途)
5. **UC5 季節レコメンド**: 「去年の今頃に見た花」を自動レコメンド (年比較)

### 1.2 スコープ
**含むもの**:
- 撮影 → AI 同定 → 保存の中核フロー
- 個人のノート閲覧 (タイムライン / 地図 / 図鑑)
- 図鑑 PDF 出力 (PWYW)
- 季節レコメンド (アプリ内バッジ)
- **認証**: 起動時に Supabase Anonymous Auth で自動 UUID 発行 → 撮影・保存・10 回無料枠まで匿名で完結。「他端末で見たい」「課金したい」となった時に Google OAuth で**後リンク**して永続化
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
| `docs/export/` | 図鑑 PDF 出力 (UC3) | PDF プレビュー画面・課金導線・ダウンロード | `notebook`, `_shared/storage`, `billing` | 5 | ❌ |
| `docs/memory/` | 季節レコメンド「去年の今頃」(UC5) | アプリ内バッジ・レコメンドフィード | `notebook` | 5 | ❌ |
| `docs/billing/` | PWYW + content-unlock 課金 (AI 同定追加枠 / PDF 出力) | 課金画面・履歴 | `account`, `_shared/ai` (使用量参照) | 4 | ❌ |
| `docs/legal/` | プラポリ / 利用規約 / 特商法表記 / 同意 UI / Cookie バナー | `/legal/*` 配下静的ページ・同意 UI | (なし) | 1 | ❌ |

#### 1.3.2 横断フォルダ（機能をまたぐ技術設計）

| フォルダ | 責務 | 含む設計 | 依存 | 優先度 | 基盤 |
|---|---|---|---|---|---|
| `docs/_shared/db/` | DB スキーマ・マイグレーション・RLS ポリシー | テーブル定義 (users / plants / discoveries / images / api_usage) / インデックス / Supabase RLS | (なし) | 1 | ✅ |
| `docs/_shared/types/` | TypeScript 共通型 | DTO / Supabase 型生成 / API 入出力型 | (なし) | 1 | ✅ |
| `docs/_shared/helpers/` | ヘルパ・ユーティリティ | 日付処理 / 画像 WebP 変換 / EXIF 削除 / 位置情報丸め | (なし) | 1 | ✅ |
| `docs/_shared/analytics/` | 計測基盤 (Sentry + 自前コストログ) | エラー報告 / OpenAI API call ログ / コスト集計 / .env 単価管理 | (なし) | 1 | ✅ |
| `docs/_shared/auth/` | 認証・認可基盤 | Supabase Auth ラッパ / セッション管理 / RLS 連携 | `_shared/db` | 2 | ✅ |
| `docs/_shared/storage/` | ストレージ | Supabase Storage ラッパ / 画像アップロード / private bucket / 署名 URL | `_shared/db` | 2 | ✅ |
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

> Q11 で Vite + React + TypeScript + Supabase を確定したため、フロント SPA + BaaS テンプレートを採用。
> あくまでたたき台。実装フェーズで詳細化・組み替えが起きることを前提に、**機能境界の名前は §1.3 機能フォルダと揃える**。

```
src/
  features/           # 機能単位（§1.3.1 と命名統一）
    account/
    capture/
    notebook/
    export/
    memory/
    billing/
    legal/
  shared/             # 横断（§1.3.2 と命名統一）
    db/               # Supabase クライアント + 型
    types/
    helpers/          # 画像変換 / EXIF / 位置丸め / 日付
    analytics/        # Sentry + コストログ
    auth/             # Supabase Auth ラッパ
    storage/          # Supabase Storage ラッパ
    ai/               # OpenAI Vision クライアント
  components/         # 共通 UI 部品 (shadcn/ui ベース)
  hooks/              # 共通フック
  routes/             # React Router or TanStack Router
  pages/              # 各画面 (route handler を兼ねる場合あり)
  main.tsx
  App.tsx
supabase/             # Supabase CLI 管理
  migrations/         # SQL マイグレーション
  functions/          # Edge Functions (画像処理補助等)
  config.toml
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
  - Supabase 無料枠厳守 (DB 500MB / Storage 1GB / Auth 50K MAU)
  - Vercel Hobby 無料枠厳守 (帯域 100GB/月)
  - OpenAI API のみ従量課金 (gpt-4o-mini Vision、ユーザー月 10 回無料、超過は content-unlock 課金で吸収)
- **体制・予算・納期**:
  - seiji 単独 / 初期 $0 / 運用月額 $0-30 (DAU 30-300 想定) / MVP 1-2 ヶ月、α 公開 2 ヶ月以内

---

## 3. 非機能要件

| 項目 | 目標値 | 根拠 |
|---|---|---|
| 性能 | 撮影 → AI 同定 → 結果表示まで 5 秒以内 (P95) | UX 体感許容、wants.md 確定 |
| 可用性 | SLA なし、Supabase / Vercel 標準稼働 | 個人開発、SLA 提供は不可能 |
| セキュリティ | 画像は Supabase Storage の private bucket、ユーザー本人のみ署名 URL でアクセス。RLS で `auth.uid()` 行単位制御 (匿名 user_id でも有効) | 個人写真の流出防止 |
| プライバシー | 位置情報は default OFF、ON 時は ~100m 丸めをデフォルト ([論点-004])、共有時は EXIF 削除 | 散歩ルート特定リスク回避、個人情報保護法対応 |
| 起動摩擦 | 初回起動 → 撮影まで 0 タップの認証 (匿名 Auth 自動発行) | charter §1.1「無料で触り始められる」適合、気軽さ最優先 |
| データ永続性 | 匿名のままだとブラウザストレージクリア / 機種変更でデータ消失リスクあり → アプリ内で「リンク推奨」バナー表示 | 匿名スタートのトレードオフを UI で明示 |
| 運用・監視 | Sentry 無料枠でエラー監視、自前コストログで OpenAI 使用量を日次集計、Supabase / Vercel 無料枠超過アラート (80% / 100% / 120%) | 個人運用で破綻しない最小構成 |
| AI 同定精度 | gpt-4o-mini Vision で「日本の散歩で見かける一般的な植物」を上位 1 候補で 70%、上位 3 候補で 85% を目標 (運用検証で調整) | 既存サービス比較から仮置き、PoC で精度測定し閾値再設定 |
| AI コスト上限 | DAU 300 までは月額 $30 以内 (ユーザー月 10 回無料 + 超過は課金で回収) | 無料枠厳守ポリシー、課金で AI コストを吸収する設計 |
| スケール上限 | DAU 300 で Supabase 無料枠到達想定 → Pro プラン ($25/月) 移行ポイント | wants.md データ規模感から算出 |

---

## 4. 全体アーキテクチャ

```
[Browser PWA]
   ├─ Vite + React + TS + Tailwind + shadcn/ui
   ├─ vite-plugin-pwa (Service Worker + offline cache)
   ├─ 画像取得 (camera API) → WebP 変換 + EXIF 削除 → リサイズ
   │
   ├──→ [Supabase] (BaaS)
   │      ├─ Auth: Anonymous (default、起動時 UUID 自動発行) + Google OAuth Linking (opt-in、課金時必須)
   │      ├─ PostgreSQL (users / discoveries / plants / images / api_usage)
   │      ├─ Storage (private bucket: original / thumbnail)
   │      ├─ Edge Functions (補助: 画像後処理 / OpenAI 中継)
   │      └─ RLS (auth.uid() で行単位アクセス制御、匿名 user_id も有効)
   │
   ├──→ [OpenAI API] (Vision)
   │      └─ gpt-4o-mini で植物同定 + 育成情報生成
   │           (位置 + 季節 + 履歴を prompt 注入、store=false)
   │
   ├──→ [Sentry] (エラー監視、無料枠)
   │
   └──→ [Vercel] (ホスティング, Hobby 無料枠)
```

### 4.1 主要コンポーネント

| 名前 | 責務 | 技術領域 (具体名は例示) |
|---|---|---|
| PWA フロント | UI / 撮影 / オフライン同期 / 画像前処理 | Vite + React + TS + Tailwind + vite-plugin-pwa |
| BaaS | DB / Auth / Storage / Edge Functions | Supabase |
| AI 同定 | 植物画像 → 名前 + 育成情報 | OpenAI gpt-4o-mini Vision |
| 計測 | エラー監視 + API 使用量集計 | Sentry + 自前 PostgreSQL テーブル (api_usage) |
| ホスティング | 静的配信 + Edge | Vercel Hobby |
| 課金 | PWYW + content-unlock | Stripe (Checkout) or Paddle (Phase 2 で確定) |

### 4.2 技術スタック（方向性）
- **フロント**: モダン SPA + PWA（例: Vite + React + TypeScript + Tailwind + shadcn/ui + vite-plugin-pwa）
- **バック**: BaaS（例: Supabase 無料枠: DB + Storage + Auth + Edge Functions）
- **データ層**: マネージド PostgreSQL（例: Supabase）+ private object storage（例: Supabase Storage）
- **AI**: 商用 Vision LLM（例: OpenAI gpt-4o-mini）
- **インフラ**: サーバーレス静的ホスティング（例: Vercel Hobby）
- **監視・ログ**: エラー追跡 SaaS（例: Sentry 無料枠）+ 自前 API 使用量ログ
- **CI/CD**: クラウド CI（例: GitHub Actions、Vercel preview deploy 連携）

### 4.3 リソース選定たたき台

> **注**: 各サービスの pricing は変動する。実際の採用判断時は必ず最新の公式 pricing を確認。
> 以下は概念設計時点での選定根拠と桁感 (USD 月額) を示すたたき台。商用化想定は段階的（MVP 無料運用 → 課金導入で AI コスト吸収）。

| カテゴリ | 推奨具体名 | 代替候補 | 選定根拠 | 想定単価 (USD/月、桁感) |
|---|---|---|---|---|
| フロント FW | React + TypeScript | Vue + TS / SvelteKit | エコシステム + AI Coding 親和性 + shadcn/ui 採用 | $0 (OSS) ※ 2026-05 時点想定、最新 pricing 要確認 |
| ビルドツール | Vite | Next.js / Astro | SPA + PWA で十分、サーバー不要 | $0 ※ 同上 |
| 状態管理 | Zustand + TanStack Query | Redux Toolkit / Jotai | 軽量、Supabase クライアントとの相性 | $0 ※ 同上 |
| UI ライブラリ | Tailwind CSS + shadcn/ui | Chakra UI / MUI | カスタマイズ柔軟 + shadcn の copy-paste 性 | $0 ※ 同上 |
| PWA | vite-plugin-pwa | Workbox 直接 | Vite ネイティブ統合 | $0 ※ 同上 |
| BaaS | Supabase | Firebase / Convex / Pocketbase | OSS + Postgres + Storage + Auth 一式無料枠で揃う | $0 (無料枠) → $25 (Pro) ※ 同上 |
| DB | PostgreSQL (Supabase) | (同上に内包) | SQL + RLS + 拡張性 | (BaaS 内包) ※ 同上 |
| 認証 | Supabase Anonymous Auth (default) + Google OAuth Linking (opt-in、課金時必須) | Auth0 / Clerk / 自前 / 認証なし (ブラウザローカルのみ) | charter §1.1「無料で触り始められる」適合 + 後リンクでデバイス間同期 | $0 (匿名含めて無料枠 50K MAU) ※ 同上 |
| 画像ストレージ | Supabase Storage (private bucket) | Cloudflare R2 / S3 | BaaS 内包 + 署名 URL 対応 | $0 (1GB 無料) → 従量 ※ 同上 |
| 画像処理 | ブラウザ Canvas API + browser-image-compression | Sharp on Edge Function | クライアント完結でコスト 0 | $0 ※ 同上 |
| AI Vision | OpenAI gpt-4o-mini Vision | Anthropic Claude Vision / Google Gemini Vision / PlantNet API | 安価 ($0.001/req) + 同定精度 + 日本語植物名対応 | $1〜$30 (DAU 30→300) ※ 単価は OpenAI 公式 pricing で要確認 |
| ホスティング | Vercel Hobby | Cloudflare Pages / Netlify | Vite 親和性 + プレビューデプロイ | $0 (Hobby) ※ 同上 |
| エラー監視 | Sentry (Free) | LogRocket / Datadog | エラー 5K/月無料、個人ツールに十分 | $0 (Free) ※ 同上 |
| アナリティクス | (MVP 見送り → 自前コストログのみ) | PostHog Cloud / GA4 | 利用分析は α 後に判断 [論点-005] | $0 ※ 同上 |
| CI/CD | GitHub Actions | CircleCI / Vercel Preview のみ | GitHub 無料枠 + Vercel preview 自動 | $0 ※ 同上 |
| ドメイン | お名前.com / Cloudflare Registrar | Google Domains 後継 | カスタムドメイン (例: hana-memo.app) | $1-2/月 (年 $12-24) ※ 同上 |
| 課金 | Stripe Checkout | Paddle / Pay.jp | PWYW + content-unlock + 日本対応 | $0 + 手数料 3.6% + ¥40 ※ 同上 |
| 法務書類 | テンプレ採用 (Termly / 自前ドラフト + 適宜法務確認) | 弁護士フル委託 | 個人ツール、初期はテンプレで開始 | $0-50 (テンプレ SaaS) ※ 同上 |

### 4.4 想定コストサマリ

| 区分 | 月額目安 (USD) | 内訳の例 |
|---|---|---|
| 個人・無料枠 | $0 | Supabase 無料 + Vercel Hobby + Sentry Free + ドメイン年 $12-24 別途 |
| MVP α 公開 (DAU 10-30) | $1〜$3 | + OpenAI ($1-3) |
| スモール商用 (DAU 100) | $10〜$30 | + OpenAI ($10) + Supabase Pro 移行候補 ($25 if 無料枠超過) |
| 中規模 (DAU 300+) | $30〜$80 | + OpenAI ($30) + Supabase Pro ($25) + ドメイン + 課金手数料 |

**本プロジェクトのレンジ**: **個人・無料枠 → MVP α 公開 → スモール商用**（段階移行）
**根拠**: seiji 単独運用、初期 $0、AI コストは課金で吸収する設計。Supabase Pro 移行は DAU 100-300 到達時に判断（§4.6 撤退基準と連動）。

### 4.5 ローカル開発環境計画

#### 4.5.1 開発スタイル
**選定**: BaaS local (Supabase CLI)
**理由**: §4.3 で Supabase 採用、Supabase CLI が内部で docker を使い DB + Storage + Auth エミュレータを起動。フロントは Vite dev server。

#### 4.5.2 必要サービス（ローカル起動対象）

| サービス | 役割 | ローカル起動方式 | ポート | 永続化 |
|---|---|---|---|---|
| Supabase Postgres | DB | supabase start (docker 内部) | 54322 | volume |
| Supabase Auth | 認証エミュレータ | 同上 | 54321 (API) | volume |
| Supabase Storage | ストレージエミュレータ | 同上 | 54321 (API) | volume |
| Supabase Studio | DB GUI | 同上 | 54323 | (なし) |
| Inbucket | メールキャプチャ | 同上 | 54324 | (なし) |
| Vite dev server | フロント開発 | npm run dev (ホスト) | 5173 | host-fs |
| OpenAI API | 本番接続 (モックなし、無料枠で開発) | `.env.local` の API キー | — | — |

#### 4.5.3 環境変数・シークレット管理

- **`.env.example`**: 必須キー一覧（ダミー値、Git コミット可）
- **`.env.local`**: 実値（Git コミット禁止、`.gitignore` 必須）
- **シークレット管理方針**: 平文 `.env.local`（個人開発、後で direnv or 1Password CLI 検討）
- **平文コミット禁止項目**:
  - `OPENAI_API_KEY`
  - `SUPABASE_ANON_KEY` (アプリ側、本番)
  - `SUPABASE_SERVICE_ROLE_KEY` (Edge Function のみ)
  - `STRIPE_SECRET_KEY` (本番)
  - `SENTRY_DSN` (本番)
- **コスト単価管理 (§4.6.2)**:
  - `COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS=0.00015`
  - `COST_OPENAI_GPT4O_MINI_PER_1K_OUTPUT_TOKENS=0.0006`
  - `COST_OPENAI_GPT4O_MINI_PER_IMAGE=0.001` (vision)
  - `COST_SUPABASE_STORAGE_PER_GB_PER_MONTH=0.021`
  - `COST_SUPABASE_DB_PER_GB_PER_MONTH=0.125`
  - (※ 2026-05 時点想定、最新 pricing で要更新)

#### 4.5.4 起動・停止・リセットコマンド

| 操作 | 抽象表現 | 例 |
|---|---|---|
| 起動 | 全サービス起動 | `supabase start && npm run dev` |
| 停止 | 全サービス停止 | `supabase stop` (フロントは Ctrl+C) |
| ログ | サービスログ追従 | `supabase logs` |
| リセット | データ含む完全リセット | `supabase db reset` |
| マイグレーション | スキーマ適用 | `supabase migration up` |
| 型生成 | DB から TS 型自動生成 | `supabase gen types typescript --local > src/shared/types/supabase.ts` |

#### 4.5.5 開発フロー上の留意点

- **初回セットアップ**: docker pull 数 GB、初回 5-10 分
- **マイグレーション**: `supabase start` で自動適用、手動は `supabase migration up`
- **シードデータ**: `supabase/seed.sql` に置く
- **ホットリロード**: Vite HMR (フロント) / Supabase Studio で SQL 直接実行
- **OS 別差異**:
  - Mac (Apple Silicon): docker desktop or OrbStack
  - WSL2 (Windows): WSL 内で docker 起動推奨
  - Linux: docker engine 直接
- **OpenAI 開発**: モックせず本番 API 接続、`.env.local` の使用量を Sentry でも追跡

#### 4.5.6 CI/CD との関係

- **CI 環境**: GitHub Actions で `supabase start` を実行可（docker 利用可能ランナー）
- **本番との差異**: ローカルは emulator 版 Auth、本番は実 Google OAuth。違いは `.env.production` で吸収
- **E2E テスト**: Playwright + Supabase local emulator の組み合わせ、CI でも同様に動作

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
1. **呼び出しログの積算記録**: OpenAI API call を 1 件ごとに `api_usage` テーブルに記録
   - カラム: `user_id`, `service`, `endpoint`, `input_tokens`, `output_tokens`, `image_count`, `success`, `latency_ms`, `created_at`
2. **単価表は `.env` で管理** (§4.5.3 参照):
   - `COST_OPENAI_GPT4O_MINI_PER_IMAGE`, `COST_OPENAI_GPT4O_MINI_PER_1K_INPUT_TOKENS`, etc.
3. **概算コスト算出**: `usage × .env 単価` を Edge Function or 日次バッチで集計し、`api_usage_daily` ビュー / マテビューに書き出す
4. **精度検証**: 月次で OpenAI ダッシュボードと突合、誤差 > 10% で単価更新
5. **アラート閾値**:
   - OpenAI 月次予算 ($30) の 80% / 100% / 120% で Slack / メール / Sentry にアラート
   - Supabase 無料枠 (DB 500MB / Storage 1GB) の 80% / 100% で同様

#### 4.6.3 追跡するコスト指標

| 指標 | 集計頻度 | 集計元 | 備考 |
|---|---|---|---|
| OpenAI API コスト (gpt-4o-mini) | 日次 / 月次 | `api_usage` × .env 単価 | §4.6.2 メカニズム |
| Supabase Storage 使用量 | 日次 | Supabase ダッシュボード or `pg_stat_user_tables` | 1GB 無料枠監視 |
| Supabase DB 使用量 | 日次 | Supabase ダッシュボード | 500MB 無料枠監視 |
| Supabase Auth MAU | 月次 | Supabase ダッシュボード | 50K MAU 無料枠監視 (実質余裕) |
| Vercel 帯域 | 日次 | Vercel ダッシュボード | 100GB/月 無料枠監視 |
| Sentry エラー件数 | 日次 | Sentry ダッシュボード | 5K/月 無料枠監視 |
| インフラ総額 (合算) | 月次 | 上記合算 | §4.6.6 レビュー入力 |

#### 4.6.4 追跡する収益指標（スモール商用到達時のみ）

| 指標 | 計測元 | 備考 |
|---|---|---|
| 単発課金件数 (AI 追加枠) | Stripe API | 月 11 回目以降の 100 円 × 20 回追加 |
| 単発課金件数 (図鑑 PDF) | Stripe API | 500 円 × 件数 |
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

- **固定費**: ドメイン $1-2/月 + (将来) Supabase Pro $25/月
- **変動費**: OpenAI ($0.001/同定 × 件数) + Stripe 手数料 (3.6% + ¥40)
- **想定 ARPU**: 100 円 × 月 1 回課金 = ¥100/月/課金者
- **BEP 例 (Supabase Pro 移行後)**: 月 $25 + ドメイン $2 = $27 ÷ ARPU($0.66/月) ≒ 課金ユーザー 41 人 (DAU 100-200 程度)
- **BEP 到達予測**: α 公開 → 6 ヶ月後 (粗い見立て、運用で再計算)

#### 4.6.6 レビューサイクル

| サイクル | 内容 | 参加者 |
|---|---|---|
| 日次 (自動) | OpenAI 使用量 + Supabase 無料枠 + Sentry エラー件数アラート | システム自動 |
| 月次 (人間) | §4.6.3 コスト指標 + §4.6.4 収益指標 (商用到達後) + BEP 進捗 | seiji |
| 四半期 (人間) | 中期トレンド + 撤退判断ゲート評価 + idea registry feedback (`~/ideas/feedback/`) | seiji |

#### 4.6.7 継続 / 縮退 / 撤退判断基準

| 判断 | 基準 | 対応 |
|---|---|---|
| 継続 | コスト < $30/月 (MVP 期) または BEP 到達 (商用期) | 通常運用 |
| 縮退 | OpenAI 月 $30 超過 + 課金回収率 < 100% | AI 機能を月 5 回無料に制限 / 課金単価見直し |
| 一時停止 | Supabase 無料枠 100% 超過 + Pro 移行未決 | 新規受付停止 / 既存ユーザー優先 |
| 撤退 | DAU が 3 ヶ月連続 < 5 + 課金 0 + 改善見込みなし | サービス終了プロセス (データエクスポート提供 → 課金停止 → DB 削除) |

**本 PJ の撤退基準**: 上表の通り。**個人ツールとして「楽しみながら作る」要素もあるため、撤退判断は経済性だけでなく『自分が使い続けたいか』も含めて四半期レビューで判断**。

#### 4.6.8 判断主体と決裁プロセス

- **判断主体**: seiji 単独
- **判断ログ**: 月次・四半期レビュー結果は `docs/AI_LOG/` のレビューセッションファイル (`D<date>_<sess>_review_<period>.md`) に記録 (将来の `/flow:review` で運用)
- **撤退時の対応手順**:
  1. ユーザーへ告知 (アプリ内通知 + メール、最低 30 日前)
  2. データエクスポート手段提供 (CSV + 画像 zip)
  3. Stripe 課金停止 (新規 + 既存)
  4. Supabase / Vercel / OpenAI / Sentry のキー無効化
  5. データ削除 (告知期間終了後)

### 4.7 公開戦略・ドメイン・リバースプロキシ (Q12.10 由来、perspectives O29)

> マイクロサービスの**撤退リスク最小化**を主軸。「閉じる前提でも違和感ない」構成。

#### 4.7.1 ドメイン情報
- **既存ドメイン**: なし (新規取得検討)
- **MVP 公開 URL**: `hana-memo.vercel.app` (Vercel 提供デフォルトドメイン、撤退時 = プロジェクト削除のみ)
- **正式運用時の取得計画**: 将来 `hana-memo.app` (お名前.com or Cloudflare Registrar、$10-15/年) を検討。MVP では取得しない (撤退リスク回避)
- **理由**: charter §1.1「無料で触り始められる」と整合、αフェーズで「使う人がいる」確証取れてからドメイン取得

#### 4.7.2 公開構成パターン
- **採用パターン**: **(A) PaaS 完結 (Vercel + Supabase)** — 運用負担ゼロ、最推奨
- **構成図**:
  ```
  ユーザー → Vercel CDN (Frontend SPA, /legal/*, /auth/callback)
                   ↓
                Supabase (Auth + DB + Storage + Edge Functions)
                   ↓
                外部 API (OpenAI Vision, Stripe Checkout, Slack Webhook)
  ```

#### 4.7.3 リバースプロキシ設定
- **採用**: なし (PaaS 完結パターン A のため不要)
- **将来 (B) VPS 相乗りに切替時の選定**: Caddy (SSL 自動、推奨)

#### 4.7.4 サブドメ命名規約
- 現状 single-app のためサブドメ運用なし
- 将来分割時: `api.hana-memo.app` (Supabase Edge Function ラッパ等) / `admin.hana-memo.app` (管理画面) / `staging.hana-memo.app` (ステージング)

#### 4.7.5 撤退時の手順 (撤退コスト最小化、§4.6.7 連携)
1. ユーザーに事前通知 (アプリ内バナー + Email 通知、最低 30 日前)
2. データエクスポート機能 (`/export` 機能の CSV + JSON + 画像 ZIP) を強くアナウンス
3. 課金停止 (Stripe: 新規 Checkout 受付停止、過去購入の unlock は保持)
4. **Vercel プロジェクト削除** (デフォルトドメインも同時失効)
5. Supabase プロジェクト pause → 30 日後に delete (法務トレース性確保のため consent_logs 等は user_id null 化のみ)
6. OpenAI / Stripe / Sentry / Slack の API キー revoke
7. データバックアップを 6 ヶ月保管 (個人情報保護法対応)
8. `~/ideas/registry.jsonl` の `adopted_pj` を `status=retired` に更新 (将来実装)

#### 4.7.6 複数 PJ 相乗り時の隔離
- 本 PJ は単独運用 (パターン A) のため該当なし
- 将来 VPS 相乗りした場合は Docker container 別 + DB 別プロジェクト

#### 4.7.7 ロールバック・障害復旧
- Vercel: 過去 deploy へ instant rollback (ボタン 1 つ)
- Supabase: Point-in-Time Recovery (Free 枠でも 7 日まで可)
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

- **users**: Supabase Auth が管理 (id, email?, oauth_provider?, **is_anonymous: bool**, **linked_at: timestamp?**, created_at)
  - 起動時に `is_anonymous=true` で auto-create (Supabase Anonymous Auth)
  - Google OAuth リンク後は `is_anonymous=false`、`email`/`oauth_provider`/`linked_at` が埋まる
  - 匿名 user の SPAM 抑止 ([論点-006]) と移行戦略 ([論点-007]) は要設計
- **discoveries**: 発見レコード (id, user_id, image_id, captured_at, location_lat/lng (任意, ~100m 丸め), plant_candidates[] (JSON), selected_plant_id, user_note, status, created_at, updated_at)
- **plants**: 植物マスタ (id, scientific_name, common_name_ja, family, season_months[], care_info, image_ref) — AI 同定結果をキャッシュして再利用
- **images**: 画像メタ (id, user_id, storage_path, thumbnail_path, original_size_bytes, mime, exif_stripped: bool, created_at)
- **api_usage**: AI 呼び出しログ (id, user_id, service, endpoint, input_tokens, output_tokens, image_count, success, latency_ms, created_at) — §4.6.2 コスト集計の源泉
- **billing_unlocks**: 課金履歴 (id, user_id, sku, amount_jpy, stripe_session_id, unlocked_at, expires_at?)
- **user_settings**: ユーザー設定 (user_id, location_enabled, ai_enabled, location_precision_m, share_default, notification_in_app)
- **(将来) consent_logs**: 同意ログ (user_id, doc_type, version, agreed_at) — 法務改訂時の再同意トレース

### 5.2 データフロー

```
[撮影] → ブラウザ Canvas で WebP 変換 + EXIF 削除 + リサイズ
         ↓
   [Supabase Storage] (original / thumbnail を private bucket に PUT)
         ↓
   [api_usage に記録] ← [OpenAI Vision] (画像 URL 署名 + プロンプト = 季節 + 位置 + 過去履歴)
         ↓
   [plants にキャッシュ (新規候補のみ)]
         ↓
   [discoveries に書き込み] (plant_candidates + selected_plant_id (任意))
         ↓
   [UI 更新] (タイムライン / 地図 / 図鑑モードに即時反映)
```

RLS により全テーブル `user_id = auth.uid()` で行制限。`plants` のみ全ユーザー read 可（マスタとして共有、書き込みは Edge Function 経由）。

---

## 6. 外部連携

| 連携先 | 用途 | 方式 | 認証 |
|---|---|---|---|
| OpenAI API (gpt-4o-mini Vision) | 植物同定 + 育成情報生成 | REST API (Supabase Edge Function 経由 or 直接) | API キー (.env、Edge Function 環境変数) |
| Supabase Anonymous Auth | 起動時 UUID 自動発行 (認証 0 タップ) | Supabase 内蔵 (匿名 JWT 発行) | 不要 (端末内 cookie/localStorage 保持) |
| Supabase Auth (Google OAuth、リンク用) | 「他端末で見たい / 課金したい」時の永続化リンク | OAuth 2.0 (Supabase の linkIdentity API) | Google Cloud Console で OAuth Client 発行 |
| Stripe Checkout | PWYW + 一回課金 | Stripe Checkout Session API | 公開キー (フロント) + 秘密キー (Edge Function) |
| Sentry | エラー監視 | Sentry JS SDK | DSN (公開) |
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

---

## 8. 未決事項（論点リスト）

### [論点-001] パスキー (WebAuthn) 採否 (OAuth リンク後の追加要素として)
- **影響範囲**: §6 外部連携 / §4.3 認証 / `docs/account/` / `docs/_shared/auth/`
- **前提変更**: D20260522-022 で「匿名スタート + 後リンク」採用。OAuth リンク = Google のみ MVP 提供、メールマジックリンクは見送り。パスキーは「OAuth リンク済 user の追加認証要素」として v2 検討
- **詰めるべき問い**:
  1. Supabase Auth のパスキーサポート (2025-Q4 β) は本 PJ 採用に耐えるか?
  2. リンク済 user の追加認証として v2 で導入すべきか?
- **推奨**: **MVP は Google OAuth リンクのみ、v2 でパスキー追加検討**
- **判断期限**: v2 計画着手時
- **担当**: seiji

### [論点-002] 季節レコメンド (UC5) の通知方式
- **影響範囲**: §1.1 主要 UC / `docs/memory/` / §3 NFR (通知)
- **詰めるべき問い**:
  1. Web Push 通知を入れるか、アプリ内バッジのみか?
  2. Push を入れる場合、配信頻度と quiet hours はどう設計するか?
  3. PWA で iOS Safari の Web Push サポートは現実的か?
- **候補案**:
  - 案 A: MVP はアプリ内バッジのみ、Push は v2。利点: charter §2.2 中毒性回避 / 実装シンプル。欠点: ユーザーが起動しないと気付かない
  - 案 B: MVP から Web Push (opt-in、月 1 回上限)。利点: リテンション向上。欠点: PWA Push の実装複雑 / 中毒性配慮必要
- **推奨**: **案 A (MVP はアプリ内バッジのみ)**。理由: 「中毒性を狙わない設計」を charter 適合性として明示しているため、Push は慎重に。リテンション課題が顕在化したら v2 で月 1 回上限の opt-in Push を検討。
- **判断期限**: `/flow:feature memory` 着手前
- **担当**: seiji

### [論点-003] 図鑑 PDF 生成エンジン
- **影響範囲**: `docs/export/` / `_shared/storage` / §4.3 (ライブラリ追加判断)
- **詰めるべき問い**:
  1. 生成場所: クライアント側 (jsPDF) / Supabase Edge Function (Deno + PDFKit) / Vercel Function (Node + Puppeteer)?
  2. 高解像度・カスタムレイアウト (PWYW 500 円) でどの程度のクオリティが現実的か?
  3. 100 件超の図鑑生成でブラウザがハングしないか?
- **候補案**:
  - 案 A: クライアント側 jsPDF。利点: コスト 0 / シンプル。欠点: 大量画像で性能限界
  - 案 B: Supabase Edge Function (Deno + PDFKit)。利点: Supabase 内完結 / 性能安定。欠点: Deno + PDF ライブラリの成熟度
  - 案 C: Vercel Serverless Function (Node + Puppeteer)。利点: Puppeteer の柔軟性。欠点: Vercel 関数の cold start / コスト
- **推奨**: **案 A (クライアント側 jsPDF) で MVP、性能課題が出たら案 B へ移行**。理由: 個人ノート用途で 100 件超は稀、まずは無料で動かす。
- **判断期限**: `/flow:feature export` 着手前 (MVP 後フェーズで OK)
- **担当**: seiji

### [論点-004] 位置情報の保存粒度
- **影響範囲**: §3 NFR (プライバシー) / `docs/capture/` / `_shared/helpers/` / `docs/legal/` (プラポリ)
- **詰めるべき問い**:
  1. 完全座標 / ~100m 丸め / エリア名 (公園名) のどれをデフォルトにするか?
  2. ユーザー設定で粒度変更を許容するか?
  3. 共有時 (図鑑 PDF 出力、Phase 2 で SNS 共有検討時) の挙動は?
- **候補案**:
  - 案 A: ~100m 丸めをデフォルト、設定で完全 / エリア名に変更可。共有時はエリア名のみ
  - 案 B: 完全座標保存、ユーザー個人ノート内のみ表示、共有時は丸め or 削除
  - 案 C: エリア名のみ (Reverse Geocoding を OpenStreetMap で実施)
- **推奨**: **案 A (~100m 丸めデフォルト + 設定で粒度変更 + 共有時はエリア名のみ)**。理由: 散歩ルート特定リスク回避 + ノート閲覧での「だいたいの場所」要件を両立。個人情報保護法対応も明示しやすい。
- **判断期限**: `/flow:feature capture` 着手前
- **担当**: seiji

### [論点-006] 匿名 user の SPAM 抑止策
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

### [論点-007] 匿名 → リンク時のデータ移行戦略
- **影響範囲**: `_shared/auth` / `_shared/db` / `account` / `billing`
- **背景**: 匿名 user で discoveries / images を蓄積後に Google OAuth リンクする際、Supabase の `linkIdentity` API は user_id を維持して identity を追加できるが、以下のエッジケースあり
- **詰めるべき問い**:
  1. Google アカウントが**既に別の anonymous user とリンク済**の場合 (機種変更 + リンク失敗時に再リンク試行)、データはどうマージするか?
  2. リンク後に「やっぱり匿名に戻したい」(unlink) は許容するか?
  3. 端末 A (匿名 user A) と端末 B (匿名 user B) を同じ Google アカウントにリンクしようとした場合、A と B の discoveries を統合するか、片方を破棄するか?
- **候補案**:
  - 案 A: 同一 Google アカウントへの 2 つ目のリンク試行はエラー → ユーザーに「既存リンクの解除 or マージ選択」を提示
  - 案 B: 自動マージ (両方の discoveries を統合)。利点: ユーザー操作不要。欠点: 重複検知 / 衝突解決ロジック必要
  - 案 C: 最初のリンクのみ受け付け、2 つ目以降は端末 B 側に「このアカウントは別端末で既にリンク済。新規 Google アカウントでリンクするか、端末 A からログアウト後に再試行」と案内
- **推奨**: **案 C (最初のリンクのみ、2 つ目以降は明示ガイダンス)**。理由: MVP で複雑なマージロジック不要 + データ統合ミスは取り返しがつかない。Stripe 課金との紐付けも単純化。
- **判断期限**: `/flow:feature account` 着手前
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
  - 単発課金 (AI 同定追加枠): 100 円 (税込) / 20 回追加 / Stripe Checkout / 即時付与 / デジタルコンテンツのため返品不可 (購入前に説明)
  - 単発課金 (図鑑 PDF): 500 円 (PWYW で 100/300/500/1000 円選択可) / 即時ダウンロード / 同上
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
- Supabase anon key / Stripe publishable key は frontend 公開可、service_role / Stripe secret / OpenAI / Slack URL は Edge Function env のみ

## 11. 更新履歴

| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-22 | 初版作成 (wants.md ベース、idea I20260522-005 起点) | /flow:concept |
| 2026-05-22 | 認証フローを「匿名スタート + Google OAuth 後リンク」に変更 (charter §1.1 適合、気軽さ最優先)。§1.2 / §3 / §4.1 / §4.3 / §5.1 / §6 / §7 / §8 ([論点-001] 修正 + [論点-006] [論点-007] 新規追加) を更新 | /flow:concept (UPDATE、seiji 指摘) |
| 2026-05-22 | flow:concept 更新版に追随: §4.7 公開戦略・ドメイン・リバースプロキシ / §4.8 サービス公開周知 / §10 Git リポジトリ・運用 を追加 (旧 §10 → §11 に繰り下げ)。Q12.9 / Q12.10 / Q12.11 / perspectives O22/O29/O31 / charter §1.6 反映 | /flow:concept (UPDATE、コマンド更新の retroactive 適用) |
