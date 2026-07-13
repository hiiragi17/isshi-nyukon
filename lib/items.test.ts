/**
 * lib/items.ts のユニットテスト。
 * 「1論点が持つ肢数」の定義(calc / spot は1肢、zenshi は choices の数)を固定する。
 * ※ spot の満点が errorCount になるのは lib/scoring.ts 側の責務(テスト済み)。
 */
import { describe, it, expect } from "vitest";
import type { Question } from "@/types";
import { itemCountOf } from "@/lib/items";
import { QUESTIONS } from "@/data/questions";

/** テスト用の最小 zenshi 問題(肢数だけ指定して作る) */
function zenshi(choiceCount: number): Question {
  return {
    id: "t1",
    category: "権利関係(民法)",
    topic: "テスト",
    law: "テスト",
    lesson: [],
    choices: Array.from({ length: choiceCount }, () => ({
      segments: ["肢"],
      correct: true,
      reasons: [],
      explanation: "",
    })),
  };
}

describe("itemCountOf — 論点1件の肢数", () => {
  it("zenshi(type 未指定)は choices の数", () => {
    expect(itemCountOf(zenshi(4))).toBe(4);
    expect(itemCountOf(zenshi(1))).toBe(1);
  });

  it("calc は1肢", () => {
    const q: Question = {
      id: "t2",
      category: "宅建業法",
      topic: "テスト",
      law: "テスト",
      type: "calc",
      lesson: [],
      calc: {
        prompt: "",
        given: [],
        build: [],
        canonical: [],
        answer: 0,
        unit: "万円",
      },
    };
    expect(itemCountOf(q)).toBe(1);
  });

  it("spot は errorCount によらず1肢", () => {
    const spot = (errorCount: number): Question => ({
      id: "t3",
      category: "宅建業法",
      topic: "テスト",
      law: "テスト",
      type: "spot",
      lesson: [],
      spot: { errorCount, zones: [] },
    });
    expect(itemCountOf(spot(3))).toBe(1);
    expect(itemCountOf(spot(7))).toBe(1);
  });

  it("実データの全問題で1以上の肢数が計算できる", () => {
    for (const q of QUESTIONS) {
      const n = itemCountOf(q);
      expect(n).toBeGreaterThanOrEqual(1);
      if (!q.type) expect(n).toBe(q.choices!.length);
    }
  });
});
