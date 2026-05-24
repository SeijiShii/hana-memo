/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk 公開可能キー (pk_test_… / pk_live_…)。frontend に露出してよい。 */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
