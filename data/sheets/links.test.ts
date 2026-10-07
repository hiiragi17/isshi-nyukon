import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/data/questions";
import { SHEETS } from "./index";
import { SHEET_LINKS, sheetLinkFor } from "./links";

describe("暗記シートへの対応表", () => {
  it("対応表の論点が、実在する問題の topicId(無ければ id)と一致する", () => {
    const topicIds = new Set(QUESTIONS.map((q) => q.topicId ?? q.id));
    for (const topicId of Object.keys(SHEET_LINKS)) {
      expect(topicIds.has(topicId), `論点 ${topicId} が問題データに無い`).toBe(true);
    }
  });

  it("対応表のシートと節が実在し、リンクを解決できる", () => {
    for (const [topicId, link] of Object.entries(SHEET_LINKS)) {
      const sheet = SHEETS.find((s) => s.id === link.sheetId);
      expect(sheet, `${topicId} のシート ${link.sheetId}`).toBeDefined();
      expect(
        sheet!.sections.some((s) => s.id === link.sectionId),
        `${topicId} の節 ${link.sectionId}`,
      ).toBe(true);
      expect(sheetLinkFor(topicId), topicId).not.toBeNull();
    }
  });

  it("リンクは節のアンカーを指し、見出しは暗記シートの節の見出しになる", () => {
    expect(sheetLinkFor("q8")).toEqual({
      href: "/learn/sheets#kaihatsu",
      heading: "開発許可",
      sheetTitle: "法令上の制限・数字",
    });
  });

  it("対応の無い論点は null を返す", () => {
    expect(sheetLinkFor("q1")).toBeNull();
    expect(sheetLinkFor("存在しない論点")).toBeNull();
  });
});
