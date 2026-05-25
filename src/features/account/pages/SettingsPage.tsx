/**
 * 設定画面 (UC1) — アカウント連携 / 位置情報精度 / AI 同意 / データ管理 (削除) を 1 画面に並べる。
 *
 * capture の ai_consent_revoked 導線 (CapturePage の「設定画面へ」リンク → /settings) や各 CTA が
 * 本画面に到達する。現在の設定値を表示し、トグル/ラジオ操作で onUpdateSettings を起動する。
 *
 * 副作用の seam (capture/notebook/billing/legal の props-injection seam に準拠):
 *   - 設定の永続化は onUpdateSettings(patch) で注入する。アプリ層が user_settings upsert +
 *     (AI 同意 OFF→ON 時の consent_logs INSERT / analytics_opt_in 変化時の Sentry reconfigure) を配線する。
 *     本画面は deriveAiConsentChange / validateLocationPrecision でドメイン値を導出して patch を渡すだけ。
 *   - 削除は DeleteAccountDialog 経由で onDeleteAccount を起動 (実 requestAccountDeletion + signOut は
 *     アプリ層が配線)。本画面は実削除を行わない。
 *
 * OAuth ゲート:
 *   匿名 (Guest) user は「Google で連携する」CTA を表示し、押下で OAuthRequiredModal を開く
 *   (既存モーダルを再利用)。連携済 user は連携済ステータス + 「ログアウト」を表示する (UC6)。
 *   匿名 user には削除セクションを出さず「連携してから削除してください」と案内する (PLAN §6 匿名 user 削除)。
 *
 * 状態表示: settingsLoading (未取得=ローディング) / settingsError (取得失敗) / saving (保存中) /
 *           saveError (保存失敗=E-AC-004) / saved (保存成功 toast)。
 *
 * 関連: docs/account/001_account_SPEC.md §1 UC1/UC3/UC4/UC5/UC6 §4 (E-AC-004),
 *       docs/account/002_account_PLAN.md §1.1
 */
