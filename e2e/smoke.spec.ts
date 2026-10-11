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

  // 全解除 → 分野を開いて二重譲渡だけ選ぶ(分野は既定でたたまれている)
  await page.getByRole("button", { name: "全解除", exact: true }).click();
  // 分野の開閉ボタン(aria-expanded 付き)。同じ分野名で始まる少量モードの
  // 「権利関係(民法)から5肢」などと区別するため expanded で絞る
  await page
    .getByRole("button", { name: /^権利関係\(民法\)/, expanded: false })
    .click();
  await page.getByRole("button", { name: /二重譲渡/ }).click();
  await page.getByRole("button", { name: /開廷する/ }).click();

  // zenshi を全肢解答して判決へ
  await expect(page.getByText(/第1肢/)).toBeVisible();

  // 出題中は通算点だけを出し、セッション満点(分母)は出さない。
  // ○肢=2点 / ×肢=3点 なので、満点を見せると残り肢の正誤が逆算できてしまう
  await expect(page.getByText(/^通算 \d+点$/)).toBeVisible();
  await expect(page.getByText(/^通算 \d+\/\d+点$/)).toHaveCount(0);

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

/**
 * 範囲選択画面の「開廷する」は、論点一覧(64論点)を開いてスクロールしても
 * 画面内に残る(sticky)。範囲を決めてから審理に入るまでが遠かった頃の回帰防止。
 *
 * 「見えている」だけの判定では、一覧が伸びてボタンの自然位置がたまたま画面内に
 * 入っただけでも通ってしまう。そのため画面下端からボタン下辺までの距離を測り、
 * スクロール位置が変わっても一定(=貼り付いている)ことを確かめる。
 */
test("範囲選択: 論点一覧を開いてスクロールしても開廷ボタンが画面下端に貼り付く", async ({
  page,
}) => {
  await page.goto("/play");

  const start = page.getByRole("button", { name: /開廷する/ });
  /** 画面下端 − ボタン下辺(px)。貼り付いていれば sticky バーの下余白ぶんで一定 */
  const gapFromBottom = () =>
    start.evaluate(
      (el) => window.innerHeight - el.getBoundingClientRect().bottom,
    );

  // 画面を開いた時点(最上部・一覧はたたんだ状態)から画面下端に見えている。
  // このとき自然位置はページ末尾側にあるため、sticky でなければ画面内に入らない
  await expect(start).toBeInViewport();
  const atTop = await gapFromBottom();
  expect(atTop).toBeGreaterThanOrEqual(0);
  expect(atTop).toBeLessThanOrEqual(20);

  // 分野を開くと選択カードが縦に伸びるが、どこまでスクロールしても位置は変わらない。
  // 検証位置は一覧の途中(ボタンの自然位置がまだ画面より下)に採り、
  // 「一覧が伸びて自然位置が画面に入っただけ」では通らないようにする
  // 分野の開閉ボタン(aria-expanded 付き)。「宅建業法から5肢」などと区別する
  await page
    .getByRole("button", { name: /^宅建業法/, expanded: false })
    .click();
  for (const y of [300, 900]) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await expect(start).toBeInViewport();
    expect(Math.abs((await gapFromBottom()) - atTop)).toBeLessThanOrEqual(1);
  }
});

/**
 * 検地帳のマスをタップしたら、その分野の直下に詳細(論点名・審理ボタン)が出る。
 * 詳細をマトリクスの一番下に置いていた頃は、先頭分野のマスをタップすると
 * 画面外(約480px 下)に出てしまい、タップの反応が見えなかった。
 */
test("検地帳: 先頭分野のマスを選ぶと詳細が画面内に出る", async ({ page }) => {
  await page.goto("/");
  await waitDashboardReady(page);

  // ユーザーがタップするときと同じく、マスを画面中央に置いた状態から始める
  const firstCell = page.locator('button[aria-label*="("]').first();
  await firstCell.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await firstCell.click();

  const detail = page.locator("div.fade-up");
  await expect(detail).toBeVisible();
  // 論点名と審理ボタンがスクロールなしで見える
  await expect(detail.getByRole("button", { name: /審理/ })).toBeInViewport();

  // 詳細はタップしたマスの直下(同じ分野のグリッド直後)に出る
  const cellBox = (await firstCell.boundingBox())!;
  const detailBox = (await detail.boundingBox())!;
  expect(detailBox.y).toBeGreaterThan(cellBox.y);
  expect(detailBox.y - cellBox.y).toBeLessThan(300);
});

/**
 * 召喚状の主ボタンは、キュー全体ではなく「今日の10肢」だけを始める(#471)。
 * 1セッション5〜10分の想定に対し、記録ゼロでキュー全体(数百肢)を始めないため。
 * キュー全体は補助ボタン「全N肢をまとめて審理」から始められる。
 */
