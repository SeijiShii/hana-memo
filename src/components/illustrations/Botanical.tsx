/**
 * 植物モチーフの SVG イラスト (自作・no-dep・テーマ色追従)。
 *
 * 「発見ノートが育つ」を表す line-art botanical。絵文字や標準アイコンで表現しきれない
 * ブランド表現・空状態・オンボーディングに使う (design-system.md「イラスト戦略」)。
 * 色はトークン (moss/bloom/pollen/line) をハードコードせず stroke/fill で指定し、テーマと調和させる。
 */

export type IllustrationProps = {
  /** 一辺のピクセル目安 (正方〜縦長 viewBox を維持)。 */
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
};

/**
 * 芽吹くノート — ノートから双葉と小花が育つ。ホーム hero / 空状態の主役イラスト。
 */
export function SproutingNote({ size = 132, className, ...rest }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={(size * 150) / 140}
      viewBox="0 0 140 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="芽吹く発見ノート"
      {...rest}
    >
      {/* ノート本体 */}
      <rect x="26" y="60" width="88" height="76" rx="10" fill="#FFFFFF" stroke="#3E5A39" strokeWidth="2.4" />
      <line x1="40" y1="78" x2="100" y2="78" stroke="#E7E0D2" strokeWidth="2" />
      <line x1="40" y1="92" x2="100" y2="92" stroke="#E7E0D2" strokeWidth="2" />
      <line x1="40" y1="106" x2="86" y2="106" stroke="#E7E0D2" strokeWidth="2" />
      <line x1="40" y1="120" x2="92" y2="120" stroke="#E7E0D2" strokeWidth="2" />
      {/* 茎 */}
      <path d="M70 60 C70 40 70 28 70 16" stroke="#5B7A53" strokeWidth="2.6" strokeLinecap="round" />
      {/* 左葉 */}
      <path
        d="M70 40 C54 40 44 30 46 18 C60 18 70 28 70 40 Z"
        fill="#EAF0E4"
        stroke="#5B7A53"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* 右葉 */}
      <path
        d="M70 48 C86 48 96 38 94 26 C80 26 70 36 70 48 Z"
        fill="#EAF0E4"
        stroke="#5B7A53"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* 小花 */}
      <circle cx="70" cy="13" r="4.5" fill="#FBE7E1" stroke="#D98C7A" strokeWidth="2.2" />
      <circle cx="70" cy="13" r="1.6" fill="#E0A93B" />
    </svg>
  );
}

/**
 * 双葉の芽 (台地つき) — コンパクトな空状態用 spot イラスト。
 */
export function SproutSpot({ size = 96, className, ...rest }: IllustrationProps) {
  return (
    <svg
      width={size}
      height={(size * 80) / 96}
      viewBox="0 0 96 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="芽"
      {...rest}
    >
      <ellipse cx="48" cy="71" rx="30" ry="4.5" fill="#E7E0D2" />
      <path d="M48 71 C48 52 48 42 48 30" stroke="#5B7A53" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M48 50 C32 50 22 40 24 27 C39 27 48 38 48 50 Z"
        fill="#EAF0E4"
        stroke="#5B7A53"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M48 58 C64 58 74 48 72 35 C57 35 48 46 48 58 Z"
        fill="#EAF0E4"
        stroke="#5B7A53"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="24" r="6" fill="#FBE7E1" stroke="#D98C7A" strokeWidth="2.2" />
      <circle cx="48" cy="24" r="2" fill="#E0A93B" />
    </svg>
  );
}
