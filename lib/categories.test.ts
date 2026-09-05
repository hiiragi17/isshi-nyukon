import { describe, expect, it } from "vitest";
import {
  byTopicPriority,
  topicPriorityLabel,
  TOPIC_PRIORITY_ORDER,
  TOPIC_LOW_PRIORITY,
} from "@/lib/categories";

describe("byTopicPriority", () => {
  it("優先度高の論点(意思表示)が優先度中の論点(物権変動)より先に来る", () => {
    expect(byTopicPriority("q2", "q1")).toBeLessThan(0);
  });

  it("優先度中の論点(不法行為)が一覧に無い論点(架空のid)より先に来る", () => {
    expect(byTopicPriority("q59", "q-unclassified")).toBeLessThan(0);
  });

  it("一覧に無い論点(架空のid)が優先度低の論点(制限行為能力者)より先に来る", () => {
    expect(byTopicPriority("q-unclassified", "q39")).toBeLessThan(0);
  });

  it("安定ソートで一覧の登場順どおりに並ぶ(同順位の未分類論点も元の順序を保つ)", () => {
    const input = [
      "q-unclassified-b",
      "q-unclassified-a",
      "q39",
      "q19",
      "q59",
      "q1",
      "q2",
    ];
    const sorted = [...input].sort(byTopicPriority);
    expect(sorted).toEqual([
      "q2",
      "q19",
      "q1",
      "q59",
      "q-unclassified-b",
      "q-unclassified-a",
      "q39",
    ]);
  });

  it("TOPIC_PRIORITY_ORDER と TOPIC_LOW_PRIORITY は重複しない", () => {
    const overlap = TOPIC_PRIORITY_ORDER.filter((tid) =>
      TOPIC_LOW_PRIORITY.has(tid),
    );
    expect(overlap).toEqual([]);
  });
});

describe("topicPriorityLabel", () => {
  it("優先度高の論点(意思表示)には「優先度高」を返す", () => {
    expect(topicPriorityLabel("q2")).toBe("優先度高");
  });

  it("優先度中の論点(不法行為)には「優先度中」を返す", () => {
    expect(topicPriorityLabel("q59")).toBe("優先度中");
  });

  it("優先度低の論点(制限行為能力者)には「優先度低」を返す", () => {
    expect(topicPriorityLabel("q39")).toBe("優先度低");
  });

  it("一覧に無い論点(架空のid)には null を返す", () => {
    expect(topicPriorityLabel("q-unclassified")).toBeNull();
  });

  it("暗記ゲー寄りで費用対効果が良い論点(不動産登記法・区分所有法)は優先度高", () => {
    expect(topicPriorityLabel("q46")).toBe("優先度高");
    expect(topicPriorityLabel("q58")).toBe("優先度高");
  });

  it("時効・共有は優先度中", () => {
    expect(topicPriorityLabel("q66")).toBe("優先度中");
    expect(topicPriorityLabel("q44")).toBe("優先度中");
    expect(topicPriorityLabel("q45")).toBe("優先度中");
  });

  it("請負・委任は優先度低", () => {
    expect(topicPriorityLabel("q64")).toBe("優先度低");
  });
});
