import { describe, expect, it } from "vitest";
import { examBasisDateFor, examYearFor } from "@/lib/exam-basis";
import { SHEETS } from "./index";

describe("暗記シートのデータ整合性", () => {
  it("id と節 id が重複しない", () => {
    expect(new Set(SHEETS.map((s) => s.id)).size).toBe(SHEETS.length);
    for (const s of SHEETS) {
      const ids = s.sections.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("節 id がシートをまたいでも重複しない(アンカー #節id がページ内で一意になるように)", () => {
    const ids = SHEETS.flatMap((s) => s.sections.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
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

  it("verified: true にするなら一次ソース照合と、版・基準日の記録が必要(fail-closed)", () => {
    for (const s of SHEETS) {
      if (!s.verified) continue;
      expect(s.source.level).toBe("primary");
      expect(s.lawVersion.revisionId).toBeTruthy();
      expect(s.lawVersion.note).toBeTruthy();
      // 差分確認が済んでいない(unchecked)なら、その理由を note に残す
      if (s.lawVersion.driftChecked === "unchecked") {
        expect(s.lawVersion.note).toContain("確認できていない");
      }
    }
  });

  it("verified: true のシートは verifiedAgainst・examBasisDate・driftChecked を必ず記録している", () => {
    for (const s of SHEETS) {
      if (!s.verified) continue;
      const lv = s.lawVersion;
      expect(lv.verifiedAgainst, `${s.id} の verifiedAgainst`).toBeTruthy();
      expect(lv.examBasisDate, `${s.id} の examBasisDate`).toBeTruthy();
      expect(lv.driftChecked, `${s.id} の driftChecked`).toBeDefined();
    }
  });

  // examBasisDate は「試験を実施する年度の4月1日」という規則からの導出値(lib/exam-basis.ts)。
  // 年度が変わったら更新が必要で、更新漏れをここで機械的に検出する
  // (問題データの data/questions/integrity.test.ts と同じ方式)。
  const currentBasisDate = examBasisDateFor(new Date());

  /** 期待する基準日と食い違う examBasisDate を持つシートの id */
  function examBasisDrift(expected: string): string[] {
    return SHEETS.filter((s) => s.lawVersion.examBasisDate)
      .filter((s) => s.lawVersion.examBasisDate !== expected)
      .map((s) => s.id);
  }

  /** 特定年度の基準日を意図的に残すシートだけ、理由を書いて登録する(通常の年度更新はここに逃がさない) */
  const SHEET_EXAM_BASIS_DATE_EXCEPTIONS: Record<string, string> = {};

  it("examBasisDate が現在の年度の法令基準日と一致する", () => {
    const drifted = examBasisDrift(currentBasisDate).filter(
      (id) => !SHEET_EXAM_BASIS_DATE_EXCEPTIONS[id],
    );
    expect(
      drifted,
      [
        `examBasisDate が現在の年度の基準日(${currentBasisDate})と食い違っている: ${drifted.join("・")}`,
        "年度が変わったので、次を行う:",
        `1. 該当シートの lawVersion.examBasisDate を ${currentBasisDate} に更新する`,
        "2. 使っている法令の版と新しい基準日の関係を再確認し、driftChecked を当て直す(確認できるまでは unchecked に戻す)",
        "3. 照合表(docs/verification/horei-verification.md)の基準日の記述も直す",
        "特定年度の基準日を意図的に残す場合だけ、SHEET_EXAM_BASIS_DATE_EXCEPTIONS に理由を書いて登録する",
      ].join("\n"),
    ).toEqual([]);
  });

  it("年度をまたぐと examBasisDate のズレを検出する(上の検査自体の確認)", () => {
    const recorded = SHEETS.filter((s) => s.lawVersion.examBasisDate);
    expect(recorded.length, "examBasisDate 記録済みのシート").toBeGreaterThan(0);

    const nextYear = new Date(`${examYearFor(new Date()) + 1}-04-01T00:00:00+09:00`);
    expect(examBasisDrift(examBasisDateFor(nextYear))).toEqual(recorded.map((s) => s.id));
  });

  it("examBasisDate の除外リストが監査可能な状態を保っている", () => {
    for (const [id, reason] of Object.entries(SHEET_EXAM_BASIS_DATE_EXCEPTIONS)) {
      const s = SHEETS.find((x) => x.id === id);
      expect(s, `除外リストの ${id} が存在しない`).toBeDefined();
      expect(reason.trim(), `除外リストの ${id} に理由が書かれていない`).not.toBe("");
      expect(s!.lawVersion.examBasisDate, `除外リストの ${id} は examBasisDate を持つ必要がある`).toBeTruthy();
    }
  });
});