import { useState } from 'react';
import { Link2, LogOut, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { OAuthRequiredModal } from '../../billing/OAuthRequiredModal';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import {
  LOCATION_PRECISIONS,
  deriveAiConsentChange,
  isAiConsentActive,
  validateLocationPrecision,
  type LocationPrecision,
} from '../settings';

/**
 * 設定画面が読み書きする user_settings の表示用ビュー。
 * UserSettings (domain.ts、Drizzle infer) のサブセットで、アプリ層が画面に渡すのに必要な列のみ。
 */
export type SettingsView = {
  /** 位置情報精度 (precise/coarse/off)。 */
  locationPrecision: LocationPrecision;
  /** AI 同意 revoke 時刻。null なら同意有効。 */
  aiConsentRevokedAt: Date | null;
  /** 品質改善協力 (Sentry opt-in)。 */
  analyticsOptIn: boolean;
};

/** onUpdateSettings に渡す部分更新 (user_settings の列に対応)。 */
export type SettingsPatch = {
  locationPrecision?: LocationPrecision;
  aiConsentRevokedAt?: Date | null;
  analyticsOptIn?: boolean;
};

/** 位置情報精度ラジオのラベル (SPEC UC3)。 */
const LOCATION_PRECISION_LABELS: Record<LocationPrecision, string> = {
  precise: '精細（約 1m）',
  coarse: 'おおまか（約 100m）',
  off: '記録しない',
};

export type SettingsPageProps = {
  /** 現在の設定 (アプリ層 useUserSettings 由来)。未取得は null。 */
  settings?: SettingsView | null;
  /** 設定取得中フラグ。既定 false。 */
  settingsLoading?: boolean;
  /** 設定取得エラー。 */
  settingsError?: Error | null;
  /**
   * 設定更新 (user_settings upsert + 付随副作用の seam)。アプリ層が配線する。
   * 本画面はドメイン値を導出して patch を渡すだけで、実 DB 書き込みはしない。
   */
  onUpdateSettings: (patch: SettingsPatch) => Promise<void> | void;
  /** 設定保存中フラグ (アプリ層由来 or 内部起動)。既定 false。 */
  saving?: boolean;
  /** 設定保存エラー (E-AC-004、アプリ層 upsert 失敗由来)。 */
  saveError?: Error | null;
  /** OAuth リンク済か (_shared/auth.isLinked 由来)。既定 false (匿名扱い)。 */
  isLinked?: boolean;
  /** 連携済アカウントの表示用メール (任意)。 */
  linkedEmail?: string | null;
  /** 「Google で連携する」押下時 (_shared/auth.linkGoogleIdentity を配線)。 */
  onLink?: () => void;
  /** 「ログアウト」押下時 (_shared/auth.signOut を配線、OAuth user のみ)。 */
  onLogout?: () => void;
  /**
   * アカウント削除確定時 (DeleteAccountDialog から、整形済み理由を渡す)。
   * 実 requestAccountDeletion + signOut はアプリ層が配線する seam。
   */
  onDeleteAccount?: (reason: string | null) => Promise<void> | void;
  /** 削除予定の発見件数 (削除ダイアログ表示用)。既定 0。 */
  discoveryCount?: number;
  /** 削除予定の画像枚数 (削除ダイアログ表示用)。既定 0。 */
  imageCount?: number;
  /** 削除処理中フラグ。既定 false。 */
  deletePending?: boolean;
  /** 削除エラー (E-AC-005)。 */
  deleteError?: Error | null;
};

/** 設定画面。各セクションの操作で onUpdateSettings / onDeleteAccount を起動する。 */
export function SettingsPage({
  settings = null,
  settingsLoading = false,
  settingsError = null,
  onUpdateSettings,
  saving = false,
  saveError = null,
  isLinked = false,
  linkedEmail = null,
  onLink,
  onLogout,
  onDeleteAccount,
  discoveryCount = 0,
  imageCount = 0,
  deletePending = false,
  deleteError = null,
}: SettingsPageProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // onUpdateSettings の reject を拾うローカルエラー (アプリ層 saveError と OR 表示)。
  const [localError, setLocalError] = useState<Error | null>(null);
  // 保存成功 toast。次の操作開始でクリアする。
  const [saved, setSaved] = useState(false);

  const aiConsentOn = settings ? isAiConsentActive(settings.aiConsentRevokedAt) : true;

  const applyPatch = async (patch: SettingsPatch) => {
    setLocalError(null);
    setSaved(false);
    try {
      await onUpdateSettings(patch);
      setSaved(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleLocationChange = (value: string) => {
    if (saving) {
      return;
    }
    // ドメインバリデーションを通してから patch を渡す (不正値は例外で弾く)。
    void applyPatch({ locationPrecision: validateLocationPrecision(value) });
  };

  const handleAiConsentToggle = () => {
    if (saving) {
      return;
    }
    // OFF→ON で再同意 (revoked 解除)、ON→OFF で revoke。consent_logs INSERT 要否はアプリ層が判断。
    const change = deriveAiConsentChange(!aiConsentOn);
    void applyPatch({ aiConsentRevokedAt: change.aiConsentRevokedAt });
  };

  const handleAnalyticsToggle = () => {
    if (saving) {
      return;
    }
    const next = !(settings?.analyticsOptIn ?? false);
    void applyPatch({ analyticsOptIn: next });
  };

  const handleLinkClick = () => {
    setGateOpen(true);
  };

  const shownError = saveError ?? localError;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-paper p-4 text-ink">
      <h1 className="text-xl font-bold text-moss-dark">設定</h1>

      {settingsLoading && !settings ? (
        <p className="text-ink-faint">読み込み中…</p>
      ) : settingsError ? (
        <p role="alert" className="text-red-500">
          設定の取得に失敗しました
        </p>
      ) : (
        <>
          {saved ? (
            <p
              role="status"
              className="rounded-lg bg-moss-light px-4 py-2 text-sm font-semibold text-moss-dark"
            >
              保存しました
            </p>
          ) : null}

          {shownError ? (
            <p role="alert" className="text-sm text-red-500">
              保存できませんでした
            </p>
          ) : null}

          {/* アカウント section (UC2/UC6) */}
          <section
            aria-label="アカウント"
            className="flex flex-col gap-2 rounded-xl bg-surface-soft p-4"
          >
            <h2 className="text-sm font-bold text-ink-soft">アカウント</h2>
            {isLinked ? (
              <>
                <p className="text-sm text-ink-soft">
                  Google アカウント連携済{linkedEmail ? `（${linkedEmail}）` : ''}
                </p>
                {onLogout ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 self-start rounded-pill border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-soft"
                  >
                    <LogOut size={16} aria-hidden />
                    ログアウト
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft">
                  匿名で利用中です。連携すると別の端末でもデータを引き継げます。
                </p>
                <button type="button" onClick={handleLinkClick} className="btn-primary self-start">
                  <Link2 size={18} aria-hidden />
                  Google で連携する
                </button>
              </>
            )}
          </section>

          {/* 位置情報精度 section (UC3) */}
          <section
            aria-label="位置情報精度"
            className="flex flex-col gap-2 rounded-xl bg-surface-soft p-4"
          >
            <h2 className="text-sm font-bold text-ink-soft">位置情報精度</h2>
            <fieldset disabled={saving} className="flex flex-col gap-2">
              {LOCATION_PRECISIONS.map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="radio"
                    name="locationPrecision"
                    value={value}
                    checked={settings?.locationPrecision === value}
                    disabled={saving}
                    onChange={() => handleLocationChange(value)}
                    className="h-4 w-4 accent-moss"
                  />
                  {LOCATION_PRECISION_LABELS[value]}
                </label>
              ))}
            </fieldset>
          </section>

          {/* AI 同意 section (UC4) */}
          <section
            aria-label="AI 同意"
            className="flex flex-col gap-2 rounded-xl bg-surface-soft p-4"
          >
            <h2 className="text-sm font-bold text-ink-soft">AI 利用同意</h2>
            <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
              <span>撮影した草花を AI で識別する</span>
              <button
                type="button"
                role="switch"
                aria-checked={aiConsentOn}
                aria-label="AI 利用同意"
                disabled={saving}
                onClick={handleAiConsentToggle}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
                  aiConsentOn ? 'bg-moss' : 'bg-line',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all',
                    aiConsentOn ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </button>
            </label>
            {!aiConsentOn ? (
              <p className="text-xs text-ink-faint">
                AI
                識別を停止しています。過去のデータは保持されますが、撮影時に名前を推定できません。
              </p>
            ) : null}
          </section>

          {/* プライバシー section (UC7) */}
          <section
            aria-label="プライバシー"
            className="flex flex-col gap-2 rounded-xl bg-surface-soft p-4"
          >
            <h2 className="text-sm font-bold text-ink-soft">プライバシー</h2>
            <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
              <span>品質改善への協力（エラー情報の送信）</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings?.analyticsOptIn === true}
                aria-label="品質改善への協力"
                disabled={saving}
                onClick={handleAnalyticsToggle}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
                  settings?.analyticsOptIn ? 'bg-moss' : 'bg-line',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all',
                    settings?.analyticsOptIn ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </button>
            </label>
          </section>

          {/* データ管理 section (UC5) */}
          <section
            aria-label="データ管理"
            className="flex flex-col gap-2 rounded-xl bg-surface-soft p-4"
          >
            <h2 className="text-sm font-bold text-ink-soft">データ管理</h2>
            {isLinked ? (
              <>
                <p className="text-sm text-ink-soft">
                  アカウントとすべてのデータを削除します。この操作は元に戻せません。
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 self-start rounded-pill border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} aria-hidden />
                  アカウントを削除
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-faint">
                アカウントを削除するには、先に Google アカウントを連携してください。
              </p>
            )}
          </section>
        </>
      )}

      {/* 匿名 user 向け OAuth 連携ゲート (既存モーダルを再利用) */}
      <OAuthRequiredModal
        open={gateOpen}
        onLink={() => onLink?.()}
        onClose={() => setGateOpen(false)}
      />

      {/* アカウント削除確認ダイアログ (二段階 + 明示同意の seam) */}
      <DeleteAccountDialog
        open={deleteOpen}
        discoveryCount={discoveryCount}
        imageCount={imageCount}
        pending={deletePending}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onDeleteAccount={async (reason) => {
          await onDeleteAccount?.(reason);
        }}
      />
    </main>
  );
}
