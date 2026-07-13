/**
 * lib/scoring.ts のユニットテスト。
 * 配点の正はプロトタイプの maxOf(CLAUDE.md):
 * zenshi ○肢=2 / ×肢=3、calc=2、spot=errorCount。
 * 6テーマ(q1〜q6)満点46点は回帰テストとして固定する。
 */
import { describe, it, expect } from "vitest";
import type { Question } from "@/types";
import { maxOf, questionMax } from "@/lib/scoring";
import { itemCountOf } from "@/lib/items";
import { QUESTIONS } from "@/data/questions";

/** テスト用の最小 zenshi 問題(○×パターンを指定して作る) */
function zenshi(corrects: boolean[]): Question {
  return {
    id: "t1",
    category: "権利関係(民法)",
    topic: "テスト",
    law: "テスト",
    lesson: [],
    choices: corrects.map((correct) => ({
      segments: ["肢"],
      correct,
      reasons: [],
      explanation: "",
    })),
  };
}

const calcQ: Question = {
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

function spotQ(errorCount: number): Question {
  return {
    id: "t3",
    category: "宅建業法",
    topic: "テスト",
    law: "テスト",
    type: "spot",
    lesson: [],
    spot: { errorCount, zones: [] },
  };
}

describe("maxOf — 肢1件の満点", () => {
  it("zenshi の○肢は2点", () => {
    expect(maxOf(zenshi([true, false]), 0)).toBe(2);
  });

  it("zenshi の×肢は3点", () => {
    expect(maxOf(zenshi([true, false]), 1)).toBe(3);
  });

  it("calc は2点", () => {
    expect(maxOf(calcQ, 0)).toBe(2);
  });

  it("spot は errorCount 点", () => {
    expect(maxOf(spotQ(3), 0)).toBe(3);
    expect(maxOf(spotQ(5), 0)).toBe(5);
  });
});

describe("questionMax — 論点1件の満点", () => {
  it("zenshi は全肢の合計(○2 + ×3)", () => {
    // ○○×× → 2+2+3+3 = 10
    expect(questionMax(zenshi([true, true, false, false]))).toBe(10);
    // ○××× → 2+3+3+3 = 11
    expect(questionMax(zenshi([true, false, false, false]))).toBe(11);
  });

  it("calc は1肢で2点", () => {
    expect(questionMax(calcQ)).toBe(2);
  });

  it("spot は1肢で errorCount 点", () => {
    expect(questionMax(spotQ(4))).toBe(4);
  });
});

describe("実データへの回帰テスト", () => {
  it("6テーマ(q1〜q6)の満点合計は46点(プロトタイプと一致)", () => {
    const six = QUESTIONS.slice(0, 6);
    expect(six.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5", "q6"]);
    const total = six.reduce((s, q) => s + questionMax(q), 0);
    expect(total).toBe(46);
  });

  it("全問題の全肢の満点が正の数で計算できる(データ破損の検知)", () => {
    for (const q of QUESTIONS) {
      for (let ci = 0; ci < itemCountOf(q); ci++) {
        expect(maxOf(q, ci)).toBeGreaterThan(0);
      }
    }
  });
});
