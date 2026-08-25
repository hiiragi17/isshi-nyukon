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

  it("深く再合流するDAGでも行数を打ち切り、フリーズせず描画する(Codexレビュー指摘・PR #230)", () => {
    // 各段の質問ノードは yes/no とも次の段の同じノードを指す「合流」を20段重ねる。
    // 経路を打ち切らずに展開すると 2^20 通り(100万件超)の行が生成されうる構造
    const depth = 20;
    const nodes: ReadingFlowData["nodes"] = [];
    for (let i = 0; i < depth; i++) {
      nodes.push({
        id: `q${i}`,
        kind: "question",
        text: `質問${i}`,
        yes: i === depth - 1 ? "t" : `q${i + 1}`,
        no: i === depth - 1 ? "t" : `q${i + 1}`,
      });
    }
    nodes.push({ id: "t", kind: "terminal", text: "結論", positive: true });
    const start = performance.now();
    const { container } = render(<ReadingFlow data={{ start: "q0", nodes }} />);
    expect(performance.now() - start).toBeLessThan(3000);
    // 打ち切りにより、箱(rect)の数が現実的な範囲に収まっている
    expect(container.querySelectorAll("svg rect").length).toBeLessThan(1000);
    // 打ち切りが起きたことを画面上に警告する(Codexレビュー指摘・PR #230:
    // 打ち切りを示さないと、省略された結論があるのに完全な図であるかのように見えてしまう)
    expect(screen.getByText(/図を途中で打ち切っています/)).toBeInTheDocument();
  });

  it("打ち切りが起きないときは警告を出さない", () => {
    render(<ReadingFlow data={flow} />);
    expect(screen.queryByText(/図を途中で打ち切っています/)).not.toBeInTheDocument();
  });

  it("循環ではない正当な深いチェーン(30段超)は打ち切らず全体を描画する(Codexレビュー指摘・PR #230 2回目)", () => {
    // 分岐せず一本道で40段続くチェーン。以前の深さ上限(30)だと循環でなくても
    // 無警告で打ち切られていた。合流が無いので行数は少なく MAX_ROWS にも掛からない
    const depth = 40;
    const nodes: ReadingFlowData["nodes"] = [];
    for (let i = 0; i < depth; i++) {
      nodes.push({
        id: `q${i}`,
        kind: "question",
        text: `質問${i}`,
        yes: "t-shortcut",
        no: i === depth - 1 ? "t-end" : `q${i + 1}`,
      });
    }
    nodes.push({ id: "t-shortcut", kind: "terminal", text: "即終了", positive: false });
    nodes.push({ id: "t-end", kind: "terminal", text: "最後まで到達", positive: true });
    render(<ReadingFlow data={{ start: "q0", nodes }} />);
    expect(screen.getAllByText(/質問39/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("最後まで到達").length).toBeGreaterThan(0);
    expect(screen.queryByText(/図を途中で打ち切っています/)).not.toBeInTheDocument();
  });

  it("SVGは各行(ルート以外)に親とつなぐ接続線を1本ずつ持つ", () => {
    // 5行(q1, q2, q2のyes配下t-no, q2のno配下t-yes, q1のno配下t-no)のうちルート以外の4本
    const { container } = render(<ReadingFlow data={flow} />);
    const connectors = container.querySelectorAll("svg > g[aria-hidden='true'] > path");
    expect(connectors.length).toBe(4);
  });

  it("字下げが頭打ちになる深さ(depth>=3)でも、接続線の始点で親の違いを区別できる(Codexレビュー指摘・PR #230 5回目)", () => {
    // q3(depth2, x=32) の子 q4(depth3) と、q4(depth3, x=48) の子 t-c(depth4) は
    // どちらも字下げの上限で x=48 に描画される。接続線が無いと同じ位置に見えて
    // 親が違うことが伝わらない。接続線の始点xが異なることで区別できることを確認する
    const nodes: ReadingFlowData["nodes"] = [
      { id: "q1", kind: "question", text: "q1", yes: "q2", no: "t-out" },
      { id: "q2", kind: "question", text: "q2", yes: "t-a", no: "q3" },
      { id: "q3", kind: "question", text: "q3", yes: "q4", no: "t-b" },
      { id: "q4", kind: "question", text: "q4", yes: "t-c", no: "t-d" },
      { id: "t-out", kind: "terminal", text: "t-out", positive: false },
      { id: "t-a", kind: "terminal", text: "t-a", positive: false },
      { id: "t-b", kind: "terminal", text: "t-b", positive: false },
      { id: "t-c", kind: "terminal", text: "t-c", positive: true },
      { id: "t-d", kind: "terminal", text: "t-d", positive: false },
    ];
    const { container } = render(<ReadingFlow data={{ start: "q1", nodes }} />);
    const connectors = Array.from(
      container.querySelectorAll("svg > g[aria-hidden='true'] > path"),
    );
    expect(connectors.length).toBe(nodes.length - 1);
    // 各接続線の始点x(親のx+4)を抽出する
    const startXs = connectors.map((p) => {
      const d = p.getAttribute("d")!;
      return Number(d.match(/^M ([\d.]+) /)![1]);
    });
    // q4(depth3, 親q3はdepth2)への接続線の始点xと、t-c(depth4, 親q4はdepth3)への
    // 接続線の始点xは異なる(親の実際の深さが違うため)。ユニークな始点xが複数あることで、
    // 字下げが頭打ちになっていても接続線側で親の違いを表現できていることを確認する
    expect(new Set(startXs).size).toBeGreaterThan(1);
  });

  it("テキスト代替は実際の<ul><li>のネストで階層を表す(Codexレビュー指摘・PR #230 4回目)", () => {
    // CSSの字下げだけだと、q2 の全枝を辿ったあとの「No →」が q1 への回答だと
    // スクリーンリーダー利用者に伝わらない。実際のDOMネストで検証する
    const { container } = render(<ReadingFlow data={flow} />);
    const rootList = container.querySelector("details ul[role='list']");
    expect(rootList).toBeTruthy();

    const rootItems = rootList!.querySelectorAll(":scope > li");
    expect(rootItems.length).toBe(1); // ルートは q1 の1件だけ

    const q1Children = rootItems[0].querySelector(":scope > ul[role='list']");
    const q1ChildItems = q1Children!.querySelectorAll(":scope > li");
    expect(q1ChildItems.length).toBe(2); // q1 の直接の子は q2(yes)と t-no(no)の2件

    // 2番目の子(q1のno経路)が t-no であり、q2 のさらに下にネストされていない
    expect(q1ChildItems[1].textContent).toContain("クーリングオフはできない");

    // q2(1番目の子)配下の t-no は別のDOMノード(q1直下のt-noとは別物)
    const q2Children = q1ChildItems[0].querySelector(":scope > ul[role='list']");
    const tNoUnderQ2 = q2Children!.querySelectorAll(":scope > li")[0];
    expect(tNoUnderQ2).not.toBe(q1ChildItems[1]);
  });
});
