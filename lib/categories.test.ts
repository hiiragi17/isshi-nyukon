import { describe, expect, it } from "vitest";
import {
  byTopicPriority,
  TOPIC_PRIORITY_ORDER,
  TOPIC_LOW_PRIORITY,
} from "@/lib/categories";

describe("byTopicPriority", () => {
  it("優先度高の論点(意思表示)が優先度中の論点(物権変動)より先に来る", () => {
    expect(byTopicPriority("q2", "q1")).toBeLessThan(0);
  });

  it("優先度中の論点(不法行為)が一覧に無い論点(共有)より先に来る", () => {
    expect(byTopicPriority("q59", "q45")).toBeLessThan(0);
  });

  it("一覧に無い論点(共有)が優先度低の論点(制限行為能力者)より先に来る", () => {
    expect(byTopicPriority("q45", "q39")).toBeLessThan(0);
  });

  it("安定ソートで一覧の登場順どおりに並ぶ", () => {
    const input = ["q45", "q39", "q19", "q59", "q1", "q2"];
    const sorted = [...input].sort(byTopicPriority);
    expect(sorted).toEqual(["q2", "q19", "q1", "q59", "q45", "q39"]);
  });

  it("TOPIC_PRIORITY_ORDER と TOPIC_LOW_PRIORITY は重複しない", () => {
    const overlap = TOPIC_PRIORITY_ORDER.filter((tid) =>
      TOPIC_LOW_PRIORITY.has(tid),
    );
    expect(overlap).toEqual([]);
  });
});
