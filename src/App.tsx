import { Link, Routes, Route } from 'react-router-dom';
import { CapturePage, PreviewPage } from './features/capture';
import { NotebookPage } from './features/notebook';

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/capture" element={<CapturePage />} />
      <Route path="/capture/preview" element={<PreviewPage />} />
      <Route path="/notebook" element={<NotebookPage />} />
    </Routes>
  );
}
