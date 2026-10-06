import { describe, expect, it } from "vitest";
import { SHEETS } from "./index";

describe("暗記シートのデータ整合性", () => {
  it("id と節 id が重複しない", () => {
    expect(new Set(SHEETS.map((s) => s.id)).size).toBe(SHEETS.length);
    for (const s of SHEETS) {
      const ids = s.sections.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("表の各行が見出しと同じ列数で、行見出し(先頭列)が表内で重複しない", () => {
    for (const s of SHEETS) {
      for (const sec of s.sections) {
        for (const t of sec.tables) {
          for (const row of t.rows) expect(row).toHaveLength(t.headers.length);
          const heads = t.rows.map((r) => r[0]);
          expect(new Set(heads).size, `${s.id}/${sec.id}`).toBe(heads.length);
        }
      }
    }
  });

  it("verified: true にするなら一次ソース照合と法令基準日の記録が必要(fail-closed)", () => {
    for (const s of SHEETS) {
      if (!s.verified) continue;
      expect(s.source.level).toBe("primary");
      expect(s.lawVersion.driftChecked).not.toBe("unchecked");
    }
  });
});
