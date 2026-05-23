import { Routes, Route } from 'react-router-dom';

// Phase 3.5 app bootstrap で各機能の画面を順次 wiring していく。
// 現状は shell の placeholder home のみ (動作確認用)。
function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-neutral-800">
      <h1 className="text-2xl font-bold text-green-700">hana-memo 🌿</h1>
      <p className="max-w-sm text-center text-sm text-neutral-500">
        散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA
      </p>
      <p className="text-xs text-neutral-400">Phase 3.5 app bootstrap — shell scaffolded</p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
