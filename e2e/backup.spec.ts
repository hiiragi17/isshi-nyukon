import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import { STORAGE_KEY, waitDashboardReady } from "./helpers";

// お気に入りの保存キー(lib/storage.ts の FAVORITES_STORAGE_KEY と同じ)
const FAVORITES_KEY = "isshi-nyukon:favorites:v2";

/**
 * バックアップの往復スモーク(Issue #95 の「余力があれば」枠)。
 *   成績とお気に入りを控えに書き出す → 同じファイルから復元する
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
    ({ key, data, favKey }) => {
      // 復元後に消えていないことを見るため、お気に入りは初回の1回だけシードする
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, JSON.stringify(data));
        window.localStorage.setItem(favKey, JSON.stringify(["q1-0"]));
      }
    },
    { key: STORAGE_KEY, data: seed, favKey: FAVORITES_KEY },
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
  // 書き出しに失敗するとパスが空になり得るため、読み込み前に存在を確かめる
  expect(downloadPath).toBeTruthy();
  const content = fs.readFileSync(downloadPath, "utf-8");
  const parsed = JSON.parse(content) as {
    attempts: Array<{ questionId: string }>;
    favorites?: string[];
  };
  expect(parsed.attempts.some((a) => a.questionId === "q1")).toBe(true);
  // お気に入りも控えに含まれる(#507)
  expect(parsed.favorites).toEqual(["q1-0"]);

  // 復元: window.confirm を受諾し、書き出したファイルを読み戻す
  page.on("dialog", (dialog) => dialog.accept());
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "控えから復元する" }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles(downloadPath);

  // 復元完了メッセージが表示される(dev の Next.js トーストと role が
  // 衝突するため、テキストで直接ねらう)
  await expect(page.getByText(/復元しました/)).toBeVisible();
  await expect(page.getByText(/お気に入り1肢/).last()).toBeVisible();

  // 復元後もお気に入りが保存されている
  const favs = await page.evaluate(
    (k) => window.localStorage.getItem(k),
    FAVORITES_KEY,
  );
  expect(JSON.parse(favs ?? "null")).toEqual(["q1-0"]);
});
