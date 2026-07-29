/**
 * 収録済み問題データ全体の整合性テスト(Issue #93)。
 *
 * 個々のモジュールではなく `QUESTIONS`(読み込み境界を通った公開データ)を
 * 横断的に検証する。q47 のID衝突(既存の建築確認と重複)のような
 * データ追加時の事故を、PR 時点で機械的に検知するのが目的。
 */
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "./index";
import type { Question } from "@/types";

/** type 未指定は zenshi 扱い(types/index.ts の Question.type 参照) */
const typeOf = (q: Question) => q.type ?? "zenshi";

const zenshiQuestions = QUESTIONS.filter((q) => typeOf(q) === "zenshi");
const calcQuestions = QUESTIONS.filter((q) => typeOf(q) === "calc");
const spotQuestions = QUESTIONS.filter((q) => typeOf(q) === "spot");

describe("問題データ全体", () => {
  it("id が全問題で一意である(q47衝突の再発防止)", () => {
    const ids = QUESTIONS.map((q) => q.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("id が q<数字> 形式である", () => {
    for (const q of QUESTIONS) {
      expect(q.id, `${q.topic} の id`).toMatch(/^q\d+$/);
    }
  });

  it("verified が boolean に正規化されている", () => {
    for (const q of QUESTIONS) {
      expect(typeof q.verified, `${q.id} の verified`).toBe("boolean");
    }
  });

  it("lesson(30秒レッスン)が空でない", () => {
    for (const q of QUESTIONS) {
      expect(q.lesson.length, `${q.id} の lesson`).toBeGreaterThan(0);
    }
  });

  it("diagram の edges が存在する node を参照している", () => {
    for (const q of QUESTIONS) {
      if (!q.diagram) continue;
      const nodeIds = new Set(q.diagram.nodes.map((n) => n.id));
      for (const edge of q.diagram.edges) {
        expect(nodeIds.has(edge.from), `${q.id} の edge.from=${edge.from}`).toBe(true);
        expect(nodeIds.has(edge.to), `${q.id} の edge.to=${edge.to}`).toBe(true);
      }
    }
  });
});

describe("zenshi(全肢判定)", () => {
  it("choices を持ち、各肢の segments・reasons が空でない", () => {
    for (const q of zenshiQuestions) {
      expect(q.choices, `${q.id} の choices`).toBeDefined();
      expect(q.choices!.length, `${q.id} の肢数`).toBeGreaterThan(0);
      for (const [i, c] of q.choices!.entries()) {
        expect(c.segments.length, `${q.id} 肢${i + 1} の segments`).toBeGreaterThan(0);
        expect(c.reasons.length, `${q.id} 肢${i + 1} の reasons`).toBeGreaterThan(1);
      }
    }
  });

  it("各肢の reasons に正解がちょうど1つある", () => {
    for (const q of zenshiQuestions) {
      for (const [i, c] of q.choices!.entries()) {
        const correctCount = c.reasons.filter((r) => r.correct).length;
        expect(correctCount, `${q.id} 肢${i + 1} の正解理由の数`).toBe(1);
      }
    }
  });

  it("×肢は segments 範囲内の wrongIndex を持ち、○肢は持たない", () => {
    for (const q of zenshiQuestions) {
      for (const [i, c] of q.choices!.entries()) {
        if (c.correct) {
          expect(c.wrongIndex, `${q.id} 肢${i + 1}(○肢)の wrongIndex`).toBeUndefined();
        } else {
          expect(c.wrongIndex, `${q.id} 肢${i + 1}(×肢)の wrongIndex`).toBeDefined();
          expect(c.wrongIndex!, `${q.id} 肢${i + 1} の wrongIndex`).toBeGreaterThanOrEqual(0);
          expect(c.wrongIndex!, `${q.id} 肢${i + 1} の wrongIndex`).toBeLessThan(
            c.segments.length,
          );
        }
      }
    }
  });
});

describe("calc(計算)", () => {
  it("calc スペックを持ち、answer が有限数である", () => {
    for (const q of calcQuestions) {
      expect(q.calc, `${q.id} の calc`).toBeDefined();
      expect(Number.isFinite(q.calc!.answer), `${q.id} の answer`).toBe(true);
      expect(q.calc!.unit, `${q.id} の unit`).not.toBe("");
    }
  });

  it("build がちょうど2段で、各段に選択肢が2つ以上・正解がちょうど1つある", () => {
    for (const q of calcQuestions) {
      // CalcEngine と lib/calc.ts は build を2段固定([0]=式 / [1]=仕上げ)として扱う
      expect(q.calc!.build.length, `${q.id} の build 段数`).toBe(2);
      for (const [i, step] of q.calc!.build.entries()) {
        expect(step.options.length, `${q.id} 段${i + 1} の選択肢数`).toBeGreaterThan(1);
        const correctCount = step.options.filter((o) => o.correct).length;
        expect(correctCount, `${q.id} 段${i + 1} の正解数`).toBe(1);
      }
    }
  });

  it("誤答肢には trap(落とし穴の説明)がある", () => {
    for (const q of calcQuestions) {
      for (const [i, step] of q.calc!.build.entries()) {
        for (const o of step.options) {
          if (!o.correct) {
            expect(o.trap, `${q.id} 段${i + 1}「${o.formula}」の trap`).not.toBe("");
          }
        }
      }
    }
  });
});

describe("spot(間違い探し)", () => {
  it("spot スペックを持ち、errorCount が違反ゾーン数と一致する", () => {
    for (const q of spotQuestions) {
      expect(q.spot, `${q.id} の spot`).toBeDefined();
      const violations = q.spot!.zones.filter((z) => z.violation).length;
      expect(q.spot!.errorCount, `${q.id} の errorCount`).toBe(violations);
    }
  });

  it("zone の id が問題内で一意である", () => {
    for (const q of spotQuestions) {
      const ids = q.spot!.zones.map((z) => z.id);
      expect(new Set(ids).size, `${q.id} の zone id`).toBe(ids.length);
    }
  });

  it("違反ゾーンは reason、適法ゾーンは note を持つ", () => {
    for (const q of spotQuestions) {
      for (const z of q.spot!.zones) {
        if (z.violation) {
          expect(z.reason, `${q.id} ゾーン${z.id} の reason`).toBeTruthy();
        } else {
          expect(z.note, `${q.id} ゾーン${z.id} の note`).toBeTruthy();
        }
      }
    }
  });
});

describe("照合の証跡(source / lawVersion)", () => {
  it("読み込み境界で source が必ず埋まっている(未指定は unverified)", () => {
    for (const q of QUESTIONS) {
      expect(q.source?.level, `${q.id} の source.level`).toBeDefined();
    }
  });

  it("読み込み境界で driftChecked が必ず埋まっている(未指定は unchecked)", () => {
    for (const q of QUESTIONS) {
      expect(q.lawVersion?.driftChecked, `${q.id} の driftChecked`).toBeDefined();
    }
  });

  it("source.level が primary の問題は照合に用いた版を記録している", () => {
    // 原文に当てたと主張する以上、どの版に当てたかを残していないと再現できない。
    for (const q of QUESTIONS.filter((x) => x.source?.level === "primary")) {
      const lv = q.lawVersion ?? {};
      expect(
        lv.revisionId ?? lv.verifiedAgainst,
        `${q.id} は primary だが版の記録が無い`,
      ).toBeTruthy();
    }
  });

  it("driftChecked が not_required なら照合した版と法令基準日が一致している", () => {
    // 「施行日が基準日より前」は not_required の根拠にならない。
    // 差分が生じ得ないのは両者が一致する場合だけ。
    for (const q of QUESTIONS) {
      const lv = q.lawVersion;
      if (lv?.driftChecked !== "not_required") continue;
      expect(lv.verifiedAgainst, `${q.id} の verifiedAgainst`).toBeTruthy();
      expect(lv.examBasisDate, `${q.id} の examBasisDate`).toBeTruthy();
      expect(lv.verifiedAgainst, `${q.id} は not_required だが版と基準日が不一致`).toBe(
        lv.examBasisDate,
      );
    }
  });

  it("現状の内訳を可視化する(埋まっていないものが常に見える状態を保つ)", () => {
    const byLevel = new Map<string, string[]>();
    for (const q of QUESTIONS) {
      const lvl = q.source?.level ?? "unverified";
      byLevel.set(lvl, [...(byLevel.get(lvl) ?? []), q.id]);
    }
    // 記録がまだ無い問題は「unverified」に集まる。埋めるたびにここが減る。
    const unverified = byLevel.get("unverified") ?? [];
    expect(unverified.length + (byLevel.get("primary")?.length ?? 0) +
      (byLevel.get("mirrored")?.length ?? 0) +
      (byLevel.get("secondary")?.length ?? 0)).toBe(QUESTIONS.length);
  });
});
