import { Link, Routes, Route } from 'react-router-dom';
import { CapturePage, PreviewPage } from './features/capture';
import { NotebookPage } from './features/notebook';
import { BillingPage, BillingSuccessPage } from './features/billing';
import { LegalPage } from './features/legal';
import { SettingsPage } from './features/account';

// Phase 3.5 app bootstrap で各機能の画面を順次 wiring していく。
// home → /capture (撮影) / /notebook (発見ノート) を起点に各 feature の presentation を配線する。
// NotebookPage は token を要する useNotebook をアプリ層で配線する想定 (現状は props 既定の空一覧)。
// export (書き出し: CSV/PDF/画像 ZIP) も NotebookPage ヘッダの props-seam (exportProps) 経由で同じ
// auth bootstrap 時に配線する。CSV は useExport.exportCsv、PDF/画像 ZIP は実 jsPDF/JSZip レンダラを
// 注入した生成関数を渡す (実 PDF/ZIP 生成 + token/billing unlock 配線は Milestone C)。
// memory 同様、token 配線前は exportProps 未指定で書き出しボタンを非表示にしておく (後方互換)。
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

// billing (課金) の presentation を配線する。capture の QuotaModal / export の PDF アンロック導線が
// /billing に遷移する (両者とも navigate('/billing') 済)。BillingPage の購入は Stripe Checkout への
// リダイレクトという外部副作用を伴うため、onCheckout (props-seam) として注入する。token 配線前の現状は
// 実 createCheckout + location 遷移を行わない no-op を渡しておき (NotebookPage の未配線と同パターン)、
// auth/billing hook 配線時 (Milestone C) に createCheckout + location.assign を流し込む。
// /billing/success は success_url 戻り。confirmCheckout の poll をアプリ層で onConfirm 注入する想定。
function BillingRoute() {
  return <BillingPage onCheckout={() => undefined} />;
}

// legal (法務) の presentation を配線する。/legal/* は認証不要の公開静的ページ (UC2)。
// 同意ゲート (ConsentGate) は特定 URL ではなくアプリ起動時に全画面へ被せる overlay として
// マウントする設計 (SPEC UC1/UC4)。overlay は「自分の同意済バージョン (deriveLatestConsents 由来)」と
// 「consent_logs INSERT + localStorage 保存」を要し、いずれも auth/db token を要求する seam のため、
// NotebookPage / BillingPage の未配線と同パターンで Milestone C (auth bootstrap) で配線する。
// それまでは overlay を出さず (= 同意必須を強制しない) 既存ルートを素通しにしておく (後方互換)。
// 配線時は <ConsentGate currentVersions={...} onConsent={recordConsents 配線} onReject={...} /> を
// App ルートの末尾に常時マウントする想定。

// account (設定) の presentation を配線する。capture の ai_consent_revoked 導線 (CapturePage の
// 「設定画面へ」リンク → /settings) が本画面に到達する。設定の保存は onUpdateSettings (props-seam)、
// 削除は onDeleteAccount (props-seam) として注入する。設定の永続化 (user_settings upsert /
// consent_logs INSERT / Sentry reconfigure) と実削除 (requestAccountDeletion + signOut) はいずれも
// auth/db token を要するため、NotebookPage / BillingRoute の未配線と同パターンで Milestone C
// (auth bootstrap) に配線する。それまでは no-op onUpdateSettings を渡し、匿名既定 (isLinked=false) で
// 連携 CTA を出しておく (後方互換)。capture が誘導する /settings に加え、SPEC UC1 の正規ルート
// /account/settings も同じ画面に解決させる。
function SettingsRoute() {
  return <SettingsPage onUpdateSettings={() => undefined} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/capture" element={<CapturePage />} />
      <Route path="/capture/preview" element={<PreviewPage />} />
      <Route path="/notebook" element={<NotebookPage />} />
      <Route path="/billing" element={<BillingRoute />} />
      <Route path="/billing/success" element={<BillingSuccessPage />} />
      <Route path="/settings" element={<SettingsRoute />} />
      <Route path="/account/settings" element={<SettingsRoute />} />
      <Route path="/legal/privacy" element={<LegalPage doc="privacy_policy" />} />
      <Route path="/legal/terms" element={<LegalPage doc="terms_of_service" />} />
      <Route path="/legal/ai-usage" element={<LegalPage doc="ai_usage" />} />
      <Route path="/legal/specified-commercial-transactions" element={<LegalPage doc="scta" />} />
    </Routes>
  );
}
