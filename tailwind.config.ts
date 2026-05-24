import type { Config } from 'tailwindcss';

/**
 * hana-memo デザイントークン — 「植物フィールドノート」(温かい紙 + 苔色 + インク)。
 * 由来: docs/design/design-system.md (concept.md の提供価値「発見ノート主役・穏やか」から導出)。
 * 色は意味名で参照する (bg-paper / text-ink / bg-moss など)。
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F2E9', // 紙のような背景
        surface: { DEFAULT: '#FFFFFF', soft: '#FDFBF5' },
        ink: { DEFAULT: '#2E2A24', soft: '#6B6256', faint: '#9A9080' },
        line: '#E7E0D2', // 罫線・境界
        moss: { DEFAULT: '#5B7A53', dark: '#3E5A39', light: '#EAF0E4' }, // 主色 (苔・葉)
        bloom: { DEFAULT: '#D98C7A', soft: '#FBE7E1' }, // 花アクセント (控えめ)
        pollen: { DEFAULT: '#E0A93B', soft: '#FBF2DC' }, // 季節・花粉バッジ
      },
      fontFamily: {
        sans: [
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Yu Gothic"',
          '"Noto Sans JP"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Hiragino Maru Gothic ProN"',
          '"Hiragino Sans"',
          '"Noto Sans JP"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: { card: '18px', pill: '999px' },
      boxShadow: {
        soft: '0 1px 2px rgba(46,42,36,.06), 0 6px 18px rgba(46,42,36,.06)',
        lift: '0 4px 12px rgba(46,42,36,.10), 0 16px 36px rgba(46,42,36,.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
