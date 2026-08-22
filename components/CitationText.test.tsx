// @vitest-environment jsdom
/**
 * citify(lib/citations.ts の索引を本文のタップ可能表記に変換する関数)のテスト。
 *
 * Codex レビュー(PR #221)指摘: 索引の境界チェックには正規表現の後読み
 * (lookbehind, `(?<!...)`)を使っているが、iOS 16.3以前のSafari等
 * 後読み未対応のブラウザでは `new RegExp(pattern, "g")` が例外を投げる。
 * ページ全体が描画不能になるのを防ぐため、パターンの構築に失敗したときは
 * 条文リンク無しの素のテキストとして表示する(fail-safe)ことを確認する。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { citify } from "./CitationText";
import type { CitationEntry } from "@/lib/citations";

const entry: CitationEntry = {
  key: "65条2項",
  line: { label: "2項", text: "監督処分の原文" },
  cite: "宅建業法65条2項",
  sectionHeading: "見出し",
};
const index = new Map<string, CitationEntry>([["65条2項", entry]]);

describe("citify", () => {
  it("正常なパターンでは条文表記を CitationButton に置き換える", () => {
    const onCite = vi.fn();
    const nodes = citify("これは65条2項の規定である。", index, "65条2項", onCite);
    render(<>{nodes}</>);
    expect(screen.getByRole("button", { name: /65条2項/ })).toBeInTheDocument();
  });

  it("パターンの構築が例外を投げるとき(未対応ブラウザを想定)は、素のテキストとして表示する(fail-safe)", () => {
    // 後読みをサポートしないブラウザでの `new RegExp` の失敗を、無効な正規表現構文で再現する
    const brokenPattern = "(?<!";
    const onCite = vi.fn();
    const nodes = citify("これは65条2項の規定である。", index, brokenPattern, onCite);
    expect(nodes).toBe("これは65条2項の規定である。");
    render(<div data-testid="out">{nodes}</div>);
    expect(screen.getByTestId("out").textContent).toBe("これは65条2項の規定である。");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
