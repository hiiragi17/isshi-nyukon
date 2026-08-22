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

  it("法令名の接頭辞は、複数の剥がし方を試す(施行令つきの略称も、条名のみの表記も)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅地建物取引業法施行令3条の5",
            cite: "c",
            lines: [{ label: "本文", text: "政令で定める額は、千万円とする。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    // 「宅地建物取引業法」だけを剥がした「施行令3条の5」(本文が使う書き方)
    expect(index.get("施行令3条の5")?.line.text).toBe("政令で定める額は、千万円とする。");
    // 法令名を全部剥がした「3条の5」
    expect(index.get("3条の5")?.line.text).toBe("政令で定める額は、千万円とする。");
    // フルの表記もそのまま解決できる
    expect(index.get("宅地建物取引業法施行令3条の5")?.line.text).toBe("政令で定める額は、千万円とする。");
  });

  it("条文が1文だけで、唯一の行に label:'本文' が付く場合、無ラベル行と同様に条名だけでも解決できる", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅建業法施行規則3条",
            cite: "c",
            lines: [
              { label: "条見出し", text: "(見出し)" },
              { label: "本文", text: "免許の更新の申請期間の規定。" },
            ],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.get("施行規則3条")?.line.text).toBe("免許の更新の申請期間の規定。");
  });

  it("自己完結表記1行に「ただし、」で始まるただし書が含まれる場合、「ただし書」を付けた表記でも同じ行に解決できる", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            cite: "c",
            lines: [
              {
                label: "19条の2",
                text: "登録の移転の申請をすることができる。ただし、禁止の期間が満了していないときは、この限りでない。",
              },
            ],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.get("19条の2ただし書")?.line.text).toContain("登録の移転の申請");
  });

  it("自己完結表記1行に「ただし、」が含まれない場合、「ただし書」を付けた表記は登録しない", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            cite: "c",
            lines: [{ label: "9条", text: "変更の届出義務を定める。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(index.has("9条ただし書")).toBe(false);
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
    // citationPattern は "(?:alt1|alt2|...)(?!境界)" の形にラップされるため、
    // 中の選言部分だけを取り出して長さ順を確認する
    const inner = citationPattern(index).replace(/^\(\?:/, "").replace(/\)\(\?!.*\)$/, "");
    const parts = inner.split("|");
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

  it("条名なしの「N項」表記は、同じ Reading 内で唯一の条文しか使っていなければ登録する", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "テスト法1条",
            cite: "c",
            lines: [{ label: "3項", text: "唯一の3項。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(resolveCitation(index, "3項")?.line.text).toBe("唯一の3項。");
  });

  it("条名なしの「N項」表記は、複数の条文が同じ項番号を持つときは登録しない(曖昧な解決を避ける)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h1",
          body: [],
          quote: {
            article: "テスト法1条",
            cite: "c1",
            lines: [{ label: "1項柱書", text: "テスト法1条の1項。" }],
          },
        },
        {
          heading: "h2",
          body: [],
          quote: {
            article: "テスト法施行規則1条",
            cite: "c2",
            lines: [{ label: "1項", text: "施行規則1条の1項。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    // ラベルの表記としては「1項」は1回しか出てこないが、実際には2つの条文にまたがる
    // 項番号なので、素の「1項」は登録しない。条名つきなら解決できる
    expect(index.has("1項")).toBe(false);
    expect(resolveCitation(index, "テスト法1条1項")?.line.text).toBe("テスト法1条の1項。");
    expect(resolveCitation(index, "テスト法施行規則1条1項")?.line.text).toBe("施行規則1条の1項。");
  });

  it("条名なしの「N項」表記は、直前に「条」「第」や数字があると別条文の一部として扱いマッチしない", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "テスト法1条",
            cite: "c",
            lines: [{ label: "5項", text: "唯一の5項。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index), "g");
    expect("(5項)を見よ".match(re)?.[0]).toBe("5項");
    expect("35条5項を見よ".match(re)).toBeNull();
    expect("第5項までを見よ".match(re)).toBeNull();
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

describe("号の漢数字/算用数字の表記ゆれと、より長い(索引に無い)参照への誤爆防止", () => {
  it("漢数字の号(label由来)は算用数字表記でも解決できる(79条二号 → 79条2号)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            cite: "c",
            lines: [{ label: "79条二号", text: "無免許事業の罰則。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    expect(resolveCitation(index, "79条二号")!.line.text).toBe("無免許事業の罰則。");
    expect(resolveCitation(index, "79条2号")!.line.text).toBe("無免許事業の罰則。");
  });

  it("article+label 連結で作った漢数字キーも算用数字で解決できる(68条の2第1項四号 → 68条の2第1項4号)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            article: "宅建業法68条の2",
            cite: "c",
            lines: [{ label: "1項", text: "登録消除しなければならない。" }, { label: "1項四号", text: "必要的消除の号。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index));
    // 索引には漢数字由来の "68条の2第1項四号" と、その親paragraphの "68条の2第1項" の
    // 両方が登録されるが、本文が算用数字で "68条の2第1項4号" と書いても、
    // 短い方の "68条の2第1項" に食われず、4号の行まで正しく解決できる
    const match = "68条の2第1項4号は必要的消除の号。".match(re);
    expect(match![0]).toBe("68条の2第1項4号");
    expect(resolveCitation(index, match![0])!.line.text).toBe("必要的消除の号。");
  });

  it("索引のキーが、無関係な長い表記の先頭部分に一致するだけのときはマッチしない(第3号 が 第3 に食われない)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            cite: "c",
            lines: [{ label: "第3", text: "代理の報酬額。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index));
    // 「平成13年国総動第3号」は無関係な告示番号で、報酬告示 第3 への参照ではない
    expect("平成13年国総動第3号を参照する。".match(re)).toBeNull();
    // 一方、素の「告示第3により」は正しくヒットする
    expect("告示第3により算出する。".match(re)![0]).toBe("第3");
  });

  it("範囲を表す「〜」が続くときはマッチしない(第2〜第10 の 第2 だけを開いてしまわない)", () => {
    const reading = makeReading({
      sections: [
        {
          heading: "h",
          body: [],
          quote: {
            cite: "c",
            lines: [{ label: "第2", text: "媒介の報酬額の計算方法。" }],
          },
        },
      ],
    });
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index));
    // 「第2」は範囲の始点にすぎず、「第2〜第10」全体を指す表記なので開かない
    expect("第2〜第10の規定による".match(re)).toBeNull();
    // 単独の「第2」は正しくヒットする
    expect("第2の計算方法により".match(re)![0]).toBe("第2");
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

  // レビュー(PR #221)で実在が確認された、階層的な項/号の参照が本文にあるケース。
  // 「柱書」「N項柱書」「漢数字の号」等、label だけでは項の文脈が失われる表記を、
  // 本文の書き方(例: 34条の2第1項・64条の9第1項1号)でも解決できることを確認する
  it.each([
    ["q4", "37条の2第1項本文", "宅地建物取引業者が自ら売主となる"],
    ["q4", "16条の5第1号ロ", "分譲を案内所"],
    ["q32", "64条の9第1項1号", "加入しようとする者"],
    ["q12", "35条1項柱書", "宅地若しくは建物の売買"],
    ["q12", "35条9号", "損害賠償額の予定"],
    ["q15", "5条1項", "免許を受けようとする者が次の各号"],
    ["q14", "34条の2第1項", "媒介の契約"],
    ["q5", "第7", "低廉な空家等"],
    ["q5", "第8", "低廉な空家等の売買又は交換の代理"],
    ["q17", "施行令3条の5", "政令で定める額は、千万円"],
    ["q16", "19条の2ただし書", "登録を受けている者は"],
    ["q5", "第3ただし書", "代理に関して依頼者から受ける"],
  ])("%s 本文の「%s」が該当行に解決される", (topicId, surface, expectedSubstring) => {
    const reading = READINGS.get(topicId)!;
    const index = buildCitationIndex(reading);
    const entry = resolveCitation(index, surface);
    expect(entry, `${topicId}: ${surface}`).toBeDefined();
    expect(entry!.line.text).toContain(expectedSubstring);
  });

  it("報酬額の制限(q5)本文の「告示第11条2項」(丸数字②を指す)が該当行に解決される", () => {
    const reading = READINGS.get("q5")!;
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index), "g");
    const body = reading.sections.flatMap((s) => s.body).join("\n");
    expect(body).toContain("告示第11条2項");
    const matches = [...body.matchAll(re)].map((m) => m[0]);
    expect(matches).toContain("第11条2項");
    const entry = resolveCitation(index, "第11条2項")!;
    expect(entry.line.text).toContain("消費税を納める義務を免除される");
  });

  it("q34 本文の「68条の2第1項4号」(算用数字)は 1項四号 の行(必要的消除)に解決される", () => {
    const reading = READINGS.get("q34")!;
    const index = buildCitationIndex(reading);
    const re = new RegExp(citationPattern(index), "g");
    const body = reading.sections.flatMap((s) => s.body).join("\n");
    expect(body).toContain("68条の2第1項4号");
    const matches = [...body.matchAll(re)].map((m) => m[0]);
    expect(matches).toContain("68条の2第1項4号");
    const entry = resolveCitation(index, "68条の2第1項4号")!;
    expect(entry.line.text).toContain("情状が特に重いとき");
  });

  it("報酬額の制限(q5)本文の「国総動第3号」は無関係な告示番号なので、報酬告示 第3 として誤爆しない", () => {
    const reading = READINGS.get("q5")!;
    const index = buildCitationIndex(reading);
    const body = reading.sections.flatMap((s) => s.body).join("\n");
    expect(body).toContain("国総動第3号");
    const idx = body.indexOf("国総動第3号");
    const around = body.slice(idx, idx + "国総動第3号".length + 2);
    const matches = [...around.matchAll(new RegExp(citationPattern(index), "g"))].map((m) => m[0]);
    expect(matches).not.toContain("第3");
  });

  // Codex レビュー(PR #221)指摘: cooling-off.ts は 37条の2 だけを扱うため、
  // 本文の「(3項)」「(4項)」「(1項後段)」のような条名なしの参照も
  // 曖昧さなく解決できるはず、という指摘への対応
  it.each([
    ["q4", "1項後段", "損害賠償又は違約金の支払"],
    ["q4", "3項", "手付金その他の金銭を返還"],
    ["q4", "4項", "特約で申込者等に不利なもの"],
  ])("クーリングオフ(q4)本文の条名なし表記「%s」が解決される", (_topicId, surface, expectedSubstring) => {
    const reading = READINGS.get("q4")!;
    const index = buildCitationIndex(reading);
    const entry = resolveCitation(index, surface);
    expect(entry, surface).toBeDefined();
    expect(entry!.line.text).toContain(expectedSubstring);
  });

  it("媒介契約(q14)は 34条の2 と施行規則15条の10 の両方が「1項」を持つため、素の「1項」は登録しない(曖昧な参照を誤って解決しない)", () => {
    const reading = READINGS.get("q14")!;
    const index = buildCitationIndex(reading);
    expect(index.has("1項")).toBe(false);
    expect(index.has("2項")).toBe(false);
    // 34条の2 にしか無い項は、素のままでも一意に解決できる
    expect(resolveCitation(index, "3項")?.line.text).toContain("専任媒介契約");
  });

  it("監督処分・罰則(q34)本文の「16条の15第3項から第5項まで」は、無関係な条文の範囲参照なので誤って「5項」に解決しない", () => {
    const reading = READINGS.get("q34")!;
    const index = buildCitationIndex(reading);
    const body = reading.sections.flatMap((s) => s.body).join("\n");
    expect(body).toContain("16条の15第3項から第5項まで");
    const idx = body.indexOf("16条の15第3項から第5項まで");
    const around = body.slice(idx, idx + "16条の15第3項から第5項まで".length);
    const matches = [...around.matchAll(new RegExp(citationPattern(index), "g"))].map((m) => m[0]);
    expect(matches).toEqual([]);
  });

  it("媒介契約(q14)本文の「35条5項・37条3項」は、別条文への参照なので誤って q14 自身の 5項/3項 に解決しない", () => {
    const reading = READINGS.get("q14")!;
    const index = buildCitationIndex(reading);
    const body = reading.sections.flatMap((s) => s.body).join("\n");
    expect(body).toContain("35条5項・37条3項");
    const idx = body.indexOf("35条5項・37条3項");
    const around = body.slice(idx, idx + "35条5項・37条3項".length);
    const matches = [...around.matchAll(new RegExp(citationPattern(index), "g"))].map((m) => m[0]);
    expect(matches).toEqual([]);
  });

  it.each([
    ["q5", "第2〜第10"],
    ["q5", "第7〜第10"],
    ["q16", "18条1項1号〜8号"],
    ["q16", "9号〜11号"],
  ])(
    "%s 本文の範囲表記「%s」は、範囲の始点だけを単体の参照として開かない",
    (topicId, rangeText) => {
      const reading = READINGS.get(topicId)!;
      const index = buildCitationIndex(reading);
      const body = reading.sections.flatMap((s) => s.body).join("\n");
      expect(body, `${topicId} に "${rangeText}" が無い`).toContain(rangeText);
      const idx = body.indexOf(rangeText);
      const around = body.slice(idx, idx + rangeText.length);
      const matches = [...around.matchAll(new RegExp(citationPattern(index), "g"))].map((m) => m[0]);
      expect(matches).toEqual([]);
    },
  );
});
