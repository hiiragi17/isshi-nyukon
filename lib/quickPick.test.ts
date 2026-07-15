/**
 * lib/quickPick.ts のユニットテスト。
 * 少量モードの出題順(弱点→未着手→その他)と件数制限を検証する。
 */
import { describe, it, expect } from "vitest";
import { buildQuickSession, type QuickState } from "@/lib/quickPick";

type Item = { id: string; state: QuickState };
const classify = (it: Item): QuickState => it.state;

const items: Item[] = [
  { id: "o1", state: "other" },
  { id: "w1", state: "weak" },
  { id: "u1", state: "untried" },
  { id: "o2", state: "other" },
  { id: "w2", state: "weak" },
  { id: "u2", state: "untried" },
];

describe("buildQuickSession", () => {
  it("弱点 → 未着手 → その他 の優先順で並べる(既定は決定的)", () => {
    const out = buildQuickSession(items, classify, items.length);
    expect(out.map((x) => x.id)).toEqual(["w1", "w2", "u1", "u2", "o1", "o2"]);
  });

  it("n 件に切る(優先順の先頭から)", () => {
    const out = buildQuickSession(items, classify, 3);
    expect(out.map((x) => x.id)).toEqual(["w1", "w2", "u1"]);
  });

  it("n が総数を超えても全件返す(超過分は無視)", () => {
    const out = buildQuickSession(items, classify, 100);
    expect(out).toHaveLength(items.length);
  });

  it("弱点が無ければ 未着手 → その他 の順になる", () => {
    const noWeak = items.filter((x) => x.state !== "weak");
    const out = buildQuickSession(noWeak, classify, 10);
    expect(out.map((x) => x.id)).toEqual(["u1", "u2", "o1", "o2"]);
  });

  it("空配列・n=0 は空を返す", () => {
    expect(buildQuickSession(items, classify, 0)).toEqual([]);
    expect(buildQuickSession([], classify, 5)).toEqual([]);
  });

  it("shuffle は各層内だけに作用し、層の優先順は保たれる", () => {
    // 各層を逆順にする shuffle。層境界は跨がないことを確認する
    const reverse = <T,>(a: T[]): T[] => [...a].reverse();
    const out = buildQuickSession(items, classify, items.length, reverse);
    expect(out.map((x) => x.id)).toEqual(["w2", "w1", "u2", "u1", "o2", "o1"]);
  });
});
