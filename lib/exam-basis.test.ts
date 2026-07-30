import { describe, expect, it } from "vitest";
import { examBasisDateFor, examYearFor } from "./exam-basis";

/** JST の日時を Date にする(年度判定は JST 基準なので、テストも JST で書く) */
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("examYearFor(年度の導出)", () => {
  it("4月1日から年度が切り替わる", () => {
    expect(examYearFor(jst("2026-03-31T23:59:59"))).toBe(2025);
    expect(examYearFor(jst("2026-04-01T00:00:00"))).toBe(2026);
  });

  it("1〜3月は前年度として扱う", () => {
    expect(examYearFor(jst("2027-01-01T00:00:00"))).toBe(2026);
    expect(examYearFor(jst("2027-02-15T12:00:00"))).toBe(2026);
    expect(examYearFor(jst("2027-03-31T12:00:00"))).toBe(2026);
  });

  it("4〜12月はその年を年度とする", () => {
    expect(examYearFor(jst("2026-04-01T09:00:00"))).toBe(2026);
    expect(examYearFor(jst("2026-10-18T13:00:00"))).toBe(2026);
    expect(examYearFor(jst("2026-12-31T23:59:59"))).toBe(2026);
  });

  it("UTC で動く環境でも JST の年度で判定する(3月31日夕方の取り違え防止)", () => {
    // 2026-03-31T15:00Z は JST では 2026-04-01T00:00。令和8年度に入っている。
    expect(examYearFor(new Date("2026-03-31T15:00:00Z"))).toBe(2026);
    expect(examYearFor(new Date("2026-03-31T14:59:59Z"))).toBe(2025);
  });
});

describe("examBasisDateFor(法令基準日の導出)", () => {
  it("年度の4月1日を返す", () => {
    expect(examBasisDateFor(jst("2026-07-30T00:00:00"))).toBe("2026-04-01");
  });

  it("年度をまたぐと基準日が動く(記録が古いままだと不一致になる)", () => {
    // 記録済みの問題は現在 "2026-04-01" を持っている。年度が変わればこの値と
    // 一致しなくなり、integrity.test.ts の検査が落ちる。
    expect(examBasisDateFor(jst("2027-04-01T00:00:00"))).toBe("2027-04-01");
    expect(examBasisDateFor(jst("2027-03-31T23:59:59"))).toBe("2026-04-01");
  });
});
