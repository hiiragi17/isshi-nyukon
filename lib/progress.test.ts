/**
 * lib/progress.ts のユニットテスト。
 * 論点1件の習熟統計(topicProgress)と、分野・全体サマリ(summarizeProgress)の
 * 定義を固定する。得点の満点は lib/scoring(○肢=2点 / ×肢=3点)に従う。
 */
import { describe, it, expect } from "vitest";
import type { Question } from "@/types";
import {
  topicProgress,
  summarizeProgress,
  type ItemResult,
  type TopicProgress,
} from "@/lib/progress";

/** テスト用の最小 zenshi 問題。correct の並びで肢を作る(○=2点 / ×=3点) */
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

/** ci → 結果 の対応表から getResult を作る */
const from =
  (results: Record<number, ItemResult>) =>
  (ci: number): ItemResult | undefined =>
    results[ci];

describe("topicProgress — 論点1件の習熟統計", () => {
  // ○×○ = 満点 2+3+2 = 7点
  const q = zenshi([true, false, true]);

  it("未挑戦なら level=0・獲得0点・lastAt は null", () => {
    const st = topicProgress(q, from({}));
    expect(st).toEqual<TopicProgress>({
      n: 3,
      tried: 0,
      perfect: 0,
      weak: 0,
      untried: 3,
      pts: 0,
      max: 7,
      lastAt: null,
      level: 0,
    });
  });

  it("一部の肢だけ挑戦済みなら level=1(満点でも全肢に達していない)", () => {
    const st = topicProgress(q, from({ 0: { pts: 2, max: 2 } }));
    expect(st.tried).toBe(1);
    expect(st.perfect).toBe(1);
    expect(st.weak).toBe(0);
    expect(st.untried).toBe(2);
    expect(st.pts).toBe(2);
    expect(st.level).toBe(1);
  });

  it("失点した肢は weak に数え、level=1", () => {
    const st = topicProgress(
      q,
      from({
        0: { pts: 2, max: 2 },
        1: { pts: 1, max: 3 },
        2: { pts: 2, max: 2 },
      }),
    );
    expect(st.tried).toBe(3);
    expect(st.perfect).toBe(2);
    expect(st.weak).toBe(1);
    expect(st.pts).toBe(5);
    expect(st.level).toBe(1);
  });

  it("全肢が最新で満点なら level=2", () => {
    const st = topicProgress(
      q,
      from({
        0: { pts: 2, max: 2 },
        1: { pts: 3, max: 3 },
        2: { pts: 2, max: 2 },
      }),
    );
    expect(st.perfect).toBe(3);
    expect(st.pts).toBe(7);
    expect(st.max).toBe(7);
    expect(st.level).toBe(2);
  });

  it("lastAt は挑戦済み肢の answeredAt の最大", () => {
    const st = topicProgress(
      q,
      from({
        0: { pts: 2, max: 2, answeredAt: "2026-07-01T00:00:00.000Z" },
        1: { pts: 3, max: 3, answeredAt: "2026-07-10T00:00:00.000Z" },
        2: { pts: 2, max: 2, answeredAt: "2026-07-05T00:00:00.000Z" },
      }),
    );
    expect(st.lastAt).toBe("2026-07-10T00:00:00.000Z");
  });

  it("answeredAt の無い結果(play 画面の history)でも lastAt=null で集計できる", () => {
    const st = topicProgress(
      q,
      from({ 0: { pts: 2, max: 2 }, 1: { pts: 3, max: 3 } }),
    );
    expect(st.lastAt).toBeNull();
    expect(st.tried).toBe(2);
  });
});

describe("summarizeProgress — 分野・全体サマリ", () => {
  const q2 = zenshi([true, false]); // 満点 5点
  const q4 = zenshi([true, false, true, false]); // 満点 10点

  it("空の集合はすべて 0", () => {
    expect(summarizeProgress([])).toEqual({
      topics: 0,
      perfectTopics: 0,
      pts: 0,
      max: 0,
    });
  });

  it("完璧論点数・獲得点・満点を畳み込む(未挑戦の満点も分母に含む)", () => {
    const perfect = topicProgress(
      q2,
      from({ 0: { pts: 2, max: 2 }, 1: { pts: 3, max: 3 } }),
    );
    const learning = topicProgress(q4, from({ 0: { pts: 1, max: 2 } }));
    const untried = topicProgress(q2, from({}));
    expect(summarizeProgress([perfect, learning, untried])).toEqual({
      topics: 3,
      perfectTopics: 1,
      pts: 6,
      max: 20,
    });
  });
});
