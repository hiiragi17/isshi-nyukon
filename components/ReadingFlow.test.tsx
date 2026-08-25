// @vitest-environment jsdom
/**
 * ReadingFlow(判定フロー図・Issue #220)のテスト。
 *
 * SVG のレイアウト計算そのものより、受け入れ条件に直結する挙動を固定する:
 * - DAG の合流(複数の経路から同じ終端に辿り着く)を描画できる
 * - 判定ノードから本文の該当セクションへ移動できる(sectionIndex 経由)
 * - 「本文の要約であって要件の全部ではない」旨が画面上に出る
 * - テキストによる代替(文字で見る)がある
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReadingFlow as ReadingFlowData } from "@/types";
import { ReadingFlow } from "./ReadingFlow";

/** クーリングオフの判定フローを単純化したテスト用データ。t-no に2経路から合流する */
const flow: ReadingFlowData = {
  start: "q1",
  nodes: [
    { id: "q1", kind: "question", text: "事務所等以外で申込みをした", yes: "q2", no: "t-no", sectionIndex: 1 },
    { id: "q2", kind: "question", text: "8日を経過した", yes: "t-no", no: "t-yes" },
    { id: "t-no", kind: "terminal", text: "クーリングオフはできない", positive: false },
    { id: "t-yes", kind: "terminal", text: "クーリングオフができる", positive: true },
  ],
};

describe("ReadingFlow", () => {
  it("DAGの合流を含む全経路をテキスト代替に描画する(t-noが複数回出る)", () => {
    render(<ReadingFlow data={flow} />);
    const occurrences = screen.getAllByText("クーリングオフはできない");
    // SVG側に1回 + テキスト代替側に2回(q1のno経路・q2のyes経路)
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("クーリングオフができる").length).toBeGreaterThanOrEqual(2);
  });

  it("sectionIndexを持つ質問ノードのボタンをクリックするとonJumpToSectionが呼ばれる", () => {
    const onJump = vi.fn();
    render(<ReadingFlow data={flow} onJumpToSection={onJump} />);
    const button = screen.getByRole("button", { name: /事務所等以外で申込みをした/ });
    button.click();
    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("sectionIndexが無い質問ノードはボタンにならない(誤ったリンクを作らない)", () => {
    const onJump = vi.fn();
    render(<ReadingFlow data={flow} onJumpToSection={onJump} />);
    expect(screen.queryByRole("button", { name: /8日を経過した/ })).not.toBeInTheDocument();
  });

  it("図が本文の要約であって要件の全部ではないことを明示する", () => {
    render(<ReadingFlow data={flow} />);
    expect(screen.getByText(/本文の要約であり、要件の全部ではありません/)).toBeInTheDocument();
  });

  it("SVGにrole=imgとaria-labelが付く", () => {
    render(<ReadingFlow data={flow} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toMatch(/判定フロー図/);
  });

  it("空のノード配列や存在しないstartのときは何も描画しない(fail-safe)", () => {
    const { container } = render(<ReadingFlow data={{ start: "missing", nodes: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
