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

  it("宅建業法の最優先5本柱(媒介契約・重説35条・37条書面・8種制限・報酬)は優先度高", () => {
    expect(topicPriorityLabel("q14")).toBe("優先度高"); // 媒介契約
    expect(topicPriorityLabel("q12")).toBe("優先度高"); // 重要事項の説明(35条)
    expect(topicPriorityLabel("q13")).toBe("優先度高"); // 37条書面
    expect(topicPriorityLabel("q4")).toBe("優先度高"); // クーリングオフ
    expect(topicPriorityLabel("q17")).toBe("優先度高"); // 8種制限(手付・保全措置)
    expect(topicPriorityLabel("q5")).toBe("優先度高"); // 報酬額の制限
  });

  it("宅建業法の免許・保証協会・広告規制は優先度中、監督処分・罰則は優先度低", () => {
    expect(topicPriorityLabel("q15")).toBe("優先度中"); // 免許(基準・欠格事由)
    expect(topicPriorityLabel("q32")).toBe("優先度中"); // 保証協会
    expect(topicPriorityLabel("q6")).toBe("優先度中"); // 広告規制
    expect(topicPriorityLabel("q34")).toBe("優先度低"); // 監督処分・罰則
  });

  it("事務所・案内所の規制・住宅瑕疵担保履行法は優先度高(範囲が狭く得点効率が良い枠)", () => {
    expect(topicPriorityLabel("q33")).toBe("優先度高");
    expect(topicPriorityLabel("q35")).toBe("優先度高");
  });

  it("法令上の制限は開発許可・農地法・建蔽率容積率・建築確認が優先度高、都市計画法・土地区画整理法・盛土規制法が優先度低", () => {
    expect(topicPriorityLabel("q8")).toBe("優先度高"); // 開発許可
    expect(topicPriorityLabel("q24")).toBe("優先度高"); // 農地法
    expect(topicPriorityLabel("q9")).toBe("優先度高"); // 建蔽率・容積率(zenshi)
    expect(topicPriorityLabel("q10")).toBe("優先度高"); // 容積率(calc)
    expect(topicPriorityLabel("q47")).toBe("優先度高"); // 建築確認(直近改正のひっかけリスク)
    expect(topicPriorityLabel("q7")).toBe("優先度中"); // 建築基準法(用途制限)
    expect(topicPriorityLabel("q48")).toBe("優先度低"); // 都市計画法
    expect(topicPriorityLabel("q50")).toBe("優先度低"); // 土地区画整理法
    expect(topicPriorityLabel("q26")).toBe("優先度低"); // 盛土規制法
  });

  it("税・その他は不動産取得税等・印紙税等が優先度高、土地・建物が優先度低", () => {
    expect(topicPriorityLabel("q27")).toBe("優先度高"); // 不動産取得税
    expect(topicPriorityLabel("q28")).toBe("優先度高"); // 固定資産税
    expect(topicPriorityLabel("q29")).toBe("優先度高"); // 印紙税
    expect(topicPriorityLabel("q51")).toBe("優先度高"); // 登録免許税
    expect(topicPriorityLabel("q57")).toBe("優先度中"); // 景品表示法
    expect(topicPriorityLabel("q55")).toBe("優先度低"); // 土地
    expect(topicPriorityLabel("q56")).toBe("優先度低"); // 建物
  });
});
