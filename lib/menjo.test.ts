import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/data/questions";
import {
  isMenjoQuestion,
  isMenjoTopic,
  MENJO_TOPIC_IDS,
  menjoQuestionIndices,
} from "@/lib/menjo";

/** topicId → 論点名(QUESTIONS 上で、その topicId を代表する最初の問題の topic) */
const topicNameOf = (topicId: string): string | undefined =>
  QUESTIONS.find((q) => (q.topicId ?? q.id) === topicId)?.topic;

describe("5問免除科目の定義", () => {
  it("5科目で、topicId に重複がない", () => {
    expect(MENJO_TOPIC_IDS).toHaveLength(5);
    expect(new Set(MENJO_TOPIC_IDS).size).toBe(5);
  });

  it("住宅金融支援機構・景品表示法・統計・土地・建物の5論点を指している", () => {
    expect(MENJO_TOPIC_IDS.map(topicNameOf)).toEqual([
      "住宅金融支援機構",
      "景品表示法",
      "統計",
      "土地",
      "建物",
    ]);
  });

  it("5科目とも分野は「税・その他」のまま(分野は変えない)", () => {
    for (const id of MENJO_TOPIC_IDS) {
      const cats = QUESTIONS.filter((q) => (q.topicId ?? q.id) === id).map(
        (q) => q.category,
      );
      expect(cats.length).toBeGreaterThan(0);
      expect(new Set(cats)).toEqual(new Set(["税・その他"]));
    }
  });

  it("isMenjoTopic: 5科目は true、それ以外(登録免許税・宅建業法の論点)は false", () => {
    for (const id of MENJO_TOPIC_IDS) expect(isMenjoTopic(id)).toBe(true);
    expect(isMenjoTopic("q51")).toBe(false); // 登録免許税
    expect(isMenjoTopic("q12")).toBe(false); // 重要事項の説明
  });

  it("2周目バリアント(q113=q54、q124=q123)にも同じ印が付く", () => {
    const byId = (id: string) => QUESTIONS.find((q) => q.id === id)!;
    expect(isMenjoQuestion(byId("q113"))).toBe(true);
    expect(isMenjoQuestion(byId("q124"))).toBe(true);
    expect(isMenjoQuestion(byId("q51"))).toBe(false);
  });

  it("menjoQuestionIndices: 5科目に属する問題だけを、元の並び順のまま返す", () => {
    const idx = menjoQuestionIndices(QUESTIONS);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(idx.every((i) => isMenjoQuestion(QUESTIONS[i]))).toBe(true);
    // 5科目のどの論点も、少なくとも1問は含まれる
    const topics = new Set(idx.map((i) => QUESTIONS[i].topicId ?? QUESTIONS[i].id));
    expect(topics).toEqual(new Set(MENJO_TOPIC_IDS));
    // 取りこぼし(印の付く問題が除外されている)がない
    expect(idx).toHaveLength(QUESTIONS.filter(isMenjoQuestion).length);
  });
});
