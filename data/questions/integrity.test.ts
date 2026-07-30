/**
 * 収録済み問題データ全体の整合性テスト(Issue #93)。
 *
 * 個々のモジュールではなく `QUESTIONS`(読み込み境界を通った公開データ)を
 * 横断的に検証する。q47 のID衝突(既存の建築確認と重複)のような
 * データ追加時の事故を、PR 時点で機械的に検知するのが目的。
 */
import { describe, expect, it } from "vitest";
import { QUESTIONS } from "./index";
import { SOURCE_LEVEL_RANK } from "@/types";
import type { Question } from "@/types";
import { examBasisDateFor, examYearFor } from "@/lib/exam-basis";

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

  it("answerLevel が level より弱いことはない(答えの根拠が全体より弱いのは矛盾)", () => {
    for (const q of QUESTIONS) {
      const lvl = q.source?.level ?? "unverified";
      const ans = q.source?.answerLevel ?? lvl;
      expect(
        SOURCE_LEVEL_RANK[ans],
        `${q.id} の answerLevel(${ans})が level(${lvl})より弱い`,
      ).toBeGreaterThanOrEqual(SOURCE_LEVEL_RANK[lvl]);
    }
  });

  it("primary を主張する問題は照合に用いた版を記録している", () => {
    // 原文に当てたと主張する以上、どの版に当てたかを残していないと再現できない。
    // level だけでなく answerLevel も対象にする——lesson の一部が弱いせいで level を
    // 下げていても、肢の根拠が primary なら「どの版の原文に当てたか」は必要(q52)。
    const claimsPrimary = (q: Question) =>
      q.source?.level === "primary" || q.source?.answerLevel === "primary";
    for (const q of QUESTIONS.filter(claimsPrimary)) {
      const lv = q.lawVersion ?? {};
      expect(
        lv.revisionId ?? lv.verifiedAgainst,
        `${q.id} は primary を主張しているが版の記録が無い`,
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

  // F8(Issue #125): 数値そのものが答えになる肢を含む問題は answerLevel: primary を要する。
  //
  // 「答えになる数値」は、×肢の誤り箇所(wrongIndex が指す segment)に数値が含まれるかで拾う。
  // 誤り箇所そのものが数値なら、その数値が肢の正誤を決めている。
  //
  // これは**下限**の検査であることに注意する。○肢の中の数値や reasons 側の数値は拾えないし、
  // 「3条の許可」のような条番号を数値と誤認することもある(誤認は primary を要求する側に
  // 倒れるので fail-closed)。人が原文を見る手順(CLAUDE.md「問題の精度担保」)の代わりにはならない。
  // 和数字にも効かせる。現データの金額は「3,000万円」のようにアラビア数字併用だが、
  // 条文の文言をそのまま肢にすると「三千万円」の形が入りうるため(CodeRabbit 指摘・PR #128)。
  // 単位(㎡・平方メートル・パーセント等)は**数詞に続くときだけ**数値とみなす。
  // 単独で拾うと「面積は平方メートルで表示する」のような非数値の誤り箇所まで
  // primary を要求してしまう(CodeRabbit 指摘・PR #128)。
  const NUMERIC =
    /[0-9０-９]|[〇零一二三四五六七八九十百千万億兆]+(?:分の|年|月|日|週間|人|階|倍|割|円|[%％]|㎡|平方メートル|パーセント)/;

  /** 誤り箇所が数値になっている×肢の一覧(空なら数値が答えを決めていない) */
  const numericAnswerChoices = (q: Question) =>
    (q.choices ?? [])
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.correct && c.wrongIndex !== undefined)
      .filter(({ c }) => NUMERIC.test(c.segments[c.wrongIndex!]))
      .map(({ i }) => i + 1);

  /**
   * 機械検査で数値肢と判定されるが primary を要しないと人が判断した問題。
   * 追加するときは理由を書く(CLAUDE.md「AIの下書き照合だけを根拠にしない」)。
   */
  const F8_EXCEPTIONS: Record<string, string> = {};

  it("数値の検出が和数字・アラビア数字の双方に効く(F8 の検出漏れ防止)", () => {
    for (const hit of [
      "三千万円特別控除の適用を受けることができる。",
      "100分の3(3%)と定められている。",
      "20分の1以上でなければならない。",
      "五分の一から十分の一までの間において",
      "その業務を開始した日から10日以内に、",
      "二百平方メートル以下であるもの",
      "存続期間を四十年とし、",
    ]) {
      expect(NUMERIC.test(hit), `「${hit}」は数値として拾われるべき`).toBe(true);
    }
    for (const miss of [
      "面積は平方メートルで表示する。",
      "割合はパーセントで示す。",
      "課税標準を軽減する特例は設けられていない。",
      "登記地の都道府県が課する地方税である。",
      "それぞれの地域の用途制限が、敷地の面積の割合に応じて適用される。",
    ]) {
      expect(NUMERIC.test(miss), `「${miss}」は数値ではない`).toBe(false);
    }
  });

  it("数値そのものが答えになる肢を含む問題は answerLevel が primary である(F8)", () => {
    // 根拠の強さをまだ何も記録していない問題は対象外。それらは下の内訳テストで
    // unverified として可視化され続ける。ここで一律に落とすと「記録を埋める作業」自体が
    // 進められなくなるため、F8 は「数値肢を持つ問題を弱い水準で記録できない」形で効かせる。
    //
    // 判定は level と answerLevel の両方を見る。q52 のように lesson の一部が弱いせいで
    // level を下げていても、answerLevel を記録しているなら F8 の対象になる。
    for (const q of QUESTIONS) {
      const unrecorded =
        (q.source?.level ?? "unverified") === "unverified" &&
        (q.source?.answerLevel ?? "unverified") === "unverified";
      if (unrecorded) continue;
      const numeric = numericAnswerChoices(q);
      if (numeric.length === 0) continue;
      if (F8_EXCEPTIONS[q.id]) continue;
      expect(
        q.source?.answerLevel,
        `${q.id} は誤り箇所が数値の肢(肢${numeric.join("・")})を持つので answerLevel: primary が要る`,
      ).toBe("primary");
    }
  });

  it("F8 の除外リストに、もう数値肢を持たない問題が残っていない", () => {
    // 肢を書き換えて数値でなくなった問題の除外理由が残り続けると、記録が実態とずれる。
    for (const [id, reason] of Object.entries(F8_EXCEPTIONS)) {
      const q = QUESTIONS.find((x) => x.id === id);
      expect(q, `F8 除外リストの ${id} が存在しない`).toBeDefined();
      expect(
        numericAnswerChoices(q!).length,
        `${id} は数値肢を持たないので除外(${reason})は不要`,
      ).toBeGreaterThan(0);
    }
  });

  // #133: examBasisDate は「試験を実施する年度の4月1日」という規則からの**導出値**で、
  // 年度が変われば動く。値を固定で持っている以上、年度をまたいだ更新忘れは
  // 機械的に検出しないと気づけない(F8 を機械検査にしたのと同じ理由)。
  const currentBasisDate = examBasisDateFor(new Date());

  /** 期待する基準日と食い違う examBasisDate を持つ問題の一覧 */
  const examBasisDrift = (questions: Question[], expected: string) =>
    questions
      .filter((q) => q.lawVersion?.examBasisDate)
      .filter((q) => q.lawVersion!.examBasisDate !== expected)
      .map((q) => q.id);

  /**
   * 意図的に古い基準日を残す問題。追加するときは理由を書く
   * (例: 特定年度の出題を再現する問題を、当時の基準日のまま保持する場合)。
   * 通常の年度更新でここに逃がしてはならない——逃がすと更新漏れが見えなくなる。
   */
  const EXAM_BASIS_DATE_EXCEPTIONS: Record<string, string> = {};

  it("examBasisDate が現在の年度の法令基準日と一致する(#133)", () => {
    const drifted = examBasisDrift(QUESTIONS, currentBasisDate).filter(
      (id) => !EXAM_BASIS_DATE_EXCEPTIONS[id],
    );
    expect(
      drifted,
      [
        `examBasisDate が現在の年度の基準日(${currentBasisDate})と食い違っている: ${drifted.join("・")}`,
        "",
        "年度が変わったときにすべきこと:",
        `1. 基準日を再導出する。一次ソース(不動産適正取引推進機構「宅建試験の概要」)は`,
        `   「試験を実施する年度の4月1日現在施行されているもの」と相対的に定めているので、`,
        `   今年度なら ${currentBasisDate} になる`,
        `2. 該当問題の lawVersion.examBasisDate を ${currentBasisDate} に更新する`,
        "3. **driftChecked を再確認する。** 基準日が動くと、照合に使った版と基準日時点の版の",
        "   関係も変わる。verifiedAgainst と新しい基準日が一致しない限り not_required は使えない",
        "   (施行日が基準日より前であることは根拠にならない)。checked / analysed も、",
        "   新しい基準日の版に当て直すまでは unchecked に戻す",
        "4. 照合シート(docs/verification/*.md)の基準日の記述も併せて直す",
        "",
        "特定年度の基準日を意図的に残す場合だけ、EXAM_BASIS_DATE_EXCEPTIONS に理由を書いて登録する",
      ].join("\n"),
    ).toEqual([]);
  });

  it("年度をまたぐと examBasisDate のズレを検出する(#133 の検査自体の確認)", () => {
    // 記録済みの問題が現在の基準日を持っていることを前提に、翌年度の時点を与えると
    // すべてズレとして挙がる——つまり更新を忘れれば上のテストが落ちる。
    const recorded = QUESTIONS.filter((q) => q.lawVersion?.examBasisDate);
    expect(recorded.length, "examBasisDate 記録済みの問題").toBeGreaterThan(0);

    const nextYear = new Date(`${examYearFor(new Date()) + 1}-04-01T00:00:00+09:00`);
    expect(examBasisDrift(recorded, examBasisDateFor(nextYear))).toEqual(
      recorded.map((q) => q.id),
    );
  });

  it("examBasisDate の除外リストに、もうズレていない問題が残っていない", () => {
    for (const [id, reason] of Object.entries(EXAM_BASIS_DATE_EXCEPTIONS)) {
      const q = QUESTIONS.find((x) => x.id === id);
      expect(q, `examBasisDate 除外リストの ${id} が存在しない`).toBeDefined();
      expect(
        q!.lawVersion?.examBasisDate,
        `${id} は現在の基準日と一致しているので除外(${reason})は不要`,
      ).not.toBe(currentBasisDate);
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
