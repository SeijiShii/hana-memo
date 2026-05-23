# D20260523_018 — /flow:scenario --init (初版生成)

```yaml
session_id: D20260523_018_scenario_init
command: /flow:scenario
mode: init
target: scenario
started_at: 2026-05-23T09:07:00+09:00
last_updated: 2026-05-23T09:07:12+09:00
状態: 完了
完了ステップ一覧: [Step 0 入力収集, Step 6 初期化, Step 7 AI_LOG 確定]
依存セッション: [D20260523_017_secure_product_wide]
生成・更新ファイル:
  - docs/SCENARIO.md (NEW)
  - docs/AI_LOG/D20260523_018_scenario_init.md (NEW)
  - docs/AI_LOG/INDEX.md (UPDATE auto-generated 範囲)
```

---

## 主要決定サマリ

- **シナリオ種別**: **MVP α 公開型 (個人ツール → スモール商用 段階移行)**
  - 根拠: concept §1.2 (公開、PWYW 課金あり) + §4.4 (個人・無料枠 → MVP α → スモール商用) + §4.6.7 (撤退判断ゲート) + charter §1 (商用化を視野に入れた個人開発 MVP)
  - 代替候補で却下: 「個人ツール (公開なし)」「OSS ライブラリ公開」「マイクロサービス連発」
- **5 Phase + 1 補足 Phase (2.5) 構成**:
  - Phase 1 概念設計 ✅
  - Phase 2 機能・横断設計 ✅
  - Phase 2.5 設計レベル脆弱性レビュー L1+L2 ✅ (今後の L4 deps 再実行や追加 secure サイクルもこの枝)
  - Phase 3 実装 (TDD)
  - Phase 4 α 公開準備
  - Phase 5 公開後運用
- **現在地カーソル**: Phase 3 着手前。前提条件として concept §8 [論点-011]〜[論点-014] の解消が必要
- **次の推奨コマンド** (優先順): `/flow:revise _shared/ai` → `/flow:revise _shared/analytics` → `/flow:tdd` 連続実装

## 学習・改善

- `/flow:concept` の初回実行時 (2026-05-22) には Step 5.47 (SCENARIO 初版生成) が未実装だったため、本 PJ は `/flow:scenario --init` で後追い生成した。今後 `/flow:concept` を再実行すると Step 5.47 が走り、本ファイルと整合する想定
- Phase 2.5 (secure) は当初想定の 5 Phase に含まれていなかったが、`/flow:secure` を Phase 2 と Phase 3 の橋渡しとして独立採番した。同様に「実装後 L3 review」「α 公開直前 L5 audit」も今後 Phase に組み込み余地あり (現状は §4 分岐ルールに記載)

---

## decisions

### D20260523-020 — シナリオ種別判定 (MVP α 公開型)

- **phase**: Step 6 (init)
- **chosen_type**: auto-recommended
- **source**: concept.md §1.2 / §4.4 / §4.6.7 / charter §1
- **chosen**: MVP α 公開型 (個人ツール → スモール商用 段階移行)
- **代替で却下**:
  - 「個人ツール (公開なし)」: PWYW 課金 + Stripe + プラポリ作成が SPEC に含まれるため不適合
  - 「OSS ライブラリ公開」: SaaS PWA のためライブラリ性質なし
  - 「マイクロサービス連発」: 本 PJ は 1 プロダクト単体 (`hana-memo` のみ)、charter §0.2 BaaS Pivot は「将来連発できるように Neon 採用」だが本 PJ 自体は単体
- **根拠**: concept §4.6.7 で「継続 / 縮退 / 撤退」基準が明確化されており段階移行型と整合

### D20260523-021 — 5 Phase + 1 補足 (Phase 2.5) 採用

- **phase**: Step 6 (init)
- **chosen_type**: auto-recommended
- **chosen**: Phase 1 (概念) → Phase 2 (設計) → **Phase 2.5 (secure L1+L2)** → Phase 3 (TDD) → Phase 4 (α 公開準備) → Phase 5 (公開後運用)
- **2.5 を独立採番した理由**:
  - secure L1+L2 はすでに完了 (今回 commit `142ad08`)、しかし完了後に Phase 3 直行ではなく [論点-011]〜[論点-014] 解消ステップが挟まる
  - 今後 `--phase=deps` 再実行や Phase 4 直前の追加 secure サイクル (L3/L5) も同じ枝に紐付けたい
- **完了ゲート設定**:
  - Phase 3: 全 14 対象の 101/102 揃い + E2E green + coverage 80%
  - Phase 4: 招待制 α URL 公開 + 初回ユーザー 1 名が同定→保存→図鑑出力完走
  - Phase 5: DAU 100 到達 (継続) or 撤退判断ゲート発火 (終了)

### D20260523-022 — 分岐ルール初期化 (§4)

- **phase**: Step 6 (init)
- **chosen_type**: auto-recommended
- **chosen**: 9 種の分岐パターン (バグ報告 / 仕様変更 / 新機能 / クレーム / 脆弱性再実行 / 新アイデア / 論点積上 / context 中断 / 月次レビュー) → 対応 flow コマンドへの自動切替ルール
- **根拠**: 各 flow コマンドの description / SCOPE 記述から導出

### D20260523-023 — 現在地カーソル初期セット (Phase 3 着手前)

- **phase**: Step 6 (init)
- **chosen_type**: auto-recommended
- **chosen**:
  - 現在フェーズ: Phase 3 着手前
  - 進行中ターゲット: なし (前提解消待ち)
  - 未解消前提: concept §8 [論点-011]〜[論点-014] 全 4 件
  - 次の推奨: `/flow:revise _shared/ai` → `/flow:revise _shared/analytics` → `/flow:tdd`
- **根拠**: 直前セッション D20260523_017_secure_product_wide が「Critical 2 + High 2 を §8 登録」で完了している。TDD 着手前にこれらを解消する SPEC/PLAN 反映が論理的次ステップ

### D20260523-024 — Git commit (本セッション)

- **phase**: Step 8 (git auto commit)
- **chosen_type**: auto-recommended
- **policy**: `~/.claude/flow-data/git-commit-policy.md` §7
- **対象**: `docs/SCENARIO.md` (NEW), `docs/AI_LOG/D20260523_018_scenario_init.md` (NEW), `docs/AI_LOG/INDEX.md` (UPDATE)
- **commit hash**: (後で追記)
- **branch**: `main` (concept §10.2 "main 直 push 可" のため、直前 secure セッションと同様)

---

## 関連ファイル

- 生成: [../SCENARIO.md](../SCENARIO.md)
- 入力 concept: `../concept.md` §1.2 / §4.4 / §4.6.7
- 直前セッション: [D20260523_017_secure_product_wide.md](./D20260523_017_secure_product_wide.md)
- Resume Contract: `~/.claude/flow-data/resume-contract.md`
- 後続: `/flow:revise _shared/ai` (論点-011, 013 解消) → `/flow:revise _shared/analytics` (論点-014) → `/flow:tdd` (連続実装、_shared/db から)
