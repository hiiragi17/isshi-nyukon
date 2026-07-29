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
    expect(input.source).toBeUndefined();
    expect(input.lawVersion).toBeUndefined();
  });

  describe("source(照合に使ったソースの強さ)", () => {
    it("未指定は unverified に正規化する(fail-closed)", () => {
      expect(normalizeQuestion(base).source).toEqual({ level: "unverified" });
    });

    it("指定された level はそのまま保持する", () => {
      const out = normalizeQuestion({ ...base, source: { level: "primary" } });
      expect(out.source?.level).toBe("primary");
    });

    it("fileId・note を保持する(様式を根拠にする場合)", () => {
      const out = normalizeQuestion({
        ...base,
        source: { level: "primary", fileId: "2FH00000081050", note: "様式第9号" },
      });
      expect(out.source).toEqual({
        level: "primary",
        fileId: "2FH00000081050",
        note: "様式第9号",
      });
    });

    it("verified: true でも source 未指定なら unverified のまま(独立に扱う)", () => {
      const out = normalizeQuestion({ ...base, verified: true });
      expect(out.verified).toBe(true);
      expect(out.source?.level).toBe("unverified");
    });
  });

  describe("lawVersion(版と法令基準日の関係)", () => {
    it("未指定は driftChecked: unchecked に正規化する(fail-closed)", () => {
      expect(normalizeQuestion(base).lawVersion).toEqual({
        driftChecked: "unchecked",
      });
    });

    it("lawVersion はあるが driftChecked が無いときも unchecked を補う", () => {
      const out = normalizeQuestion({
        ...base,
        lawVersion: { revisionId: "327AC1000000176_20260401_507AC0000000068" },
      });
      expect(out.lawVersion).toEqual({
        revisionId: "327AC1000000176_20260401_507AC0000000068",
        driftChecked: "unchecked",
      });
    });

    it("指定された driftChecked はそのまま保持する", () => {
      const out = normalizeQuestion({
        ...base,
        lawVersion: {
          verifiedAgainst: "2026-04-01",
          examBasisDate: "2026-04-01",
          driftChecked: "not_required",
        },
      });
      expect(out.lawVersion?.driftChecked).toBe("not_required");
    });

    it("施行日が基準日より前でも自動で not_required にはしない", () => {
      // 施行日 ≦ 基準日 は「基準日までに効力を生じた」ことしか示さず、
      // 「基準日時点でもその内容のまま」であることは示さないため。
      const out = normalizeQuestion({
        ...base,
        lawVersion: {
          verifiedAgainst: "2023-04-01",
          examBasisDate: "2026-04-01",
        },
      });
      expect(out.lawVersion?.driftChecked).toBe("unchecked");
    });
  });
});
