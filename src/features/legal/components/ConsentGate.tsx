/**
 * 同意ゲート — 初回起動同意 (UC1) と改訂時再同意 (UC4) を 1 コンポーネントで担う overlay。
 *
 * アプリ起動時にメイン画面の上に被せる Portal 風 overlay として描画する (PLAN §6: モーダル中は
 * メイン操作を blocking)。ルートではなく overlay にした理由:
 *   - SPEC UC1/UC4 が「起動時の gate」で、特定 URL ではなく全画面に被せる挙動を要求している
 *   - 同意完了後はそのまま元の画面操作に復帰でき、navigate を伴わない
 *
 * 再同意判定は legal コアの needsReConsent (versions.ts) を **そのまま** 使う:
 *   - currentVersions (自分の同意済バージョン、空 {} なら初回扱い) と latest を比較し、
 *     再同意が必要な doc_type のみチェックボックスを出す。
 *   - diffs が空 (= 全て同意済かつ最新) なら何も描画しない (gate 通過)。
 * これにより「未同意なら 3 件全表示 (初回)」「改訂のあった doc のみ表示 (再同意)」が
 * 同一ロジックで自然に導かれる (初回は currentVersions={} で全 doc が diffs に入る)。
 *
 * 同意の永続化 (consent_logs INSERT / localStorage 保存) は app/db 側の責務。本コンポーネントは
 * 同意された docTypes を onConsent(docTypes) で通知するだけの seam とする
 * (capture/billing/export の props-injection seam パターンに準拠)。
 *
 * 拒否フロー (E-LE-003): 右上「閉じる」押下で「サービスを利用できません」表示に切り替え、
 * onReject を通知する (メイン画面には遷移させない = overlay を出し続ける)。
 *
 * AI データ利用 + Sentry/PII スクラブ開示は ai_usage / privacy_policy のチェックボックス内
 * 「全文を見る」リンク先 (LegalPage) で開示する (revise_sentry_disclosure: プラポリ §4 に明記済)。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1 UC1/UC4 §4.2 (E-LE-003),
 *       002_legal_PLAN.md §1.1/§6, 004_legal_E2E_TEST.md (E-LE-1/4/5),
 *       revise_sentry_disclosure_20260524/001_REVISE_SPEC.md
 */
import { useMemo, useState } from 'react';
import type { DocType } from '../../../shared/types/domain';
import { LATEST_VERSIONS, needsReConsent } from '../versions';
import { ConsentCheckbox } from './ConsentCheckbox';

export type ConsentGateProps = {
  /**
   * 自分の同意済バージョン (doc_type → version)。アプリ層が deriveLatestConsents の結果を渡す。
   * 既定 {} (初回 = 全 doc 未同意)。null/未取得時はまだ判定不能なので、アプリ層が取得まで
   * gate をマウントしないか、{} を渡して安全側 (初回扱い) に倒す。
   */
  currentVersions?: Partial<Record<DocType, string>>;
  /** 比較対象の最新バージョン。既定 LATEST_VERSIONS。テスト/リハーサルで上書き可能。 */
  latestVersions?: Record<DocType, string | null>;
  /**
   * 同意完了時。同意した doc_type 一覧 (= 再同意が必要だった diffs) を渡す。
   * 永続化 (consent_logs INSERT + localStorage) はアプリ層が配線する seam。
   */
  onConsent: (docTypes: DocType[]) => Promise<void> | void;
  /** 拒否 (閉じる) 時。匿名 user の孤児化 / 起動中止はアプリ層が処理する。 */
  onReject?: () => void;
  /** 同意処理中フラグ (アプリ層 INSERT 中)。既定 false。 */
  submitting?: boolean;
  /** 同意 INSERT 失敗 (E-LE-001、アプリ層由来)。 */
  error?: Error | null;
};

/**
 * 同意ゲート overlay。needsReConsent で diffs が空なら何も描画しない (gate 通過)。
 * diffs がある間は、その doc_type のみ同意チェックボックスを出して同意を取る。
 */
export function ConsentGate({
  currentVersions = {},
  latestVersions = LATEST_VERSIONS,
  onConsent,
  onReject,
  submitting = false,
  error = null,
}: ConsentGateProps) {
  // 再同意が必要な doc_type (初回は currentVersions={} で全 doc が入る)。
  const { needsReConsent: required, diffs } = useMemo(
    () => needsReConsent(currentVersions, latestVersions),
    [currentVersions, latestVersions],
  );

  // 初回 (同意済バージョンが 1 件もない) か改訂再同意かでコピーを切り替える。
  const isInitial = Object.keys(currentVersions).length === 0;

  // doc_type ごとのチェック状態。
  const [checked, setChecked] = useState<Partial<Record<DocType, boolean>>>({});
  // 拒否 (閉じる) 後の「利用できません」表示。
  const [rejected, setRejected] = useState(false);
  const [localError, setLocalError] = useState<Error | null>(null);

  // diffs が空 = 全て最新に同意済 → gate を出さない。
  if (!required) {
    return null;
  }

  const allChecked = diffs.every((docType) => checked[docType] === true);

  const handleAgree = async () => {
    if (!allChecked || submitting) {
      return;
    }
    setLocalError(null);
    try {
      await onConsent(diffs);
    } catch (err) {
      setLocalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleReject = () => {
    setRejected(true);
    onReject?.();
  };

  // E-LE-003: 拒否 → サービス利用不可表示 (メイン画面には遷移させない)。
  if (rejected) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="サービスを利用できません"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      >
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <h2 className="text-lg font-bold text-neutral-800">サービスを利用できません</h2>
          <p className="mt-2 text-sm text-neutral-600">
            同意がいただける場合は再度起動してください。
          </p>
          <button
            type="button"
            onClick={() => {
              setRejected(false);
            }}
            className="mt-5 rounded-lg px-4 py-2 text-sm text-green-700 hover:bg-green-50"
          >
            同意画面に戻る
          </button>
        </div>
      </div>
    );
  }

  const shownError = error ?? localError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isInitial ? 'ご利用にあたっての同意' : '規約改訂への再同意'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-neutral-800">
            {isInitial ? 'ご利用にあたって' : '規約が改訂されました'}
          </h2>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            aria-label="閉じる"
            className="-mr-2 -mt-2 rounded-lg px-2 py-1 text-xl leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-600">
          {isInitial
            ? '本サービスを利用するには、以下のすべてに同意いただく必要があります。各全文をご確認ください。'
            : '以下の文書が改訂されました。続けてご利用いただくには、再度ご確認・同意ください。'}
        </p>

        {shownError ? (
          <p role="alert" className="mt-3 text-sm text-red-500">
            同意の保存に失敗しました。もう一度お試しください。
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {diffs.map((docType) => (
            <ConsentCheckbox
              key={docType}
              docType={docType}
              checked={checked[docType] === true}
              disabled={submitting}
              onChange={(next) => setChecked((prev) => ({ ...prev, [docType]: next }))}
            />
          ))}
        </div>

        {!allChecked ? (
          <p className="mt-3 text-xs text-neutral-400">全項目に同意が必要です</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAgree}
            disabled={!allChecked || submitting}
            aria-busy={submitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? '処理中…' : isInitial ? '同意して始める' : '同意して続ける'}
          </button>
        </div>
      </div>
    </div>
  );
}
