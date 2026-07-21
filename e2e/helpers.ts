import { expect, type Page } from "@playwright/test";

/** localStorage 上の成績保存キー(lib/storage.ts の STORAGE_KEY と一致させる) */
export const STORAGE_KEY = "isshi-nyukon:attempts:v1";

/**
 * ダッシュボードの読み込み完了を待つ。
 * 成績ロード前は「範囲を選んで始める」ボタンが出ないため、これを目印にする。
 */
export async function waitDashboardReady(page: Page): Promise<void> {
  await expect(
    page.getByRole("button", { name: /範囲を選んで始める/ }),
  ).toBeVisible();
}

/**
 * zenshi の1セッションを最後まで解き切って判決画面まで進める。
 * 判定は常に「◯ 正しい」を選ぶ:
 *  - 正しい肢 → 理由選択が出るので先頭を選ぶ
 *  - 誤り肢   → 判定ミスで解説へ直行(誤り箇所タップは発生しない)
 * どちらの経路でも肢は完了し、Attempt が保存される。得点の正否は問わない。
 */
export async function answerZenshiSessionToVerdict(page: Page): Promise<void> {
  // 進捗表示「/ 全N肢」から総肢数を読む
  const totalText = await page.getByText(/全\d+肢/).first().innerText();
  const total = Number(totalText.match(/全(\d+)肢/)?.[1]);
  expect(total).toBeGreaterThan(0);

  const judge = page.getByRole("button", { name: "◯ 正しい", exact: true });

  for (let i = 0; i < total; i++) {
    await judge.click();
    // 判定ボタンが消える = フェーズが判定から次へ進んだ(再描画の確定待ち)
    await expect(judge).toHaveCount(0);

    // 最後の肢だけ「判決を聞く」。それ以外は「次の肢へ / 次の問題へ」。
    const nextName = i < total - 1 ? /次の肢へ|次の問題へ/ : /判決を聞く/;
    const nextBtn = page.getByRole("button", { name: nextName });

    // 正しい肢なら理由ボタン(opt-btn)が出る。誤り肢は解説へ直行し出ない。
    // count() は要素の出現を待たないため、理由ボタンか次へボタンの
    // どちらかが見えるまで待ってからカウントを評価し、レースを避ける。
    const reasons = page.locator("button.opt-btn");
    await expect(reasons.first().or(nextBtn)).toBeVisible();
    if ((await reasons.count()) > 0) {
      await reasons.first().click();
    }

    await nextBtn.click();
  }
}
