import { test, expect } from "@playwright/test";
import { STORAGE_KEY, waitDashboardReady } from "./helpers";

/** 初回(成績0件)だけ出る「はじめに」カードの表示条件 */

test("成績0件では「はじめに」が出て、閉じると消える", async ({ page }) => {
  await page.goto("/");
  await waitDashboardReady(page);

  await expect(
    page.getByText("全部の肢に、理由をつけて決着をつける", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "わかった" }).click();
  await expect(
    page.getByText("全部の肢に、理由をつけて決着をつける", { exact: true }),
  ).toHaveCount(0);
});

test("成績がある場合は「はじめに」を出さない", async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            questionId: "q1",
            choiceIndex: 0,
            pts: 2,
            max: 2,
            answeredAt: new Date().toISOString(),
          },
        ]),
      );
    },
    { key: STORAGE_KEY },
  );
  await page.goto("/");
  await waitDashboardReady(page);

  await expect(
    page.getByText("全部の肢に、理由をつけて決着をつける", { exact: true }),
  ).toHaveCount(0);
});
