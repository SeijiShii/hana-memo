/**
 * アプリシェル — モバイルファースト アプリの共通クロム。下部ナビ + <Outlet/>。
 *
 * プロダクトのコアフロー (撮影 → 図鑑 → 設定) を下部ナビで結ぶ。NavLink で active route を
 * ハイライトする。各画面 (Outlet) はシェルの上に乗る nested route として描画される。
 *
 * 法務静的ページ (/legal/*) や決済戻り (/billing/success) は本シェルの外 (ナビ非表示) に置く
 * 設計だが、それは App.tsx のルート構成側で制御する (本シェルは下部ナビ付きレイアウトのみ担う)。
 *
 * 関連: docs/concept.md §1 (コアフロー), docs/design/design-system.md, src/App.tsx
 */
import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Camera, Leaf, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

/** 下部ナビ項目 (プロダクトのコア導線)。アイコンは lucide line icon。 */
const NAV_ITEMS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/capture', label: '撮影', Icon: Camera },
  { to: '/notebook', label: '図鑑', Icon: Leaf },
  { to: '/settings', label: '設定', Icon: Settings },
];

export type AppShellProps = {
  /** Outlet の代わりに children を描画する場合に使う (テスト/特殊レイアウト用)。 */
  children?: ReactNode;
};

/** 下部ナビ付きアプリシェル。children 未指定なら nested route の Outlet を描画する。 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {/* メインコンテンツ (下部ナビ分の余白を確保) */}
      <div className="flex-1 pb-20">{children ?? <Outlet />}</div>

      {/* 下部ナビ (モバイルファースト、固定) */}
      <nav
        aria-label="メインナビゲーション"
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-line bg-surface/95 backdrop-blur"
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors',
                isActive ? 'font-bold text-moss-dark' : 'font-medium text-ink-faint hover:text-ink-soft',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex items-center justify-center rounded-pill px-4 py-1 transition-colors',
                    isActive && 'bg-moss-light',
                  )}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
