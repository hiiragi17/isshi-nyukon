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
      expect(normalizeQuestion(base).source).toEqual({
        level: "unverified",
        answerLevel: "unverified",
      });
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
        answerLevel: "primary",
        fileId: "2FH00000081050",
        note: "様式第9号",
      });
    });

    it("answerLevel 未指定は level と同じ値になる", () => {
      const out = normalizeQuestion({ ...base, source: { level: "mirrored" } });
      expect(out.source?.answerLevel).toBe("mirrored");
    });

    it("answerLevel は level より強くできる(肢は原文・lesson だけが弱いケース)", () => {
      // F8(数値そのものが答えになる肢は primary 必須)は answerLevel で判定する。
      // level を弱い側に倒すと答えの根拠の強さまで見えなくなるため分けて持つ。
      const out = normalizeQuestion({
        ...base,
        source: { level: "mirrored", answerLevel: "primary" },
      });
      expect(out.source?.level).toBe("mirrored");
      expect(out.source?.answerLevel).toBe("primary");
    });

    it("返り値の source を書き換えても入力や既定値を汚染しない", () => {
      const input: Question = { ...base };
      const a = normalizeQuestion(input);
      a.source!.level = "primary";
      expect(input.source).toBeUndefined();
      expect(normalizeQuestion({ ...base }).source?.level).toBe("unverified");
    });

    it("返り値の lawVersion を書き換えても既定値を汚染しない", () => {
      const a = normalizeQuestion({ ...base });
      a.lawVersion!.driftChecked = "checked";
      expect(normalizeQuestion({ ...base }).lawVersion?.driftChecked).toBe(
        "unchecked",
      );
    });

    it("渡した source オブジェクトを破壊しない(コピーを返す)", () => {
      const src = { level: "primary" as const };
      normalizeQuestion({ ...base, source: src });
      expect(src).toEqual({ level: "primary" });
    });

    it("verified: true でも source 未指定なら unverified のまま(独立に扱う)", () => {
      const out = normalizeQuestion({ ...base, verified: true });
      expect(out.verified).toBe(true);
      expect(out.source?.level).toBe("unverified");
    });
  });

  describe("topicId(論点グルーピング)", () => {
    it("未指定は自分の id に正規化する(既定値)", () => {
      expect(normalizeQuestion(base).topicId).toBe("qtest");
    });

    it("指定された topicId はそのまま保持する(2周目が1周目に合わせる)", () => {
      const out = normalizeQuestion({ ...base, topicId: "q1" });
      expect(out.topicId).toBe("q1");
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
