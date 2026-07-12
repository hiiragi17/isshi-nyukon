/**
 * lib/growth.ts のユニットテスト。
 * 全件履歴から「日ごとの集印(完璧論点)累積・得点率・審理数」を
 * 正しく導けることを検証する。
 */
import { describe, it, expect } from "vitest";
import type { Attempt, Question } from "@/types";
import { buildGrowth } from "@/lib/growth";

/** テスト用 Attempt ヘルパー */
function attempt(
  questionId: string,
  choiceIndex: number,
  pts: number,
  max: number,
  answeredAt: string,
): Attempt {
  return { questionId, choiceIndex, pts, max, answeredAt };
}

/** 肢2つの zenshi 問題(○肢=2点 / ×肢=3点)を最小構成で作る */
function q2(id: string): Question {
  return {
    id,
    category: "宅建業法",
    topic: id,
    law: "テスト",
    lesson: [],
    choices: [
      { segments: ["a"], correct: true, reasons: [], explanation: "" },
      { segments: ["b"], correct: false, wrongIndex: 0, reasons: [], explanation: "" },
    ],
  };
}

/** calc 問題(1肢・満点2) */
function qCalc(id: string): Question {
  return {
    id,
    category: "法令上の制限",
    topic: id,
    law: "テスト",
    type: "calc",
    lesson: [],
    calc: {
      prompt: "",
      given: [],
      build: [],
      canonical: [],
      answer: 0,
      unit: "",
    },
  };
}

describe("buildGrowth — 空履歴", () => {
  it("履歴が空なら points も空で、集計は 0", () => {
    const g = buildGrowth([], [q2("q1")]);
    expect(g.points).toEqual([]);
    expect(g.totalAttempts).toBe(0);
    expect(g.activeDays).toBe(0);
    expect(g.currentSeal).toBe(0);
    expect(g.maxSeal).toBe(0);
    expect(g.avgScoreRate).toBe(0);
    expect(g.totalTopics).toBe(1);
  });
});

describe("buildGrowth — 日ごとの集計", () => {
  it("同じ暦日の Attempt は1点にまとまり、審理数と得点率を持つ", () => {
    const g = buildGrowth(
      [
        attempt("q1", 0, 2, 2, "2026-07-01T01:00:00.000Z"),
        attempt("q1", 1, 0, 3, "2026-07-01T02:00:00.000Z"),
      ],
      [q2("q1")],
    );
    expect(g.activeDays).toBe(1);
    expect(g.points[0].attempts).toBe(2);
    // 2/(2+3) = 0.4
    expect(g.points[0].scoreRate).toBeCloseTo(0.4);
    // 片方の肢を落としているので未完璧
    expect(g.points[0].sealCount).toBe(0);
  });

  it("別々の暦日は別の点になり、時系列順に並ぶ", () => {
    const g = buildGrowth(
      [
        attempt("q1", 1, 3, 3, "2026-07-02T00:00:00.000Z"),
        attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      ],
      [q2("q1")],
    );
    expect(g.points.map((p) => p.day)).toEqual(["2026-7-1", "2026-7-2"]);
  });
});

describe("buildGrowth — 集印(完璧論点)の再生", () => {
  it("全肢を最新で正解した日に集印が立つ", () => {
    const g = buildGrowth(
      [
        attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
        attempt("q1", 1, 3, 3, "2026-07-02T00:00:00.000Z"),
      ],
      [q2("q1")],
    );
    // 1日目は片肢のみ → 未完璧、2日目に全肢完璧
    expect(g.points[0].sealCount).toBe(0);
    expect(g.points[1].sealCount).toBe(1);
    expect(g.currentSeal).toBe(1);
    expect(g.maxSeal).toBe(1);
  });

  it("一度完璧にした論点を後日落とすと集印は減る(履歴に忠実)", () => {
    const g = buildGrowth(
      [
        attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
        attempt("q1", 1, 3, 3, "2026-07-01T00:10:00.000Z"),
        // 後日、○肢を失点で上書き
        attempt("q1", 0, 0, 2, "2026-07-03T00:00:00.000Z"),
      ],
      [q2("q1")],
    );
    expect(g.points[0].sealCount).toBe(1);
    expect(g.points[1].sealCount).toBe(0);
    expect(g.currentSeal).toBe(0);
    // 期間中の最大は 1
    expect(g.maxSeal).toBe(1);
  });

  it("calc は1肢で満点なら完璧になる", () => {
    const g = buildGrowth(
      [attempt("qc", 0, 2, 2, "2026-07-01T00:00:00.000Z")],
      [qCalc("qc")],
    );
    expect(g.currentSeal).toBe(1);
  });
});

describe("buildGrowth — 全期間の平均得点率", () => {
  it("全 Attempt の pts 合計 / max 合計", () => {
    const g = buildGrowth(
      [
        attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
        attempt("q1", 1, 0, 3, "2026-07-02T00:00:00.000Z"),
      ],
      [q2("q1")],
    );
    // (2+0)/(2+3) = 0.4
    expect(g.avgScoreRate).toBeCloseTo(0.4);
    expect(g.totalAttempts).toBe(2);
  });
});
