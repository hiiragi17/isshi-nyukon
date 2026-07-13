/**
 * lib/terms.ts のユニットテスト。
 * 用語辞書は「配列+エイリアス方式・最長一致マッチ」(既決事項)。
 * 定義文そのものはプロトタイプ準拠のレビュー済み文言のため、
 * テストは辞書を読むだけで内容には触れない。
 */
import { describe, it, expect } from "vitest";
import { TERM_PATTERN, termDef } from "@/lib/terms";
import { TERMS } from "@/data/terms";

describe("termDef — 表記から定義を引く", () => {
  it("word でヒットする", () => {
    const t = TERMS.find((t) => t.word === "登記")!;
    expect(termDef("登記")).toBe(t.def);
  });

  it("エイリアスでも本体と同じ定義を返す", () => {
    expect(termDef("レインズ")).toBe(termDef("指定流通機構"));
    expect(termDef("宅地建物取引士証")).toBe(termDef("宅建士証"));
    expect(termDef("履行の着手")).toBe(termDef("履行に着手"));
    expect(termDef("レインズ")).toBeDefined();
  });

  it("未登録の表記は undefined", () => {
    expect(termDef("存在しない用語")).toBeUndefined();
    expect(termDef("")).toBeUndefined();
  });

  it("辞書の全 word / 全 alias が引ける", () => {
    for (const t of TERMS) {
      expect(termDef(t.word)).toBe(t.def);
      for (const a of t.aliases ?? []) {
        expect(termDef(a)).toBe(t.def);
      }
    }
  });
});

describe("TERM_PATTERN — 最長一致のための選言パターン", () => {
  it("有効な正規表現として構築できる", () => {
    expect(() => new RegExp(TERM_PATTERN, "g")).not.toThrow();
  });

  it("表記が長い順に並んでいる(最長一致の前提)", () => {
    // 現データに正規表現メタ文字は無いため "|" で分解できる
    const parts = TERM_PATTERN.split("|");
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i - 1].length).toBeGreaterThanOrEqual(parts[i].length);
    }
  });

  it("パターン中のすべての表記が termDef で解決できる(辞書との整合)", () => {
    for (const part of TERM_PATTERN.split("|")) {
      expect(termDef(part)).toBeDefined();
    }
  });

  it("word だけでなくエイリアスもパターンに含まれる", () => {
    const parts = new Set(TERM_PATTERN.split("|"));
    expect(parts.has("レインズ")).toBe(true);
    expect(parts.has("指定流通機構")).toBe(true);
  });

  it("包含関係のある表記は長い方が優先してマッチする(最長一致)", () => {
    const re = () => new RegExp(TERM_PATTERN); // 状態を持たないよう毎回生成
    // 「善意」⊂「善意無過失」
    expect("善意無過失の第三者".match(re())![0]).toBe("善意無過失");
    // 「容積率」⊂「指定容積率」
    expect("指定容積率と比べる".match(re())![0]).toBe("指定容積率");
    // 「登記」⊂「所有権移転登記」
    expect("所有権移転登記を備えた".match(re())![0]).toBe("所有権移転登記");
    // 「媒介」⊂「専属専任媒介契約」
    expect("専属専任媒介契約を締結".match(re())![0]).toBe("専属専任媒介契約");
    // 単独の短い表記は普通にマッチする
    expect("善意の第三者".match(re())![0]).toBe("善意");
  });
});
