import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// hana-memo フロント設定 (concept §1.4 / §4.5)。
// vercel dev は framework=vite を検出して本設定で Vite を起動する。
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'hana-memo / 植物の名前わかるんメモ',
        short_name: 'hana-memo',
        description:
          '散歩中に出会った草花を撮るだけで AI が名前を当て、自分だけの植物発見ノートが育っていく PWA',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  server: { port: 3000 },
});
