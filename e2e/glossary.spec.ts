import { test, expect } from "@playwright/test";
import { waitDashboardReady } from "./helpers";

/** 世界観の用語は、初出の場所に短い言い換えを添える(#523)。文言そのものは変えない */
test("トップ: 召喚状・検地帳・集印・開廷に一言の説明がある", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  await expect(page.getByText("(今日の復習)")).toBeVisible();
  await expect(page.getByText("(進み具合の一覧)")).toBeVisible();
  await expect(page.getByText("集印 = 完璧にした論点の数")).toBeVisible();
  await expect(page.getByText(/「開廷する」で出題が始まります/)).toBeVisible();
  // 世界観の文言はそのまま
  await expect(page.getByText("検地帳 — 分野×論点")).toBeVisible();
  await expect(page.getByRole("button", { name: /^開廷する/ })).toBeVisible();
});

/** 「はじめに」の閉じるボタンは、開廷する(主ボタン)と競わない控えめな見た目で、はじめの画面に開廷するが入る */
test("成績0件: 開廷するがはじめの画面(390x844)に入る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitDashboardReady(page);

  await expect(
    page.getByRole("button", { name: /^開廷する/ }),
  ).toBeInViewport({ ratio: 1 });
});
