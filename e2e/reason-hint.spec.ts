import { test, expect, type Page } from "@playwright/test";

/**
 * 理由選択で迷ったとき、30秒レッスンを開く導線が出る(#524)。採点は変えない。
 * 対象は先頭の問題(q1)の1肢。○肢・×肢のどちらでも理由選択まで進める。
 */
async function gotoReasonPhase(page: Page) {
  await page.goto("/play?items=q1-0");
  const judgeOk = page.getByRole("button", { name: "◯ 正しい", exact: true });
  const judgeNg = page.getByRole("button", { name: "✕ 誤り", exact: true });
  await expect(judgeOk).toBeVisible();

  // 正解の判定でないと理由選択に進めないので、○で進めて、判定ミスなら×でやり直す
  await judgeOk.click();
  const reasons = page.locator("button.opt-btn");
  const seg = page.locator("button.seg-btn").first();
  await expect(
    reasons
      .first()
      .or(seg)
      .or(page.getByText(/判定ミス/)),
  ).toBeVisible();
  if ((await reasons.count()) > 0) return;

  if (await page.getByText(/判定ミス/).count()) {
    await page.goto("/play?items=q1-0");
    await judgeNg.click();
  }
  await expect(seg).toBeVisible();
  await seg.click();
  await expect(reasons.first()).toBeVisible();
}

test("理由選択: 30秒レッスンが閉じていれば導線が出て、押すと開く(理由選択はそのまま続けられる)", async ({
  page,
}) => {
  await gotoReasonPhase(page);

  const hint = page.getByRole("button", {
    name: "迷ったら、30秒レッスンを開く",
  });
  const lesson = page.getByRole("button", { name: /30秒レッスン — / });
  await expect(lesson).toHaveAttribute("aria-expanded", "false");
  await expect(hint).toBeVisible();

  await hint.click();
  await expect(lesson).toHaveAttribute("aria-expanded", "true");
  // 理由選択の場面のまま(押しても選択肢は消えず、フェーズも進まない)
  await expect(page.locator("button.opt-btn").first()).toBeVisible();
  // 開いたあとは導線を出さない
  await expect(hint).toHaveCount(0);
  // レッスンが画面内に出る(上に残って見えないままにならない)
  await expect(lesson).toBeInViewport();
});

test("判定の場面では導線を出さない", async ({ page }) => {
  await page.goto("/play?items=q1-0");
  await expect(
    page.getByRole("button", { name: "◯ 正しい", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "迷ったら、30秒レッスンを開く" }),
  ).toHaveCount(0);
});
