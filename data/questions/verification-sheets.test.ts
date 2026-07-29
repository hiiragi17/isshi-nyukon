/**
 * 照合シート(`docs/verification/*.md`)の表フォーマットの検査(Issue #125 の F2)。
 *
 * F2 で4シートの列構成を `肢 / 肢の正誤 / 根拠 / 照合結果`(+ `🚩数字`)に統一したが、
 * 凡例に書いただけでは守られない。実際、統一直後のレビューで
 * 「`肢の正誤` に説明文が残っている」「`🚩` が `照合結果` に混ざっている」が指摘された。
 * 列の意味が混ざると承認記録を読み違えるので、ここで機械的に固定する。
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SHEET_DIR = join(process.cwd(), "docs/verification");

const sheets = readdirSync(SHEET_DIR)
  .filter((f) => f.endsWith("-verification.md"))
  .map((f) => ({ name: f, text: readFileSync(join(SHEET_DIR, f), "utf-8") }));

/** 肢の表とゾーン(spot)の表で、1列目・2列目の見出しが変わる */
const HEADERS = [
  ["肢", "肢の正誤"],
  ["ゾーン", "違反/適法"],
] as const;

/**
 * calc(計算)の表は肢の表とは別様式。1列目の見出しで見分ける。
 * 根拠(条文)を書く問題は3列目に `根拠` を挟む——肢の表で `🚩数字` が任意列なのと同じ扱い。
 */
const CALC_HEADERS = [
  ["段", "計算", "検算"],
  ["段", "計算", "根拠", "検算"],
];
const CALC_FIRST = "段";

/** 2列目に書いてよい値。これ以外の限定(「30年になる」等)は `根拠` に回す */
const VERDICTS: Record<string, string[]> = {
  肢の正誤: ["○", "×(誤り)"],
  "違反/適法": ["違反", "適法"],
};

/** `照合結果` / `検算` に書いてよい記号(4シート共通) */
const STATUS = ["✅", "⚠️", "⏳"];

type Row = { sheet: string; line: number; cells: string[]; header: string[] };

/** 照合表(肢 / ゾーン)と calc 表(段)の両方を拾う。様式は違うがどちらも F2 の対象 */
function parseTables(sheet: { name: string; text: string }) {
  const lines = sheet.text.split("\n");
  const tables: { header: string[]; rows: Row[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) continue;
    if (!/^\|[\s:|-]+$/.test(lines[i + 1] ?? "")) continue;
    const header = cellsOf(lines[i]);
    const isChoice = HEADERS.some(([first]) => header[0] === first);
    if (!isChoice && header[0] !== CALC_FIRST) continue;
    const rows: Row[] = [];
    let j = i + 2;
    for (; j < lines.length && lines[j].startsWith("|"); j++) {
      rows.push({ sheet: sheet.name, line: j + 1, cells: cellsOf(lines[j]), header });
    }
    tables.push({ header, rows });
    i = j;
  }
  return tables;
}

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

const allTables = sheets.flatMap(parseTables);
const choiceTables = allTables.filter((t) => t.header[0] !== CALC_FIRST);
const calcTables = allTables.filter((t) => t.header[0] === CALC_FIRST);
const allRows = allTables.flatMap((t) => t.rows);

describe("照合シートの表フォーマット(F2)", () => {
  it("4シートすべてを読めている", () => {
    expect(sheets.map((s) => s.name).sort()).toEqual([
      "gyoho-verification.md",
      "horei-verification.md",
      "kenri-verification.md",
      "zei-verification.md",
    ]);
    expect(allRows.length).toBeGreaterThan(0);
  });

  it("肢・ゾーンの表の見出しが `… / … / 根拠 / 照合結果`(+ `🚩数字`)である", () => {
    for (const { header } of choiceTables) {
      const [first, second] = HEADERS.find(([f]) => header[0] === f)!;
      const expected = [first, second, "根拠", "照合結果"];
      if (header.length === 5) expected.push("🚩数字");
      expect(header, `${first} の表の見出し`).toEqual(expected);
    }
  });

  it("calc の表の見出しが `段 / 計算 / 検算`(+ `根拠`)である", () => {
    // calc は肢の表とは別様式だが、様式が崩れれば検算の記録が読めなくなる点は同じ。
    expect(calcTables.length, "calc 表が1つも見つからない").toBeGreaterThan(0);
    for (const { header } of calcTables) {
      expect(
        CALC_HEADERS.some((h) => h.length === header.length && h.every((c, i) => c === header[i])),
        `calc 表の見出し「${header.join(" / ")}」が想定の様式でない`,
      ).toBe(true);
    }
  });

  it("各行の列数が見出しと一致する", () => {
    for (const row of allRows) {
      expect(
        row.cells.length,
        `${row.sheet}:${row.line} の列数(見出しは${row.header.length}列)`,
      ).toBe(row.header.length);
    }
  });

  it("`肢の正誤` / `違反/適法` には決められた値しか入らない", () => {
    // 「×(誤り、30年になる)」のように限定を混ぜると、この列を機械的にも目視でも
    // 一貫して扱えなくなる。限定は `根拠` 側に書く。
    for (const { rows } of choiceTables) {
      for (const row of rows) {
        const allowed = VERDICTS[row.header[1]];
        expect(allowed, `${row.sheet}:${row.line} の見出し`).toBeDefined();
        expect(allowed).toContain(row.cells[1]);
      }
    }
  });

  it("`照合結果` は共通の記号で始まり、他の列の情報を持ち込まない", () => {
    for (const { rows } of choiceTables) {
      for (const row of rows) {
        const result = row.cells[3];
        expect(
          STATUS.some((s) => result.startsWith(s)),
          `${row.sheet}:${row.line} の照合結果「${result}」は ${STATUS.join(" / ")} で始まらない`,
        ).toBe(true);
        // 数字の検算は `🚩数字` 列、根拠の強さは問題データの `source.level` が持つ。
        expect(result, `${row.sheet}:${row.line} に 🚩 が混ざっている`).not.toContain("🚩");
        expect(
          result,
          `${row.sheet}:${row.line} に source.level が混ざっている`,
        ).not.toMatch(/primary|mirrored|secondary|unverified/);
      }
    }
  });

  it("calc の `検算` 欄に共通の記号がある", () => {
    // calc には `🚩数字` 列が無く、`検算` 欄が数字の検算そのものを担う。
    // したがってここは 🚩 の混在を禁じない。
    for (const { rows } of calcTables) {
      for (const row of rows) {
        const check = row.cells[row.header.length - 1];
        expect(
          STATUS.some((s) => check.includes(s)),
          `${row.sheet}:${row.line} の検算「${check}」に ${STATUS.join(" / ")} が無い`,
        ).toBe(true);
      }
    }
  });
});
