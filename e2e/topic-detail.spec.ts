import { test, expect } from "@playwright/test";
import { STORAGE_KEY, waitDashboardReady } from "./helpers";

/**
 * 検地帳の論点詳細: 未着手で読み物がある論点は「先に読む」が主導線になる(#521)。
 * 対象は読み物のある二重譲渡(topicId=q1)。
 */

test("未着手の論点では「先に読む」が先頭、「初審理する」が副になる", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  await page.locator('button[aria-label="二重譲渡(未着手)"]').click();

  const read = page.getByRole("button", { name: "先に読む(参考書モード)" });
  const solve = page.getByRole("button", { name: /^初審理する/ });
  await expect(read).toBeVisible();
  await expect(solve).toBeVisible();
  // 先に読むが解くより上にある
  const readY = (await read.boundingBox())!.y;
  const solveY = (await solve.boundingBox())!.y;
  expect(readY).toBeLessThan(solveY);

  await read.click();
  await expect(page).toHaveURL(/\/learn\/q1/);
});

test("着手済みの論点では、解くが主・読むが副のまま", async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify([
          {
            questionId: "q1",
            choiceIndex: 0,
            pts: 0,
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

  await page
    .getByRole("button", { name: /^二重譲渡/ })
    .first()
    .click();

  await expect(
    page.getByRole("button", { name: "この分野を読む(参考書モード)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "先に読む(参考書モード)" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^初審理する/ })).toHaveCount(
    0,
  );
});
