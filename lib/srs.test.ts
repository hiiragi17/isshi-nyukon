/**
 * lib/srs.ts のユニットテスト。
 * 受け入れ条件(T5): 間隔計算とキュー順を検証する。
 */
import { describe, it, expect } from "vitest";
import type { Attempt } from "@/types";
import {
  SRS_BASE_INTERVAL_DAYS,
  reviewInterval,
  nextReviewDate,
  buildSummonQueue,
} from "@/lib/srs";

/** テスト用に Attempt を作るヘルパー */
function attempt(
  questionId: string,
  choiceIndex: number,
  pts: number,
  max: number,
  answeredAt: string,
): Attempt {
  return { questionId, choiceIndex, pts, max, answeredAt };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("reviewInterval — 満点で2倍・失点でリセット", () => {
  it("未挑戦(空)は基準間隔", () => {
    expect(reviewInterval([])).toBe(SRS_BASE_INTERVAL_DAYS);
  });

  it("満点1回で基準の2倍", () => {
    const as = [attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z")];
    expect(reviewInterval(as)).toBe(SRS_BASE_INTERVAL_DAYS * 2);
  });

  it("満点を重ねるたびに倍々になる", () => {
    const as = [
      attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      attempt("q1", 0, 2, 2, "2026-07-02T00:00:00.000Z"),
      attempt("q1", 0, 2, 2, "2026-07-03T00:00:00.000Z"),
    ];
    expect(reviewInterval(as)).toBe(SRS_BASE_INTERVAL_DAYS * 8);
  });

  it("失点したら基準にリセットされる", () => {
    const as = [
      attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      attempt("q1", 0, 2, 2, "2026-07-02T00:00:00.000Z"), // ここで間隔4
      attempt("q1", 0, 1, 3, "2026-07-03T00:00:00.000Z"), // 失点 → リセット
    ];
    expect(reviewInterval(as)).toBe(SRS_BASE_INTERVAL_DAYS);
  });

  it("リセット後にまた満点を取れば基準の2倍から再開する", () => {
    const as = [
      attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      attempt("q1", 0, 0, 3, "2026-07-02T00:00:00.000Z"), // リセット
      attempt("q1", 0, 3, 3, "2026-07-03T00:00:00.000Z"), // 満点 → 2倍
    ];
    expect(reviewInterval(as)).toBe(SRS_BASE_INTERVAL_DAYS * 2);
  });

  it("順不同で渡しても時系列に整列して計算する", () => {
    const ordered = [
      attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      attempt("q1", 0, 1, 3, "2026-07-02T00:00:00.000Z"), // 最新は失点
    ];
    const shuffled = [ordered[1], ordered[0]];
    expect(reviewInterval(shuffled)).toBe(reviewInterval(ordered));
    expect(reviewInterval(shuffled)).toBe(SRS_BASE_INTERVAL_DAYS);
  });
});

describe("nextReviewDate — 最終挑戦日 + 間隔", () => {
  it("未挑戦は null", () => {
    expect(nextReviewDate([])).toBeNull();
  });

  it("満点1回なら最終挑戦日から基準×2日後", () => {
    const last = "2026-07-01T00:00:00.000Z";
    const due = nextReviewDate([attempt("q1", 0, 2, 2, last)]);
    const expected = new Date(new Date(last).getTime() + 2 * SRS_BASE_INTERVAL_DAYS * DAY_MS);
    expect(due?.getTime()).toBe(expected.getTime());
  });
});

describe("buildSummonQueue — 優先度 weak > due > new > later", () => {
  const targets = [
    { questionId: "q1", choiceIndex: 0 }, // later にする
    { questionId: "q2", choiceIndex: 0 }, // weak
    { questionId: "q3", choiceIndex: 0 }, // due
    { questionId: "q4", choiceIndex: 0 }, // new(履歴なし)
  ];
  const now = new Date("2026-07-10T00:00:00.000Z");

  const attempts: Attempt[] = [
    // q1: 直近満点で、期限はまだ先(later)。3日前に満点=間隔2日 → 期限は前日=まだ…
    // 期限を先にするため直前に満点を取らせる
    attempt("q1", 0, 2, 2, "2026-07-09T00:00:00.000Z"), // 間隔2日 → 期限 07-11(未来)= later
    // q2: 直近失点(weak)
    attempt("q2", 0, 3, 3, "2026-07-01T00:00:00.000Z"),
    attempt("q2", 0, 1, 3, "2026-07-02T00:00:00.000Z"),
    // q3: 直近満点だが期限切れ(due)。1回満点=間隔2日、最終が07-01 → 期限07-03 < now
    attempt("q3", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
    // q4: 履歴なし → new
  ];

  it("分類の優先度順に並ぶ", () => {
    const queue = buildSummonQueue(targets, attempts, now);
    expect(queue.map((s) => s.questionId)).toEqual(["q2", "q3", "q4", "q1"]);
    expect(queue.map((s) => s.bucket)).toEqual(["weak", "due", "new", "later"]);
  });

  it("weak / due / new / later を正しく分類する", () => {
    const queue = buildSummonQueue(targets, attempts, now);
    const byId = new Map(queue.map((s) => [s.questionId, s]));
    expect(byId.get("q2")!.bucket).toBe("weak");
    expect(byId.get("q3")!.bucket).toBe("due");
    expect(byId.get("q4")!.bucket).toBe("new");
    expect(byId.get("q1")!.bucket).toBe("later");
  });

  it("未着手は attemptCount 0・dueAt null で new に入る", () => {
    const queue = buildSummonQueue(targets, attempts, now);
    const q4 = queue.find((s) => s.questionId === "q4")!;
    expect(q4.attemptCount).toBe(0);
    expect(q4.dueAt).toBeNull();
    expect(q4.latestPerfect).toBeNull();
  });

  it("同一分類(due)内は期限が古い順に並ぶ", () => {
    const dueTargets = [
      { questionId: "a", choiceIndex: 0 },
      { questionId: "b", choiceIndex: 0 },
    ];
    const dueAttempts: Attempt[] = [
      // a: 期限 07-03(より古い)
      attempt("a", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      // b: 期限 07-05(より新しい)
      attempt("b", 0, 2, 2, "2026-07-03T00:00:00.000Z"),
    ];
    const queue = buildSummonQueue(dueTargets, dueAttempts, now);
    expect(queue.map((s) => s.questionId)).toEqual(["a", "b"]);
    expect(queue.every((s) => s.bucket === "due")).toBe(true);
  });

  it("new が複数あるときは targets の順序を保つ", () => {
    const newTargets = [
      { questionId: "x", choiceIndex: 1 },
      { questionId: "x", choiceIndex: 0 },
      { questionId: "y", choiceIndex: 0 },
    ];
    const queue = buildSummonQueue(newTargets, [], now);
    expect(queue.map((s) => s.key)).toEqual(["x-1", "x-0", "y-0"]);
    expect(queue.every((s) => s.bucket === "new")).toBe(true);
  });

  it("期限ちょうど(due === now)は期限切れ(due)扱い", () => {
    // 07-08 に満点 → 間隔2日 → 期限 07-10T00:00 = now
    const t = [{ questionId: "z", choiceIndex: 0 }];
    const a = [attempt("z", 0, 2, 2, "2026-07-08T00:00:00.000Z")];
    const queue = buildSummonQueue(t, a, now);
    expect(queue[0].bucket).toBe("due");
  });
});
