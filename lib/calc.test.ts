/**
 * lib/calc.ts のユニットテスト。
 * - 税 calc(報酬 q5)の表示・文言・得点が従来と一字も変わらないこと(リグレッション防止)
 * - 汎用 calc(容積率 q10)が単位付きで正しく計算・採点・表示されること
 */
import { describe, it, expect } from "vitest";
import { hoshu } from "@/data/questions/gyoho/hoshu";
import { yosekiCalc } from "@/data/questions/horei/yoseki-calc";
import { evaluateCalc, isTaxCalc, calcFmt } from "@/lib/calc";

describe("isTaxCalc — 第二式の kind で税 calc を識別", () => {
  it("報酬(q5)は税 calc", () => {
    expect(isTaxCalc(hoshu.calc!)).toBe(true);
  });
  it("容積率(q10)は汎用 calc", () => {
    expect(isTaxCalc(yosekiCalc.calc!)).toBe(false);
  });
});

describe("calcFmt — 必要なときだけ小数1桁", () => {
  it("整数はそのまま", () => {
    expect(calcFmt(96)).toBe("96");
  });
  it("小数は1桁", () => {
    expect(calcFmt(105.6)).toBe("105.6");
  });
});

describe("税 calc(報酬 q5)は従来どおり(表示・文言・得点が不変)", () => {
  // build[0] の正解=速算式(index 0)、build[1] の正解=taxAll(index 0)
  it("両方正解: 105.6万円・満点・従来の文言", () => {
    const v = evaluateCalc(hoshu.calc!, 0, 0);
    expect(v.pts).toBe(2);
    expect(v.line1).toBe("3,000万円 × 3% + 6万円 = 96万円");
    expect(v.line2).toBe("96万円 × 1.10 = 105.6万円");
    expect(v.message).toBe("式も税も正解。決着。");
  });

  it("式は正解・税を上乗せ忘れ(taxNone, index 1)", () => {
    const v = evaluateCalc(hoshu.calc!, 0, 1);
    expect(v.pts).toBe(1);
    expect(v.line2).toBe("消費税なし → 96万円");
    expect(v.message).toBe("式は正解。消費税の扱いが誤り。");
  });

  it("速算式が誤り・税は正解(第一式 index 1 は 5% 誤答)", () => {
    const v = evaluateCalc(hoshu.calc!, 1, 0);
    expect(v.pts).toBe(1);
    expect(v.line1).toBe("3,000万円 × 5% = 150万円");
    expect(v.message).toBe("税は正解。速算式が誤り。");
  });

  it("6万円部分だけ課税(taxPartial6, index 2)の途中式", () => {
    const v = evaluateCalc(hoshu.calc!, 0, 2);
    // (96 − 6) × 1.10 + 6 = 105
    expect(v.line2).toBe("(96万円 − 6万円) × 1.10 + 6万円 = 105万円");
  });
});

describe("汎用 calc(容積率 q10)", () => {
  it("両方正解: 960㎡・満点・汎用の文言", () => {
    const v = evaluateCalc(yosekiCalc.calc!, 0, 0);
    expect(v.pts).toBe(2);
    expect(v.line1).toBe("前面道路 6m × 4/10 = 240% と 指定 300% の小さいほう → 240%");
    expect(v.line2).toBe("敷地面積 400㎡ × 適用容積率 = 960㎡");
    expect(v.message).toBe("第一式・第二式ともに正解。決着。");
  });

  it("第一式が誤り(指定300%をそのまま, index 1)でも、選んだ値を反映して 1200㎡", () => {
    // 第一式=300%(誤)× 第二式=正しい掛け算 → 400 × 300% = 1200㎡(正解値 960 を出さない)
    const v = evaluateCalc(yosekiCalc.calc!, 1, 0);
    expect(v.pts).toBe(1);
    expect(v.line2).toBe("敷地面積 400㎡ × 適用容積率 = 1200㎡");
    expect(v.message).toBe("第二式は正解。第一式が誤り。");
  });

  it("第二式が誤り(割り算, index 1)は選んだ 240% を反映", () => {
    // 400 ÷ 240% = 166.67 → 166.7
    const v = evaluateCalc(yosekiCalc.calc!, 0, 1);
    expect(v.pts).toBe(1);
    expect(v.line2).toBe("敷地面積 400㎡ ÷ 適用容積率 = 166.7㎡");
    expect(v.message).toBe("第一式は正解。第二式が誤り。");
  });

  it("canonical の答えと answer が整合(400㎡ × 240% = 960㎡)", () => {
    expect(yosekiCalc.calc!.answer).toBe(960);
    expect(400 * 2.4).toBe(960);
  });
});
