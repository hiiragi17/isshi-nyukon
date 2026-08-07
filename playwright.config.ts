import { defineConfig, devices } from "@playwright/test";

/**
 * E2E スモークテスト設定(Issue #95)。
 *
 * ユニットテスト(vitest)では守れない画面横断の動作
 * ―― 出題 → 解答 → 判決 → ダッシュボード反映、localStorage 永続化、
 * バックアップの往復 ―― を最小構成の E2E で保護する。
 *
 * - テストは `e2e/` 配下のみ。vitest の include(lib/components/data)とは
 *   ディレクトリで分離しており、`pnpm test` とは干渉しない。
 * - モバイルファースト(コンテンツ幅 max 560px)のため、ビューポートは
 *   スマホ相当の 390px 幅で実行する。
 * - webServer で `pnpm dev` を自動起動する(既に起動済みなら再利用)。
 * - ブラウザは Playwright 既定の解決(PLAYWRIGHT_BROWSERS_PATH)を使う。
 *   実行環境にプリインストール済みの Chromium を直接指すときは
 *   環境変数 `PW_CHROMIUM_PATH` に実行ファイルパスを渡す(任意)。
 */
const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;
const chromiumPath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        ...(chromiumPath
          ? { launchOptions: { executablePath: chromiumPath } }
          : {}),
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
