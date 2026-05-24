/**
 * アプリシェル — モバイルファースト PWA の共通クロム。下部ナビ + <Outlet/>。
 *
 * プロダクトのコアフロー (撮影 → 図鑑 → 設定) を下部ナビで結ぶ。NavLink で active route を
 * ハイライトする。各画面 (Outlet) はシェルの上に乗る nested route として描画される。
 *
 * 法務静的ページ (/legal/*) や決済戻り (/billing/success) は本シェルの外 (ナビ非表示) に置く
 * 設計だが、それは App.tsx のルート構成側で制御する (本シェルは下部ナビ付きレイアウトのみ担う)。
 *
 * 関連: docs/concept.md §1 (コアフロー), src/App.tsx (ルート構成)
 */
import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/** 下部ナビ項目 (プロダクトのコア導線)。 */
const NAV_ITEMS: { to: string; label: string; icon: string }[] = [
  { to: '/capture', label: '撮影', icon: '📷' },
  { to: '/notebook', label: '図鑑', icon: '🌿' },
  { to: '/settings', label: '設定', icon: '⚙️' },
];

export type AppShellProps = {
  /** Outlet の代わりに children を描画する場合に使う (テスト/特殊レイアウト用)。 */
  children?: ReactNode;
};

/** 下部ナビ付きアプリシェル。children 未指定なら nested route の Outlet を描画する。 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* メインコンテンツ (下部ナビ分の余白を確保) */}
      <div className="flex-1 pb-16">{children ?? <Outlet />}</div>

      {/* 下部ナビ (モバイルファースト、固定) */}
      <nav
        aria-label="メインナビゲーション"
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-neutral-200 bg-white"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition-colors',
                isActive ? 'text-green-700' : 'text-neutral-400 hover:text-neutral-600',
              )
            }
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
