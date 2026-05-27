import { Link, Routes, Route } from 'react-router-dom';
import { Camera, BookOpen } from 'lucide-react';
import { AppShell } from './app/AppShell';
import { SproutingNote } from './components/illustrations/Botanical';
import { AppConsentGate } from './app/AppConsentGate';
import { CaptureContainer, PreviewContainer } from './features/capture';
import { NotebookContainer, DiscoveryDetailContainer } from './features/notebook';
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-16 text-center">
      <SproutingNote size={128} aria-hidden className="mb-4" />
      <h1 className="text-[26px] font-bold leading-tight text-moss-dark">hana-memo</h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
        散歩中に出会った草花を撮るだけ。AI
        が名前を教えてくれて、自分だけの植物発見ノートが少しずつ育っていきます。
      </p>
      <Link to="/capture" className="btn-primary mt-8">
        <Camera size={18} aria-hidden />
        撮影する
      </Link>
      <Link to="/notebook" className="btn-ghost mt-3">
        <BookOpen size={18} aria-hidden />
        発見ノートをひらく
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
          <Route path="/notebook/:id" element={<DiscoveryDetailContainer />} />
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
