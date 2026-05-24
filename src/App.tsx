import { Link, Routes, Route } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { AppConsentGate } from './app/AppConsentGate';
import { CaptureContainer, PreviewContainer } from './features/capture';
import { NotebookContainer } from './features/notebook';
import { BillingContainer, BillingSuccessContainer } from './features/billing';
import { LegalPage } from './features/legal';
import { SettingsContainer } from './features/account';

// Phase 3.5 app bootstrap — 各 feature の presentation を実 hook 配線済みの container 経由でマウントする。
// container は app 層 useAuthToken でトークンを解決し、各 feature hook (useNotebook / useMemories /
// useBillingStatus / useExport / useCaptureFlow 等) を起動して画面の props-seam に流し込む。
// token 未解決 / 未 sign-in (keyless 含む) の間は、各 container が空状態 or no-op seam の画面を描画する
// (偽の動作を作らず、クラッシュもしない)。
//
// レイアウト構成:
//   - AppShell (下部ナビ: 撮影 / 図鑑 / 設定) を layout route として主要画面に被せる。
//   - 公開静的ページ (/legal/*) と決済戻り (/billing/success) はナビ非表示の全画面として shell 外に置く。
//   - AppConsentGate (同意 overlay) はルート末尾に常時マウント (既定 disabled、Milestone C で有効化)。
function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-neutral-800">
      <h1 className="text-2xl font-bold text-green-700">hana-memo 🌿</h1>
      <p className="max-w-sm text-center text-sm text-neutral-500">
        散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA
      </p>
      <Link
        to="/capture"
        className="rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700"
      >
        撮影する
      </Link>
      <Link
        to="/notebook"
        className="rounded-lg border border-green-600 px-6 py-3 text-base font-semibold text-green-700 hover:bg-green-50"
      >
        発見ノート
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        {/* 主要画面 (下部ナビ付きシェル). capture が誘導する /settings と SPEC 正規の /account/settings は同画面. */}
        <Route element={<AppShell />}>
          <Route path="/capture" element={<CaptureContainer />} />
          <Route path="/capture/preview" element={<PreviewContainer />} />
          <Route path="/notebook" element={<NotebookContainer />} />
          <Route path="/billing" element={<BillingContainer />} />
          <Route path="/settings" element={<SettingsContainer />} />
          <Route path="/account/settings" element={<SettingsContainer />} />
        </Route>

        {/* ナビ非表示の全画面 (ランディング / 決済戻り / 公開静的ページ) */}
        <Route path="/" element={<Home />} />
        <Route path="/billing/success" element={<BillingSuccessContainer />} />
        <Route path="/legal/privacy" element={<LegalPage doc="privacy_policy" />} />
        <Route path="/legal/terms" element={<LegalPage doc="terms_of_service" />} />
        <Route path="/legal/ai-usage" element={<LegalPage doc="ai_usage" />} />
        <Route path="/legal/specified-commercial-transactions" element={<LegalPage doc="scta" />} />
      </Routes>

      {/* 同意ゲート overlay (既定 disabled: consent 永続化 API 未配線のため常時表示しない). */}
      <AppConsentGate />
    </>
  );
}
