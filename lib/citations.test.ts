/**
 * lib/citations.ts のユニットテスト。
 * 索引の作成・表記の解決・未ヒット時の素通し・法令名の有無どちらでも
 * 解決できること・見出し行を索引に載せないことを確認する(Issue #215)。
 */
import { describe, it, expect } from "vitest";
import { buildCitationIndex, citationPattern, resolveCitation } from "@/lib/citations";
import { READINGS } from "@/data/readings/index";
import type { Reading } from "@/types";

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    topicId: "test",
    category: "宅建業法",
    title: "テスト論点",
    law: "テスト法1条",
    sections: [],
    ...overrides,
  };
}

describe("buildCitationIndex — 索引の作成", () => {
  it("article + label を連結してキーを作る", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — テスト法65条",
          body: [],
          quote: {
            article: "テスト法65条",
            cite: "テスト法65条(全文)",
            lines: [{ label: "2項", text: "業務停止の規定。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("テスト法65条2項")).toBe(true);
    expect(index.get("テスト法65条2項")!.line.text).toBe("業務停止の規定。");
  });

  it("article の法令名を剥がした表記も別キーとして登録する(本文が法令名を省略するため)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — 宅建業法65条",
          body: [],
          quote: {
            article: "宅建業法65条",
            cite: "宅建業法65条(全文)",
            lines: [{ label: "2項", text: "業務停止の規定。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("宅建業法65条2項")).toBe(true);
    expect(index.has("65条2項")).toBe(true);
    expect(index.get("65条2項")!.line.text).toBe(index.get("宅建業法65条2項")!.line.text);
  });

  it("「第」を補った表記も登録する(64条の7第1項 のような書き方に対応)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — 宅建業法64条の7",
          body: [],
          quote: {
            article: "宅建業法64条の7",
            cite: "宅建業法64条の7(全文)",
            lines: [{ label: "1項", text: "供託の規定。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("64条の7第1項")).toBe(true);
    expect(index.has("64条の71項")).toBe(true);
  });

  it("label 自体が条番号を含む(自己完結する)ときは article なしでもそのままキーになる", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — 宅建業法69条・行政手続法13条",
          body: [],
          quote: {
            cite: "宅建業法69条・行政手続法13条(全文)",
            lines: [
              { label: "宅建業法69条1項", text: "聴聞の特例。" },
              { label: "行政手続法13条1項", text: "意見陳述の手続。" },
            ],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.get("宅建業法69条1項")!.line.text).toBe("聴聞の特例。");
    // 法令名を剥がした表記でも解決できる
    expect(index.get("69条1項")!.line.text).toBe("聴聞の特例。");
    expect(index.get("13条1項")!.line.text).toBe("意見陳述の手続。");
  });

  it("「見出し」で終わる label(条見出し等)は索引に載せない", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — テスト法65条",
          body: [],
          quote: {
            article: "テスト法65条",
            cite: "テスト法65条(全文)",
            lines: [
              { label: "条見出し", text: "(指示及び業務の停止)" },
              { label: "1項", text: "本文。" },
            ],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("テスト法65条条見出し")).toBe(false);
    expect(index.has("条見出し")).toBe(false);
    expect(index.has("テスト法65条1項")).toBe(true);
  });

  it("article が無く label も自己完結しないときは索引に載せない(fail-safe)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — 何かの条文",
          body: [],
          quote: {
            cite: "出典不明",
            lines: [{ label: "1項", text: "本文。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.size).toBe(0);
  });

  it("label が無い行は article そのものをキーにする(条文全体への参照)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "原文を読む — 宅建業法64条の15",
          body: [],
          quote: {
            article: "宅建業法64条の15",
            cite: "宅建業法64条の15(全文)",
            lines: [{ text: "社員の地位を失った場合の営業保証金の供託。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("宅建業法64条の15")).toBe(true);
    expect(index.has("64条の15")).toBe(true);
  });

  it("同じキーは先に登録されたエントリを優先する(後勝ちで上書きしない)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "第1ブロック",
          body: [],
          quote: {
            article: "テスト法1条",
            cite: "1つ目",
            lines: [{ label: "1項", text: "最初のエントリ。" }],
          },
        },
        {
          heading: "第2ブロック",
          body: [],
          quote: {
            article: "テスト法1条",
            cite: "2つ目",
            lines: [{ label: "1項", text: "後から来たエントリ。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.get("テスト法1条1項")!.line.text).toBe("最初のエントリ。");
  });
});

describe("citationPattern / resolveCitation — 表記の解決と未ヒット時の素通し", () => {
  it("有効な正規表現として構築できる", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅建業法65条の2",
            cite: "c",
            lines: [{ label: "1項", text: "t" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(() => new RegExp(citationPattern(index), "g")).not.toThrow();
  });

  it("表記が長い順に並んでいる(最長一致の前提)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅建業法68条の2",
            cite: "c1",
            lines: [{ label: "1項", text: "登録消除" }],
          },
        },
      ],
    });
    // 68条の2 と 68条 のように包含関係のあるキーが混ざる例を別ブロックで追加
    reading.sections.push({
      heading: "h2",
      body: [],
      quote: {
        article: "宅建業法68条",
        cite: "c2",
        lines: [{ label: "1項", text: "指示処分" }],
      },
    });
    const index = buildCitationIndex(reading);
    const parts = citationPattern(index).split("|");
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i - 1].length).toBeGreaterThanOrEqual(parts[i].length);
    }
  });

  it("包含関係のあるキーは長い方が優先してマッチする(68条の2 が 68条 に食われない)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅建業法68条の2",
            cite: "c1",
            lines: [{ label: "1項", text: "登録消除" }],
          },
        },
        {
          heading: "h2",
          body: [],
          quote: {
            article: "宅建業法68条",
            cite: "c2",
            lines: [{ label: "1項", text: "指示処分" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index));
    const match = "68条の2第1項の規定により".match(re);
    expect(match![0]).toBe("68条の2第1項");
  });

  it("索引にヒットした表記は該当行を返す", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "テスト法65条",
            cite: "c",
            lines: [{ label: "2項", text: "業務停止の規定。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(resolveCitation(index, "テスト法65条2項")?.line.text).toBe("業務停止の規定。");
  });

  it("索引に無い表記は undefined(呼び出し側で素通しする)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "テスト法65条",
            cite: "c",
            lines: [{ label: "2項", text: "業務停止の規定。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(resolveCitation(index, "存在しない条文")).toBeUndefined();
    expect(resolveCitation(index, "")).toBeUndefined();
  });

  it("quote の無いセクションだけの Reading は空の索引を作る", () => {
    const reading = makeReading({
      sections: [{ heading: "本文だけのセクション", body: ["条文の引用は無い。"] }],
    });
    const index = buildCitationIndex(reading);
    expect(index.size).toBe(0);
    expect(citationPattern(index)).toBe("");
  });
});

describe("実データ(READINGS)との整合", () => {
  it("既存の読み物すべてで、有効な正規表現の索引が作れる", () => {
    for (const [topicId, reading] of READINGS) {
      const index = buildCitationIndex(reading);
      expect(() => new RegExp(citationPattern(index), "g"), topicId).not.toThrow();
    }
  });

  it("索引の全キーが resolveCitation で解決できる(索引との整合)", () => {
    for (const [topicId, reading] of READINGS) {
      const index = buildCitationIndex(reading);
      for (const key of index.keys()) {
        expect(resolveCitation(index, key), `${topicId}: ${key}`).toBeDefined();
      }
    }
  });

  it("監督処分・罰則(q34)の本文にある「65条2項」がその行の原文に解決される", () => {
    const reading = READINGS.get("q34")!;
    const index = buildCitationIndex(reading);
    const entry = resolveCitation(index, "65条2項");
    expect(entry).toBeDefined();
    expect(entry!.line.text).toContain("一年以内の期間を定めて");
  });
});
