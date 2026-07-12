import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * ユニットテスト設定(T5 で導入)。
 * tsconfig の paths(`@/*` → ルート)を alias で再現する。
 * テスト対象は純粋ロジック(lib/)のみ。
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL("./", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
