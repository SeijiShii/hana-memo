# 依存ライブラリ脆弱性スキャン結果

**スキャン日**: 2026-05-24
**対象**: `package-lock.json` (4228 行、prod 28 / dev 249 / optional 122、計 277 依存)
**スキャナ**: `npm audit --json`
**実施元**: `/flow:secure --phase=deps` (D20260524_043、`/flow:auto` continuous loop iteration 1 経由 dispatch)
**観点ソース**: `~/.claude/flow-data/perspectives.md` O28_dependency_vulnerabilities
**背景**: 当初プロダクト全体 secure (D20260523_017) では lockfile 不在で L4 を skip → 「TDD 着手後に再実行」(SCENARIO §4「実装着手後 lockfile 存在で必須」)。本回が lockfile 生成後の初回 L4 監査

## 1. サマリ

| severity | 件数 | 処理 |
|---|---|---|
| Critical | 0 | — |
| High | 1 | 自動 dispatch (§2) |
| Medium (npm moderate) | 9 | §8 open 登録 / 大半 Phase 3.5 で自然解消 (§3) |
| Low | 0 | — |
| **計** | **10** | |

- 対応必須 (Critical/High): **1 件** (drizzle-orm SQL injection)
- §8 登録: [論点-015] (SEC-007) 1 件 (High、dispatched-to-revise)

## 2. High 詳細 (自動 dispatch)

### [SEC-007] drizzle-orm — SQL injection via improperly escaped SQL identifiers
- **GHSA**: GHSA-gpj5-g38j-94v9
- **CVSS**: 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N), CWE-89
- **パッケージ**: `drizzle-orm` 宣言 `^0.36.4` (**prod 直接依存、ORM コア**)
- **影響範囲**: `range <0.45.2`。`src/shared/db/{schema,access}.ts` + `withUserScope` + 全 Drizzle クエリ + drizzle-kit migration 生成が依存
- **修正バージョン**: `>= 0.45.2` (`isSemVerMajor=true`、0.36→0.45 で 9 マイナー跨ぎ)
- **推奨対応**: メジャーアップ移行 (破壊的変更検証要) → **dispatched-to-revise**
- **route**: `/flow:revise --resume sec_007_drizzle_orm_sqli`
- **seed**: `docs/_pending/sec_007_drizzle_orm_sqli/000_TRIGGER.md`
- **§8 論点**: [論点-015]
- **accepted-risk 不可**: prod ORM コア依存の High SQL injection、受容不可

## 3. Medium (npm moderate、記載のみ、§8 open)

すべて **dev / build ツーリング** (prod runtime 非影響)。Phase 3.5 app/api bootstrap で frontend stack (vite/vitest) を実 install + フルバージョンへ upgrade する際に一括解消見込み。drizzle 系 transitive は SEC-007 revise (drizzle-kit 協調アップグレード) で同時解消。

| パッケージ | 直接/推移 | 概要 | 修正経路 | 解消フェーズ |
|---|---|---|---|---|
| `vite` (5.4.21) | 推移 | GHSA-4w7w-66w2-5vf9 Path Traversal in Optimized Deps `.map` Handling (dev server) | vitest 4.1.7 (major) | Phase 3.5 bootstrap |
| `esbuild` (0.19.12) | 推移 | GHSA-67mh-4wv8-2f99 dev server が任意サイトからのリクエストを許可 (CVSS 5.3、dev only) | drizzle-kit 0.31.10 (major) | Phase 3.5 / SEC-007 revise |
| `vitest` (2.1.9) | 直接 | vite/@vitest/mocker 経由 | vitest 4.1.7 (major) | Phase 3.5 bootstrap |
| `@vitest/coverage-v8` | 直接 | vitest 経由 | 4.1.7 (major) | Phase 3.5 bootstrap |
| `@vitest/mocker` | 推移 | vite 経由 | vitest 4.1.7 | Phase 3.5 bootstrap |
| `vite-node` | 推移 | vite 経由 | vitest 4.1.7 | Phase 3.5 bootstrap |
| `drizzle-kit` (^0.30.1) | 直接 | @esbuild-kit/esm-loader + esbuild 経由 | drizzle-kit 0.31.10 (major) | SEC-007 revise (協調) |
| `@esbuild-kit/core-utils` | 推移 | esbuild 経由 | drizzle-kit 0.31.10 | SEC-007 revise (協調) |
| `@esbuild-kit/esm-loader` | 推移 | @esbuild-kit/core-utils 経由 | drizzle-kit 0.31.10 | SEC-007 revise (協調) |

> Medium は npm が "moderate" 判定。`--severity-threshold=medium` (default) で表示対象だが、Step 3.5.5 の自動 dispatch は Critical/High のみ。上記 9 件は §8 で open 扱い、能動 dispatch せず Phase 3.5 で frontend stack 確定時に upgrade 解消。

## 4. 自動更新メカニズムの推奨 (L4-cont、継続監視)

本コマンドは「設計時点スナップショット監査」(一回監査)。継続監視は CI へ:
- [ ] Dependabot (`.github/dependabot.yml`) — Critical/High は自動 PR
- [ ] あるいは Renovate (`renovate.json`)
- [ ] CI に `npm audit --audit-level=high` を組み込み (High 以上でビルド失敗) — Phase 4 α 公開準備で導入推奨

## 5. アップグレード手順 (Node.js)

```bash
# High: drizzle-orm SQL injection 修正 (revise で互換性検証付き)
npm install drizzle-orm@^0.45.2 drizzle-kit@latest
npm run db:generate   # migration 再生成 → diff レビュー
npm run db:migrate    # dev branch で apply 検証
npm test              # 全 Vitest green 維持確認 (現 373/373)

# Medium (dev tooling): Phase 3.5 frontend stack install 時に一括
npm install -D vitest@^4 @vitest/coverage-v8@^4 vite@^6
```

## 6. 次のステップ

1. `/flow:revise --resume sec_007_drizzle_orm_sqli` (High、α 公開前必須)
2. Phase 3.5 app/api bootstrap で frontend stack を実 install する際、上記 Medium dev-tooling を最新へ upgrade → `npm audit` 再実行で clean 確認
3. Phase 4 α 公開準備で CI に `npm audit --audit-level=high` + Dependabot 組み込み (L4-cont)
