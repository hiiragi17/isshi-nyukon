/**
 * lib/mock.ts のユニットテスト。
 * 本試験配分の比例配分(最大剰余方式)・決定性・母集団不足時のフォールバックを検証する。
 */
import { describe, it, expect } from "vitest";
import {
  allocateByWeight,
  buildMockSession,
  EXAM_DISTRIBUTION,
  type CategoryWeight,
} from "@/lib/mock";
import type { Category } from "@/types";

/** テスト用の軽量な論点。id の接頭辞で分野を表す */
type Topic = { id: string; category: Category };

/** 各分野 n 件ずつの母集団を作る */
function pool(counts: Record<Category, number>): Topic[] {
  const out: Topic[] = [];
  for (const { category } of EXAM_DISTRIBUTION) {
    for (let i = 0; i < counts[category]; i++) {
      out.push({ id: `${category}-${i}`, category });
    }
  }
  return out;
}

const categoryOf = (t: Topic): Category => t.category;
const ample = pool({
  "権利関係(民法)": 18,
  宅建業法: 18,
  法令上の制限: 11,
  "税・その他": 11,
});

describe("allocateByWeight", () => {
  it("本試験配分 14:20:8:8 で 7 件を 2/3/1/1 に配る", () => {
    expect(allocateByWeight(7, [14, 20, 8, 8])).toEqual([2, 3, 1, 1]);
  });

  it("配った合計は必ず total に一致する", () => {
    for (const total of [0, 1, 5, 7, 8, 10, 25]) {
      const alloc = allocateByWeight(total, [14, 20, 8, 8]);
      expect(alloc.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("余りは小数部の大きい枠へ、同点は添字の小さい枠へ配る", () => {
    // 均等 weight で total=1 → 先頭の枠が受け取る
    expect(allocateByWeight(1, [1, 1, 1, 1])).toEqual([1, 0, 0, 0]);
  });

  it("total<=0 / weight 合計 0 は全て 0", () => {
    expect(allocateByWeight(0, [14, 20, 8, 8])).toEqual([0, 0, 0, 0]);
    expect(allocateByWeight(-3, [14, 20, 8, 8])).toEqual([0, 0, 0, 0]);
    expect(allocateByWeight(5, [0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });
});

describe("buildMockSession", () => {
  it("本試験配分どおり分野別に抽出する(7論点=権2/業3/法1/税1)", () => {
    const out = buildMockSession(ample, categoryOf, 7);
    const count = (c: Category) => out.filter((t) => t.category === c).length;
    expect(out).toHaveLength(7);
    expect(count("権利関係(民法)")).toBe(2);
    expect(count("宅建業法")).toBe(3);
    expect(count("法令上の制限")).toBe(1);
    expect(count("税・その他")).toBe(1);
  });

  it("distribution の順(権利→業法→法令→税)に並べて返す", () => {
    const out = buildMockSession(ample, categoryOf, 7).map((t) => t.category);
    const order = EXAM_DISTRIBUTION.map((d) => d.category);
    const rank = (c: Category) => order.indexOf(c);
    for (let i = 1; i < out.length; i++) {
      expect(rank(out[i])).toBeGreaterThanOrEqual(rank(out[i - 1]));
    }
  });

  it("既定(恒等 shuffle)は決定的(同入力→同出力)", () => {
    const a = buildMockSession(ample, categoryOf, 7).map((t) => t.id);
    const b = buildMockSession(ample, categoryOf, 7).map((t) => t.id);
    expect(a).toEqual(b);
  });

  it("shuffle を渡すと各分野内の並びに反映される", () => {
    const reverse = <T,>(xs: T[]): T[] => [...xs].reverse();
    const out = buildMockSession(ample, categoryOf, 7, EXAM_DISTRIBUTION, reverse);
    // 権利枠は末尾側(id 17, 16)から2件が採られる
    const kenri = out
      .filter((t) => t.category === "権利関係(民法)")
      .map((t) => t.id);
    expect(kenri).toEqual(["権利関係(民法)-17", "権利関係(民法)-16"]);
  });

  it("ある分野の母集団が足りないと、不足分を余力のある分野へ回して total を保つ", () => {
    // 法令の目標は 1 だが母集団 0 → 不足 1 を他分野へ回す
    const scarce = pool({
      "権利関係(民法)": 5,
      宅建業法: 5,
      法令上の制限: 0,
      "税・その他": 5,
    });
    const out = buildMockSession(scarce, categoryOf, 7);
    expect(out).toHaveLength(7);
    expect(out.filter((t) => t.category === "法令上の制限")).toHaveLength(0);
  });

  it("母集団全体が total に満たなければ、ある分だけ返す(取りすぎない)", () => {
    const tiny = pool({
      "権利関係(民法)": 1,
      宅建業法: 1,
      法令上の制限: 0,
      "税・その他": 0,
    });
    const out = buildMockSession(tiny, categoryOf, 7);
    expect(out).toHaveLength(2);
  });

  it("total<=0 は空", () => {
    expect(buildMockSession(ample, categoryOf, 0)).toEqual([]);
    expect(buildMockSession(ample, categoryOf, -1)).toEqual([]);
  });

  it("distribution に無い分野の item は無視する", () => {
    const withUnknown: Topic[] = [
      ...pool({
        "権利関係(民法)": 2,
        宅建業法: 3,
        法令上の制限: 1,
        "税・その他": 1,
      }),
      { id: "x", category: "未知の分野" as Category },
    ];
    const out = buildMockSession(withUnknown, categoryOf, 7);
    expect(out.some((t) => t.id === "x")).toBe(false);
  });

  it("custom distribution を渡せる", () => {
    const dist: CategoryWeight[] = [
      { category: "宅建業法", weight: 1 },
      { category: "権利関係(民法)", weight: 1 },
    ];
    const out = buildMockSession(ample, categoryOf, 2, dist);
    expect(out.map((t) => t.category)).toEqual(["宅建業法", "権利関係(民法)"]);
  });
});
