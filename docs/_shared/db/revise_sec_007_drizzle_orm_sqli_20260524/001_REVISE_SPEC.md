# _shared/db 変更仕様書（drizzle-orm SQL インジェクション CVE 対応）

> **改修種別**: 依存ライブラリアップグレード (セキュリティ修正)
> **issue / slug**: sec_007_drizzle_orm_sqli
> **基準 SPEC**: `../001_db_SPEC.md`
> **最終更新**: 2026-05-24
> **タグ**: security-fix, dependency-upgrade, data-layer

---

## 1. 変更概要

`/flow:secure --phase=deps` (D20260524_043) が `drizzle-orm` 宣言 `^0.36.4` に **GHSA-gpj5-g38j-94v9「SQL injection via improperly escaped SQL identifiers」(CVSS 7.5、CWE-89)** を検出。`drizzle-orm` を `^0.45.2` 以上へアップグレードして脆弱性を解消する。`drizzle-kit` も協調アップグレードし、付随する dev-tooling moderate (esbuild/@esbuild-kit 系 transitive) を同時解消する。**プロダクト API / DB スキーマは変更なし** (内部依存の差し替えのみ)。

## 2. 変更前 vs 変更後

### 2.1 UC 変更
| UC ID | 変更前 | 変更後 | 理由 |
|---|---|---|---|
| — | (なし) | (変更なし) | DB アクセスの振る舞い不変。依存差し替えのみ |

### 2.2 入出力変更
| 対象 | 変更前 | 変更後 | 互換性 |
|---|---|---|---|
| `package.json` deps | `drizzle-orm@^0.36.4` | `drizzle-orm@^0.45.2` | 内部依存、外部 API 非影響 |
| `package.json` devDeps | `drizzle-kit@^0.30.1` | `drizzle-kit@latest` (>=0.31.10、最新安定) | migration 生成ツール、出力 SQL は等価検証 |
| `package-lock.json` | (旧) | (再生成) | `npm audit` で drizzle 系 high+moderate 解消 |

### 2.3 データモデル変更
| エンティティ | 変更内容 | マイグレーション要否 |
|---|---|---|
| 全テーブル / enum / matview | **変更なし** (`schema.ts` 不変) | データ移行不要。migration **ファイル**は drizzle-kit 再生成で DDL 等価性のみ検証 |

### 2.4 バリデーション・エラー変更
| 対象 | 変更前 | 変更後 |
|---|---|---|
| SQL identifier escaping | drizzle-orm 内部で不適切なエスケープ (CVE) | 0.45.2 で修正済みエスケープ |
| `withUserScope` / `assertOwner` | (現状維持) | (変更なし、API 互換) |

## 3. 影響範囲

| 対象 | 影響度 | 説明 |
|---|---|---|
| 横断 `_shared/db` | 中 | 依存差し替え。`schema.ts` / `client.ts` / `access.ts` の drizzle API 利用が 0.45 互換か検証要 |
| 全 feature (`capture`/`notebook`/`billing`/`export`/`memory`/`account`/`legal`) | 低 | `_shared/db` 経由で間接利用。API 不変なら波及なし |
| `drizzle/migrations/` | 低 | drizzle-kit 再生成、DDL 等価性確認 |
| Vitest スイート (373/373) | 中 | 全 green 維持が GREEN ゲート |

### 3.1 使用 drizzle API サーフェス (互換性評価の根拠)

| import 元 | 使用シンボル | 0.36→0.45 互換性 |
|---|---|---|
| `drizzle-orm` | `sql` (template) | ✅ 安定 (破壊的変更なし) |
| `drizzle-orm/pg-core` | `pgTable`, `pgEnum`, `text`, `uuid`, `timestamp`, `integer`, `real`, `boolean`, `jsonb`, `index` | ✅ 安定 (column builder API 不変) |
| `drizzle-orm/neon-http` | `drizzle` | ✅ 安定 (adapter シグネチャ不変) |
| `drizzle-orm/node-postgres` | `drizzle` | ✅ 安定 |