test("召喚状: 開廷するは今日の10肢だけを出題し、全件は補助ボタンに残る", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  await expect(
    page.getByRole("button", { name: /全\d+肢をまとめて審理/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "開廷する — 今日の10肢" }).click();
  await expect(page).toHaveURL(/\/play\?items=/);
  await expect(page.getByText("/ 全10肢")).toBeVisible();
});

/**
 * 出題の途中で中断して検地帳へ戻れる(#470)。
 * 解答済みの肢は1肢ごとに保存済みなので、中断しても記録は残る。
 * 確認ダイアログを閉じた(キャンセルした)ときは出題を続けられる。
 */
test("出題中: 確認のうえ中断して検地帳へ戻れ、解答済みの肢は保存されている", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);
  await page.getByRole("button", { name: "開廷する — 今日の10肢" }).click();
  await expect(page.getByText("/ 全10肢")).toBeVisible();

  // 1肢だけ解く(◯ 正しい → 理由が出たら先頭 → 解説まで進める)
  await page.getByRole("button", { name: "◯ 正しい", exact: true }).click();
  const reasons = page.locator("button.opt-btn");
  const nextBtn = page.getByRole("button", { name: /次の肢へ|次の問題へ/ });
  await expect(reasons.first().or(nextBtn)).toBeVisible();
  if ((await reasons.count()) > 0) await reasons.first().click();
  await expect(nextBtn).toBeVisible();

  const quit = page.getByRole("button", { name: /中断して検地帳へ/ });

  // キャンセルすると出題画面に留まる
  page.once("dialog", async (d) => {
    expect(d.message()).toContain("1肢の解答は保存済み");
    await d.dismiss();
  });
  await quit.click();
  await expect(nextBtn).toBeVisible();

  // OK で検地帳へ戻り、解答した1肢が保存されている
  page.once("dialog", (d) => d.accept());
  await quit.click();
  await waitDashboardReady(page);
  const saved = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
        questionId: string;
      }>,
    STORAGE_KEY,
  );
  expect(saved).toHaveLength(1);
  // 記録ゼロの召喚状は先頭の論点(二重譲渡 = q1)から出題される
  expect(saved[0].questionId).toBe("q1");

  // 戻った検地帳にも反映されている(未着手 → 学習中)
  await expect(
    page.locator('button[aria-label="二重譲渡(学習中)"]'),
  ).toHaveCount(1);
});

/**
 * ページを開いた直後(スクロールしていない状態)にマスをタップしても、
 * 詳細の審理ボタンが画面内に入る(#472)。宅建業法は27マス・5段あり、
 * その直下に出る詳細は 390×844 では画面外になっていたため、
 * 詳細が出たら自動でその位置までスクロールする。
 */
test("検地帳: スクロールせずにマスを押しても、詳細の審理ボタンが画面内に入る", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  // 宅建業法の先頭マス(スクロールせず、そのままタップ)
  await page.locator('button[aria-label*="("]').first().click();

  const detail = page.locator("div.fade-up");
  await expect(detail.getByRole("button", { name: /審理/ })).toBeInViewport();
});

/** キーボードでマスを選んだときも、詳細の審理ボタンが画面内に入る(#472) */
test("検地帳: キーボードでマスを選んでも、詳細の審理ボタンが画面内に入る", async ({
  page,
}) => {
  await page.goto("/");
  await waitDashboardReady(page);

  const firstCell = page.locator('button[aria-label*="("]').first();
  await firstCell.focus();
  await page.keyboard.press("Enter");

  const detail = page.locator("div.fade-up");
  await expect(detail.getByRole("button", { name: /審理/ })).toBeInViewport();
  await expect(firstCell).toBeFocused();
});

/**
 * キーボードだけで、判定 → (理由) → 「次へ」まで進める(#474)。
 * 押したボタンが消えるたびに次の操作対象へフォーカスが移るので、
 * 最初の判定ボタンにフォーカスした後は Enter を押すだけで判決まで届く。
 */
test("出題中: キーボードの Enter だけで判定から判決まで進める", async ({ page }) => {
  await page.goto("/play?items=q1-0,q1-1");
  const judge = page.getByRole("button", { name: "◯ 正しい", exact: true });
  await expect(judge).toBeVisible();
  await judge.focus();

  // 1肢あたり「判定 → 理由(○肢のみ)→ 次へ」。2肢で最大6回の Enter で判決に届く
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Enter");
    if (await page.getByText("判決", { exact: true }).count()) break;
    // 2肢目の開始時はエンジンが作り直されるため、判定ボタンへ合わせ直す
    if (await judge.count()) {
      if (!(await judge.evaluate((el) => el === document.activeElement))) {
        await judge.focus();
      }
    } else {
      // 判定以外のフェーズでは、フォーカスがボタン上にある(body に落ちていない)
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      expect(tag).toBe("BUTTON");
    }
  }
  await expect(page.getByText("判決", { exact: true })).toBeVisible();
});
