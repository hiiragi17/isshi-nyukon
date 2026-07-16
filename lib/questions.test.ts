import { describe, it, expect } from "vitest";
import { normalizeQuestion } from "./questions";
import type { Question } from "@/types";

const base: Question = {
  id: "qtest",
  category: "宅建業法",
  topic: "テスト",
  law: "テスト法1条",
  lesson: ["行1"],
  choices: [],
};

describe("normalizeQuestion", () => {
  it("verified 未指定は false に正規化する(fail-closed)", () => {
    expect(normalizeQuestion(base).verified).toBe(false);
  });

  it("verified: true はそのまま保持する", () => {
    expect(normalizeQuestion({ ...base, verified: true }).verified).toBe(true);
  });

  it("verified: false はそのまま保持する", () => {
    expect(normalizeQuestion({ ...base, verified: false }).verified).toBe(false);
  });

  it("元オブジェクトを破壊しない(新オブジェクトを返す)", () => {
    const input: Question = { ...base };
    const out = normalizeQuestion(input);
    expect(out).not.toBe(input);
    expect(input.verified).toBeUndefined();
  });
});