> 0.36→0.45 の破壊的変更は主に **Relational Queries v2 (opt-in)** と一部内部 API。本 PJ が使う **コア column builder + 単純 select/where + neon-http/node-postgres adapter** は全期間で安定。**互換性リスク = 低**。実装は「バージョン bump + 型エラー解消 (発生時) + migration 再生成 + 全テスト green」で完了見込み。

## 4. 後方互換性

- **互換維持**: ✅ (プロダクト API / DB スキーマレベル)
- 非互換変更: なし (内部依存差し替え。`schema.ts` / クエリの公開挙動は不変)
- drizzle 内部 API に万一の型変更があれば `_shared/db` 内で吸収 (feature 層へは波及させない)

## 5. ロールバック方針

- **コード revert で戻せる**: ✅ (`package.json` + `package-lock.json` + `_shared/db` の差分を git revert)
- **DB マイグレーションのロールバック**: 不要 (スキーマ変更なし、データ移行なし)
- **手順**: `git revert <commit>` → `npm install` で lockfile 復元 → テスト green 確認。本番未公開 (Phase 4 前) のため運用影響なし

## 6. リリース戦略

- **方式**: 一括 (依存アップグレードは atomic)
- **フィーチャーフラグ**: 不要
- **ロールアウト**: 開発ブランチで `npm install` → 全 Vitest green + `npm audit` clean 確認 → コミット。α 公開前 (Phase 4 ゲート前) に完了必須

## 7. 詳細仕様（新仕様）

### 7.1 詳細 UC（新仕様）
変更なし。

### 7.2 入出力（新仕様）
変更なし (DB クエリ I/O 不変)。

### 7.3 データモデル（新仕様）
変更なし (`schema.ts` 不変)。

### 7.4 バリデーション・エラー（新仕様）
drizzle-orm 0.45.2 の修正済み identifier escaping を利用。`_shared/db` 側の `withUserScope` / `assertOwner` 防御線は現状維持 (CVE はライブラリ内部のエスケープ欠陥であり、認可ヘルパとは独立)。

### 7.5 機能固有 NFR + 既存連携（新仕様）
- [SEC-005] 認可 (`withUserScope`): 変更なし、回帰テストで維持確認
- [O28] 依存脆弱性: 本改修で drizzle-orm high CVE を解消、`npm audit` の high を 0 件化

## 8. タグ別追加項目
- **security-fix**: CVE 解消が主目的。closure 条件 = `npm audit` で GHSA-gpj5-g38j-94v9 消失 + §8 [論点-015] closed
- **data-layer**: 全 feature の基盤。GREEN ゲート = 373/373 Vitest 維持

## 9. 未決事項

### [論点-001] Phase 3.5 bootstrap との実施タイミング
- **影響範囲**: 実装フェーズの順序
- **詰めるべき問い**: drizzle アップグレードを独立 tdd で先行するか、Phase 3.5 app bootstrap (vite/vitest 系 moderate と frontend stack install) と一括で行うか
- **候補案**: 案 A=独立先行 (High CVE を早期解消、変更範囲が小さく検証容易) / 案 B=bootstrap 一括 (deps 操作を 1 回に集約)
- **推奨**: **案 A 独立先行** (High security finding は早期解消が原則、変更範囲が `_shared/db` + lockfile に限定され検証が軽い。vite/vitest 系 moderate は別途 bootstrap 時に解消で問題なし)
- **判断期限**: /flow:tdd 着手時
- **担当**: seiji

## 10. 更新履歴
| 日付 | 変更概要 | 実行者 |
|---|---|---|
| 2026-05-24 | 初版作成 (L4 検出 GHSA-gpj5-g38j-94v9 対応) | /flow:revise (D20260524_044) |
