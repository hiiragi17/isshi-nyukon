import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * ユニットテスト設定(T5 で導入 / Phase 3 でコンポーネントへ拡張)。
 * tsconfig の paths(`@/*` → ルート)を alias で再現する。
 *
 * - lib/ の純粋ロジックは既定の node 環境で実行する
 *   (storage のテストは window 不在の SSR 挙動を検証するため node が必須)。
 * - components/ のエンジンテストはファイル先頭の
 *   `// @vitest-environment jsdom` で個別に jsdom を有効化する。
 */
export default defineConfig({
  // tsx を React の自動 JSX ランタイムで変換する(components/ のエンジンテスト用)。
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL("./", import.meta.url)),
      },
    ],
  },
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts", "components/**/*.test.tsx"],
  },
});
