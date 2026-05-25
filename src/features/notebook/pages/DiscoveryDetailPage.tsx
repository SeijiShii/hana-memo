/**
 * 発見詳細 (読み取り専用) — SPEC UC4 の閲覧部 (revise_001)。
 *
 * props-seam: discovery + imageUrl + onBack をアプリ層 (DiscoveryDetailContainer) が注入。
 * 大きい画像 + 名前 + 学名 + 状態 + 撮影日時 + 場所 + メモ を表示する。
 * 編集 / 削除 / 再識別 (UC4 編集/UC5/UC7) は本改修スコープ外 = follow-up。
 *
 * コピーは技術用語を避ける (O38): status は日常語、「objectKey」等は出さない。
 * 関連: docs/notebook/revise_001_20260525_detail-thumbnail/001_REVISE_SPEC.md §7.1
 */
import { ChevronLeft, Leaf } from 'lucide-react';
import type { NotebookDiscovery } from '../types';

/** status を日常語に (O38)。 */
const STATUS_LABEL: Record<NotebookDiscovery['status'], string> = {
  identifying: '名前を調べています',
  identified: '名前がわかりました',
  pending: '候補があります（確定前）',
  unknown: '名前がわかりませんでした',
};

export type DiscoveryDetailPageProps = {
  /** 表示対象。null = 未取得 (loading) or 見つからない。 */
  discovery: NotebookDiscovery | null;
  /** 署名付き画像 URL (未解決は null → プレースホルダ)。 */
  imageUrl?: string | null;
  /** 一覧取得中フラグ (true なら「読み込み中」、false + discovery null で「見つかりません」)。 */
  loading?: boolean;
  /** 戻る導線。 */
  onBack?: () => void;
};

function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiscoveryDetailPage({
  discovery,
  imageUrl,
  loading,
  onBack,
}: DiscoveryDetailPageProps) {
  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 self-start text-sm text-ink-soft hover:text-ink"
    >
      <ChevronLeft size={18} aria-hidden />
      ノートへ戻る
    </button>
  );

  if (!discovery) {
    return (
      <main className="flex min-h-dvh flex-col items-center gap-6 bg-paper p-6 text-ink">
        {backButton}
        <p className="mt-12 text-ink-soft">{loading ? '読み込み中…' : '見つかりませんでした。'}</p>
      </main>
    );
  }

  const name =
    discovery.userOverriddenName ?? discovery.commonName ?? STATUS_LABEL[discovery.status];

  return (
    <main className="flex min-h-dvh flex-col items-center gap-5 bg-paper p-6 text-ink">
      {backButton}
      <div className="aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-surface-soft">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-moss-dark/40">
            <Leaf size={48} aria-hidden />
          </div>
        )}
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-moss-dark">{name}</h1>
        {discovery.scientificName ? (
          <p className="mt-1 text-sm italic text-ink-soft">{discovery.scientificName}</p>
        ) : null}

        <dl className="mt-5 flex flex-col gap-3 text-sm">
          <Row label="状態" value={STATUS_LABEL[discovery.status]} />
          <Row label="見つけた日時" value={formatCapturedAt(discovery.capturedAt)} />
          {discovery.location ? (
            <Row
              label="見つけた場所"
              value={`${discovery.location.lat.toFixed(4)}, ${discovery.location.lng.toFixed(4)}`}
            />
          ) : null}
          {discovery.userNote ? <Row label="メモ" value={discovery.userNote} /> : null}
        </dl>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line pb-2">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="whitespace-pre-wrap text-ink">{value}</dd>
    </div>
  );
}
