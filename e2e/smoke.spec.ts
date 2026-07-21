import { test, expect } from "@playwright/test";
import {
  STORAGE_KEY,
  waitDashboardReady,
  answerZenshiSessionToVerdict,
} from "./helpers";

/**
 * 画面横断のスモーク:
 *   ダッシュボード → 論点を選んで開廷 → zenshi 全肢解答 → 判決(スタンプ)
 *   → ダッシュボードに成績反映 → リロードしても残る(localStorage 永続化)
 *
 * 対象論点は先頭の zenshi 問題「二重譲渡」(id=q1)。
 */
test("スモーク: 出題→解答→判決→ダッシュボード反映と永続化", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  // 初期状態: 二重譲渡は未着手
  await expect(
    page.locator('button[aria-label="二重譲渡(未着手)"]'),
  ).toHaveCount(1);

  // 論点を選んで開廷(範囲選択画面へ)
  await page.getByRole("button", { name: /範囲を選んで始める/ }).click();
  await expect(page).toHaveURL(/\/play/);

  // 全解除 → 二重譲渡だけ選ぶ
  await page.getByRole("button", { name: "全解除", exact: true }).click();
  await page.getByRole("button", { name: /二重譲渡/ }).click();
  await page.getByRole("button", { name: /開廷する/ }).click();

  // zenshi を全肢解答して判決へ
  await expect(page.getByText(/第1肢/)).toBeVisible();
  await answerZenshiSessionToVerdict(page);

  // 判決(スタンプ)画面
  await expect(page.getByText(/点満点中/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "検地帳へ戻る" }),
  ).toBeVisible();

  // localStorage に Attempt が保存されている
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(stored).toBeTruthy();
  const attempts = JSON.parse(stored!) as Array<{ questionId: string }>;
  expect(Array.isArray(attempts)).toBe(true);
  expect(attempts.length).toBeGreaterThan(0);
  expect(attempts.every((a) => a.questionId === "q1")).toBe(true);

  // 検地帳へ戻ると成績が反映され、未着手ではなくなる
  await page.getByRole("button", { name: "検地帳へ戻る" }).click();
  await waitDashboardReady(page);
  await expect(
    page.locator('button[aria-label="二重譲渡(未着手)"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('button[aria-label^="二重譲渡("]'),
  ).toHaveCount(1);

  // リロードしても成績が残る(localStorage 永続化)
  await page.reload();
  await waitDashboardReady(page);
  await expect(
    page.locator('button[aria-label="二重譲渡(未着手)"]'),
  ).toHaveCount(0);
});
