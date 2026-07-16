import { describe, it, expect } from "vitest";
import { normalizeQuestion, toStudyMode, isActiveInMode } from "./questions";
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

describe("toStudyMode", () => {
  it("'honban' は honban", () => {
    expect(toStudyMode("honban")).toBe("honban");
  });
  it("それ以外(null/未知/renshu)は renshu に倒す", () => {
    expect(toStudyMode(null)).toBe("renshu");
    expect(toStudyMode(undefined)).toBe("renshu");
    expect(toStudyMode("renshu")).toBe("renshu");
    expect(toStudyMode("xyz")).toBe("renshu");
  });
});

describe("isActiveInMode", () => {
  const verified: Question = { ...base, verified: true };
  const unverified: Question = { ...base, verified: false };
  it("練習モードは検証状態を問わず対象", () => {
    expect(isActiveInMode(verified, "renshu")).toBe(true);
    expect(isActiveInMode(unverified, "renshu")).toBe(true);
  });
  it("本番モードは検証済みのみ対象", () => {
    expect(isActiveInMode(verified, "honban")).toBe(true);
    expect(isActiveInMode(unverified, "honban")).toBe(false);
  });
});
