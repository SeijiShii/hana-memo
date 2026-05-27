# hana-memo デザインシステム — 「植物フィールドノート」

> **役割**: プロダクトのコンセプトに沿った視覚言語の SoT。`concept.md` の提供価値から導出し、実装
> (Tailwind トークン / コンポーネント / イラスト) とレビュー (画面スクショ視覚レビュー) の基準にする。
> **由来**: `docs/concept.md` §1（提供価値: 「自分の発見ノート」が主役・AI は脇役・SNS/競争/中毒性を
> 排した穏やかな自分のペースの発見体験。ユーザー = 散歩/通勤/園芸が日常の人）。
> **生成/更新**: `/flow:design`（自動）。手動調整は §可。

---

## 1. デザイン原則（コンセプト → 視覚）

1. **発見ノートが主役** — 写真と発見カードを最も目立たせ、UI クロムは控えめに。
2. **穏やか・自分のペース** — 高彩度・点滅・煽り・バッジ過多を避け、余白を広く、動きは穏やか。
3. **植物的・有機的** — 紙のような背景、苔・葉のグリーン、line-art botanical イラスト。
4. **やさしい言葉** — 一般ユーザー向け。技術用語を出さない（→ §6, perspectives O38）。
5. **モバイルファースト** — 片手・屋外・明るい日差し下を想定。コントラストとタップ領域を確保。

## 2. カラートークン（Tailwind: `tailwind.config.ts`）

| トークン | 値 | 用途 |
|---|---|---|
| `paper` | `#F6F2E9` | 背景（紙） |
| `surface` / `surface-soft` | `#FFFFFF` / `#FDFBF5` | カード面 / 副次面 |
| `ink` / `ink-soft` / `ink-faint` | `#2E2A24` / `#6B6256` / `#9A9080` | 本文 / 副次 / 微弱・非 active |
| `line` | `#E7E0D2` | 罫線・境界 |
| `moss` / `moss-dark` / `moss-light` | `#5B7A53` / `#3E5A39` / `#EAF0E4` | 主色（葉）・見出し/CTA・淡色面 |
| `bloom` / `bloom-soft` | `#D98C7A` / `#FBE7E1` | 花アクセント（控えめ・1 画面 1〜2 箇所） |
| `pollen` / `pollen-soft` | `#E0A93B` / `#FBF2DC` | 季節・花粉バッジ |

- 緑は **moss 系のみ**（旧 `green-600/700` は使わない）。グレーは **ink/line** トークンへ（旧 `neutral-*` 廃止）。

## 3. タイポグラフィ

- `font-sans`: Hiragino Sans → Yu Gothic → Noto Sans JP →（本文・UI）。
- `font-display`: Hiragino Maru Gothic ProN →（見出し h1-h3、丸み＝やさしさ）。
- スケール: 見出し 22–26px / 本文 14–15px / 補助 12–13px。行間は本文 `leading-relaxed`。
- ※ Web フォント（Zen Maru/Kaku Gothic 等）導入は将来の強化候補（現状はシステムスタック）。

## 4. 形・影・余白

- 角丸: `rounded-card`(18px) / `rounded-pill`(999px、ボタン・チップ)。
- 影: `shadow-soft`（カード）/ `shadow-lift`（浮かせる要素）。低コントラストで穏やかに。
- 余白: 画面パディング 16–24px、要素間は広め。詰め込まない。

## 5. コンポーネント（`src/index.css` @layer components）

- `.btn-primary`（苔 pill・主 CTA）/ `.btn-ghost`（苔アウトライン・副）。
- `.card`（発見カード等の主役面）。
- `.chip` / `.chip-pollen`（メタ情報・季節）。
- 下部ナビ（`AppShell`）: lucide line icon + active は moss-light pill + moss-dark。

## 6. ボイス & コピー（perspectives **O38** 準拠・必須）

- **ユーザー向け文字列に技術用語を入れない**（PWA / API / OAuth / token / cache / SDK / サービス名等）。
  ドメイン語（発見ノート / 図鑑 / 同定 / 連携 / 撮影）と日常語で書く。
- トーンは穏やかでやさしい敬体。煽り・誇張・競争を避ける。
- エラーは「何が起きたか + 次の一手」をやさしく（例: 「うまく保存できませんでした。少し待って再度お試しください」）。

## 7. アイコン & イラスト戦略

- **標準 UI アイコン**: `lucide-react`（line icon、`strokeWidth` 2〜2.4、size 18–22）。絵文字は使わない
  （環境依存で豆腐化 + 一貫性欠如）。
- **ブランド/装飾イラスト**: 自作 SVG（`src/components/illustrations/`）。line-art botanical、テーマ色を
  stroke/fill に直接使用。空状態・オンボーディング・ヒーロー・称号に。現状: `SproutingNote` / `SproutSpot`。
- **写実・複雑ラスター**（任意・要キー）: 必要時のみ外部画像生成（gpt-image 等）でビルド時に静的アセット化。
  既定では使わない（コスト + 鍵）。

## 8. レビュー（視覚 + コピー、no-key）

- 各画面を `vite preview` + Playwright headless でスクショ → 本 SoT との適合をマルチモーダルで批評。
- 同時に **コピーの jargon スキャン**（O38 deny-list grep、コメント/型/設計文書は除外）。
- 逸脱は TDD（RED→GREEN）で修正。実サービス依存フローの実機確認は実キー時に（Class B preview は別）。

---

## 変更履歴

| 日付 | 変更 | 由来 |
|---|---|---|
| 2026-05-25 | 初版。concept §1 提供価値から「植物フィールドノート」方向を導出（seiji 承認）。トークン/コンポーネント/イラスト/コピー(O38) を SoT 化。foundation + Home + 下部ナビに適用 | seiji「デザインが最低限すぎる」+ 方向確定 + イラスト戦略 + O38 |
| 2026-05-25 | **視覚レビュー (`--review-only`)**: 6 画面 (home/capture/notebook/billing/settings/legal) を headless スクショ → SoT 適合。視覚=PASS、O38 コピー=PASS (UI に技術用語なし、Settings は「品質改善への協力（エラー情報の送信）」等で Sentry/OAuth を回避)。修正: notebook タブ「タイムライン」のモバイル幅 2 行折返し → `whitespace-nowrap` + 余白/字詰め調整で 1 行化。defer: legal 文書見出しの「PII スクラブ / opt-in」(本文プレースホルダ + 法務レビュー時に平易化)、billing「ステータス未取得」(keyless seam 表示) | /flow:design --review-only (D20260525_055) |
