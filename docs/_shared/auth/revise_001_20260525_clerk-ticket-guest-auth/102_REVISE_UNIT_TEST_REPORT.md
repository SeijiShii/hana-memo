# 単体テストレポート: _shared/auth revise_001 (匿名サインイン Clerk ticket 方式)

## 実施日時
2026-05-25 18:55 (JST)

## 関連ドキュメント
- [003_REVISE_UNIT_TEST.md](./003_REVISE_UNIT_TEST.md) — 単体テスト計画

## テスト実行環境
- ランタイム: Node 22 / Vitest 2.1.9
- React テスト: happy-dom (`// @vitest-environment happy-dom`) + @testing-library/react

## テスト結果

| # | テストケース | テストファイル | 結果 |
|---|---|---|---|
| UT-AU-GP01 | provisionGuest 正常系 (createUser→upsert→token 順, ticket 返却) | api/auth/_lib/guest-provision.test.ts | ✅ |
| UT-AU-GP02 | createUser に externalId+publicMetadata.isAnonymous 付与 | 同上 | ✅ |
| UT-AU-GP03 | レート超過 → 429, createUser 呼ばず | 同上 | ✅ |
| UT-AU-GP04/04b | createUser / token 失敗 → 503 | 同上 | ✅ |
| UT-AU-GP05/05b | fingerprint cap 到達 → must_link / 未満は通常発行 | 同上 | ✅ |
| (追加) | fingerprint 無し時は cap 判定スキップ | 同上 | ✅ |
| UT-AU-GK01-03 | guestRateKey (fingerprint優先/IP/anon) | api/auth/guest.test.ts | ✅ |
| UT-AU-IP01-02 | clientIpFrom (先頭IP/null) | 同上 | ✅ |
| UT-AU-GC01 | fetchGuestTicket 200→ticket + POST body | src/shared/auth/guest-client.test.ts | ✅ |
| UT-AU-GC02/03 | 429→RateLimited / 503→GuestTicketError | 同上 | ✅ |
| (追加) | network失敗 / ticket欠落 → GuestTicketError | 同上 | ✅ |
| UT-AU-US01 (buildGuestSignIn) | fetchTicket→create({strategy:ticket})→setActive | 同上 | ✅ |
| (追加) | createdSessionId null → エラー, setActive 呼ばず | 同上 | ✅ |
| UT-AU-US01 (hook) | 未sign-in→ticket→create→setActive→active | src/shared/auth/useGuestSession.test.tsx | ✅ |
| UT-AU-US02 | sign-in済→no-op (fetch しない) | 同上 | ✅ |
| (追加) | Clerk 未ロード中は idle | 同上 | ✅ |
| UT-AU-US03 | ticket失敗→retry後 error (オシレーションなし) | 同上 | ✅ |
| UT-AU-GT01-04 | GuestSessionGate: active/signing-in→null, error→alert, getFingerprint 渡す | src/shared/auth/GuestSessionGate.test.tsx | ✅ |
| (回帰) | AppAuthProvider キー有/無分岐 (Gate 追加後も white-screen せず) | src/app/AppAuthProvider.test.tsx | ✅ |
| (回帰) | handler-contract が api/auth/guest.ts を {fetch} 形と確認 | api/_handler-contract.test.ts | ✅ |

## 追加テストケース
計画 (003) の UT に加え、network失敗 / ticket欠落 / createdSessionId null / Clerk未ロード / fingerprint無し時のcapスキップ を境界として追加。

## サマリー

| 項目 | 値 |
|---|---|
| 新規テスト数 (本 revise) | 29 件 (provisionGuest 8 / guest純関数 5 / guest-client 7 / useGuestSession 4 / GuestSessionGate 4 + handler-contract +1) |
| 全体テスト数 | 919 件 (890→919) |
| 成功 | 919 件 |
| 失敗 | 0 件 |
| 成功率 | 100% |
| typecheck / eslint | 0 / 0 |

## 残 (runtime 検証 = Phase 4)
- 実 Clerk での `createUser({externalId})` 受理確認 ([論点-002])、`signIn.create({strategy:'ticket'})` セッション確立、撮影→識別→保存→図鑑反映 の実機目視 (release Phase 2 / vercel dev)。
