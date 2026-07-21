import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import { STORAGE_KEY, waitDashboardReady } from "./helpers";

/**
 * バックアップの往復スモーク(Issue #95 の「余力があれば」枠)。
 *   成績を控えに書き出す → 同じファイルから復元する
 * まで一気通貫で、UI 経由の書き出し / 読み戻しが成立することを確認する。
 *
 * 事前の成績はテスト用に localStorage を直接シードして用意する
 * (アプリ本体は StorageAdapter 経由でしか触らない。ここはテストの下ごしらえ)。
 */
test("バックアップ: 控えの書き出し→復元の往復", async ({ page }) => {
  const seed = [
    {
      questionId: "q1",
      choiceIndex: 0,
      pts: 2,
      max: 2,
      answeredAt: "2026-07-20T00:00:00.000Z",
    },
  ];
  await page.addInitScript(
    ({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, data: seed },
  );

  await page.goto("/");
  await waitDashboardReady(page);

  // 控えパネル(<details>)を開く
  await page.getByText("記録の控え(書き出し・復元)").click();

  // 書き出し(ダウンロード)を捕捉し、中身に成績が含まれることを確認
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "控えを書き出す" }).click(),
  ]);
  const downloadPath = await download.path();
  const content = fs.readFileSync(downloadPath, "utf-8");
  const parsed = JSON.parse(content) as { attempts: Array<{ questionId: string }> };
  expect(parsed.attempts.some((a) => a.questionId === "q1")).toBe(true);

  // 復元: window.confirm を受諾し、書き出したファイルを読み戻す
  page.on("dialog", (dialog) => dialog.accept());
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "控えから復元する" }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles(downloadPath);

  // 復元完了メッセージが表示される(dev の Next.js トーストと role が
  // 衝突するため、テキストで直接ねらう)
  await expect(page.getByText(/復元しました/)).toBeVisible();
});
