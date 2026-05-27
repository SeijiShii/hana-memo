/**
 * 設定 container — auth 由来の連携状態を SettingsPage に配線し、設定永続化 seam を注入する。
 *
 * 配線済み (実データ):
 *   - isLinked: useCurrentUser().isAnonymous の否定 (連携済か)
 *   - linkedEmail: useCurrentUser().email (連携済アカウントの表示用メール)
 *
 * seam (未配線 = backend API 不在のため):
 *   - settings (user_settings 取得): フェッチ用 Function (/api/account/settings) が未実装のため null を渡す
 *     (SettingsPage は settings=null でも安全側既定で描画する)。
 *   - onUpdateSettings: user_settings upsert + (AI 同意 OFF→ON の consent_logs INSERT /
 *     analytics_opt_in 変化時の Sentry reconfigure) を行う Function が未実装のため no-op。
 *   - onDeleteAccount: requestAccountDeletion は AccountDeletionStore (DI) を要するが、対応する
 *     削除 Function (/api/account/delete) が未実装のため no-op。実 signOut も Clerk セッション前提。
 *   - onLink / onLogout: Google OAuth 連携 / signOut は実 Clerk user (createExternalAccount / signOut)
 *     を要するため未配線 (実 Clerk セッション前提)。
 *
 * これらは backend Function (api/account/*) と実 Clerk セッションを要する Milestone C で配線する。
 * 現状は実データの連携状態のみ反映し、永続化は安全な no-op に倒す (後方互換、要件: 偽の動作を作らない)。
 *
 * 関連: src/features/account/pages/SettingsPage.tsx, src/features/account/settings.ts,
 *       src/features/account/deletion.ts, src/shared/auth/hooks.ts
 */
import { SettingsPage, type SettingsPatch } from './pages/SettingsPage';
import { useCurrentUser } from '../../shared/auth/hooks';

export type SettingsContainerProps = {
  /** テスト用に連携状態を明示注入する (省略時は useCurrentUser 由来)。 */
  isLinked?: boolean;
  /** テスト用に連携メールを明示注入する。 */
  linkedEmail?: string | null;
  /**
   * テスト/Milestone C 用に設定更新を注入する (省略時は no-op seam)。
   * 実 user_settings upsert + 付随副作用 (consent_logs / Sentry) はアプリ層 Function 配線。
   */
  onUpdateSettings?: (patch: SettingsPatch) => Promise<void> | void;
};

/** 設定 container。auth 由来の連携状態を反映し、永続化 seam を注入する。 */
export function SettingsContainer({
  isLinked: injectedIsLinked,
  linkedEmail: injectedLinkedEmail,
  onUpdateSettings,
}: SettingsContainerProps = {}) {
  const currentUser = useCurrentUser();
  const isLinked =
    injectedIsLinked !== undefined
      ? injectedIsLinked
      : currentUser.isSignedIn && !currentUser.isAnonymous;
  // 連携済のときだけ実メールを表示 (guest の合成 email を絶対に出さない、fix_001 回帰対策)。
  const linkedEmail =
    injectedLinkedEmail !== undefined ? injectedLinkedEmail : isLinked ? currentUser.email : null;

  return (
    <SettingsPage
      isLinked={isLinked}
      linkedEmail={linkedEmail}
      // settings 取得 Function 未実装のため null (安全側既定で描画)。
      settings={null}
      // 設定永続化 seam: 実 upsert は Milestone C の Function 配線。
      onUpdateSettings={onUpdateSettings ?? (() => undefined)}
      // 削除 / 連携 / ログアウトは backend Function + 実 Clerk セッション前提の seam (未配線)。
    />
  );
}
