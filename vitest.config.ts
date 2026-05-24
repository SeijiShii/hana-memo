import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // 既定は node。React component/hook テストはファイル先頭の `// @vitest-environment happy-dom` で上書きする。
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'api/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'drizzle'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'drizzle/**',
        '**/*.config.ts',
        '**/*.test.ts',
        'src/shared/db/seed.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@shared': new URL('./src/shared', import.meta.url).pathname,
    },
  },
});
