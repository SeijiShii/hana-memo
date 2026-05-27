/**
 * 撮影→識別の待ち時間オーバーレイ (perspectives O45)。
 *
 * AI 識別は数秒かかる本質遅延 (消せない)。素のスピナーでなく、**実段階に紐づくブランド文言**
 * (写真を送る → 観察する) + 葉の自作 SVG の軽い動きで「植物フィールドノート」の世界観に変える。
 * identifying (最長) のときだけ観察文言をローテーションして体感待ちを縮める。嘘進捗は出さない。
 *
 * 文言は技術用語を避ける (O38): 「アップロード」→「写真を送る」、「AI 識別」→「観察」。
 * 関連: src/features/capture/flow.ts (CaptureStage), pages/PreviewPage.tsx
 */
import { useEffect, useState } from 'react';
import type { CaptureStage } from '../flow';

const STAGE_HEADLINE: Record<CaptureStage, string> = {
  preparing: '写真を整えています',
  uploading: '写真を送っています',
  identifying: '葉や花のかたちを観察しています',
};

/** identifying 中にローテーションする観察文言 (ブランドの声、O38/O42)。 */
export const OBSERVATION_MESSAGES = [
  '葉のかたちを見ています…',
  '花の色を確かめています…',
  '葉脈をたどっています…',
  '図鑑と照らし合わせています…',
  '似た草花を思い出しています…',
] as const;

export function CaptureProgress({ stage }: { stage: CaptureStage }) {
  const [msgIdx, setMsgIdx] = useState(0);

  // 最長の identifying 段階でだけ観察文言をローテーション。
  useEffect(() => {
    if (stage !== 'identifying') return;
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % OBSERVATION_MESSAGES.length);
    }, 2000);
    return () => clearInterval(t);
  }, [stage]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="識別中"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-paper/95 px-6 text-center backdrop-blur-sm"
    >
      <SproutMark />
      <p className="text-lg font-bold text-moss-dark">{STAGE_HEADLINE[stage]}</p>
      {stage === 'identifying' ? (
        <p className="text-sm text-ink-soft">{OBSERVATION_MESSAGES[msgIdx]}</p>
      ) : null}
      <p className="text-xs text-ink-faint">少しだけお待ちください</p>
    </div>
  );
}

/** 芽生えの自作 SVG (line-art、テーマ色追従) + 軽い鼓動アニメ。 */
function SproutMark() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="animate-pulse text-moss-dark"
    >
      <path d="M24 44V20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 27c0 0-8-1-12-8 8-2 12 4 12 8Z" fill="currentColor" opacity="0.85" />
      <path d="M24 22c0 0 8-2 12-9-8-2-12 5-12 9Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
