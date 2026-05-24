import { Link, Routes, Route } from 'react-router-dom';
import { CapturePage, PreviewPage } from './features/capture';

// Phase 3.5 app bootstrap で各機能の画面を順次 wiring していく。
// home → /capture (撮影) を起点に、capture feature の presentation を配線する。
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
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/capture" element={<CapturePage />} />
      <Route path="/capture/preview" element={<PreviewPage />} />
    </Routes>
  );
}
