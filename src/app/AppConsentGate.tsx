/**
 * app 層 同意ゲート overlay — sign-in 済 user に ConsentGate を被せる (UC1 初回 / UC4 改訂再同意)。
 *
 * 配線方針:
 *   - ConsentGate 自体は currentVersions (自分の同意済バージョン) と onConsent (永続化) を要求する。
 *   - currentVersions は consent_logs を取得 → deriveLatestConsents で導出する必要があるが、対応する
 *     取得 Function (/api/legal/consents) が未実装。onConsent の永続化 (consent_logs INSERT +
 *     localStorage 保存) 用 Function (/api/legal/consent) も未実装。
 *   - そのため「永続化が効かない blocking gate を常時表示するとアプリが操作不能になる」ことを避け、
 *     既定では gate を出さない (既存 App.tsx 方針「配線まで overlay を素通し」を踏襲)。
 *   - enabled=true を明示注入した場合のみ gate を描画する (Milestone C / テスト用)。その際の
 *     onConsent は backend 配線前は no-op seam (偽の永続化はしない)。
 *
 * Milestone C で /api/legal/consents (取得) + /api/legal/consent (INSERT) を配線したら、
 * currentVersions を取得結果から、onConsent を recordConsents(buildConsentRecords(...)) から流し込む。
 *
 * 関連: src/features/legal/components/ConsentGate.tsx, src/features/legal/consent.ts,
 *       src/features/legal/versions.ts, src/App.tsx (overlay マウント方針)
 */
import { ConsentGate } from '../features/legal';
import type { DocType } from '../shared/types/domain';
import { useAuthToken } from './useAuthToken';

export type AppConsentGateProps = {
  /**
   * 同意ゲートを表示するか。既定 false (backend 永続化が未配線のため常時 overlay を出さない)。
   * Milestone C で consent API を配線したら true 化する。
   */
  enabled?: boolean;
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
  /** テスト/Milestone C 用に同意永続化を注入する (省略時は no-op seam)。 */
  onConsent?: (docTypes: DocType[]) => Promise<void> | void;
};

/**
 * sign-in 済かつ enabled のとき ConsentGate を描画する。それ以外は何も描画しない (gate 素通し)。
 */
export function AppConsentGate({
  enabled = false,
  token: injectedToken,
  onConsent,
}: AppConsentGateProps = {}) {
  const auth = useAuthToken();
  const token = injectedToken !== undefined ? injectedToken : auth.token;

  // 未 sign-in / 未解決、または未 enable のときは overlay を出さない。
  if (!enabled || !token) {
    return null;
  }

  return (
    <ConsentGate
      // 自分の同意済バージョン取得 Function 未実装のため初回扱い ({})。API 配線後に差し替える。
      currentVersions={{}}
      // 永続化 seam: 実 recordConsents は Milestone C の Function 配線。
      onConsent={onConsent ?? (() => undefined)}
    />
  );
}
