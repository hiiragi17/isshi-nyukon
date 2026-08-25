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

  it("枝の参照先ノードIDが存在しないときは、欠けている旨を警告する(Codexレビュー指摘・PR #230 11回目)", () => {
    // yes/no は自由文字列で TypeScript では検出できないタイプミス等がありうる。
    // 以前はその枝を無警告で欠落させ、図が完全であるかのように見えてしまっていた
    const nodes: ReadingFlowData["nodes"] = [
      { id: "q1", kind: "question", text: "q1", yes: "missing-node", no: "t-no" },
      { id: "t-no", kind: "terminal", text: "t-no", positive: false },
    ];
    render(<ReadingFlow data={{ start: "q1", nodes }} />);
    expect(screen.getByText(/データに壊れた参照があるため/)).toBeInTheDocument();
  });

  it("枝の参照先ノードIDがすべて存在するときは、壊れた参照の警告を出さない", () => {
    render(<ReadingFlow data={flow} />);
    expect(screen.queryByText(/データに壊れた参照があるため/)).not.toBeInTheDocument();
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

  it("深い分岐でも、接続線の始点で親の違いを区別できる", () => {
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
    const startXs = connectors.map((p) => {
      const d = p.getAttribute("d")!;
      return Number(d.match(/^M ([\d.]+) /)![1]);
    });
    expect(new Set(startXs).size).toBeGreaterThan(1);
  });

  it("字下げは深さが増えるほど頭打ちにならず、視認できる間隔を保ちながら増え続ける(Codexレビュー指摘・PR #230 6・7回目)", () => {
    // 以前は一定の深さ(3)で字下げが完全に固定され、それより深い親子ペア
    // (実データの q-notice→q-delivery 相当)が同じx位置に描画されて接続線が
    // 重なっていた。反比例の減衰だけに直したところ、今度は深い段で間隔が
    // 接続線の太さ(1.2px)を下回り、結局また見分けがつかなくなった
    // (7回目。指摘どおり40段目で約0.42pxまで縮んでいた)。分岐しない一本道の
    // チェーンで、箱(rect)のx座標が深さを追うごとに、線の太さより十分大きい
    // 間隔(MIN_STEP=4px)を保ちながら増え続けることを確認する
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
    const { container } = render(<ReadingFlow data={{ start: "q0", nodes }} />);
    // DFS描画順は [質問i, 即終了(yes枝), 質問i+1(no枝), ...] の繰り返しなので、
    // 偶数インデックスが深さ0→40と1段ずつ増える本筋(質問0..39, 最後にt-end)になる
    const rects = Array.from(container.querySelectorAll("svg rect"));
    const mainChainXs = rects
      .filter((_, i) => i % 2 === 0)
      .map((r) => Number(r.getAttribute("x")));
    expect(mainChainXs.length).toBe(depth + 1);
    const MIN_VISIBLE_GAP = 4; // components/ReadingFlow.tsx の MIN_STEP と同じ値
    for (let i = 1; i < mainChainXs.length; i++) {
      expect(mainChainXs[i] - mainChainXs[i - 1]).toBeGreaterThanOrEqual(MIN_VISIBLE_GAP);
    }
  });

  it("字下げの上限を超える極端な深さでも、箱がviewBoxをはみ出さず最低限の幅を保つ(Codexレビュー指摘・PR #230 8回目)", () => {
    // 固定値(60)の字下げ上限は、wrapText が保証する最低文字数すら収まらない
    // ほど箱が狭くなる深さ(55〜60あたり)を許してしまい、ラベルが箱や
    // viewBox からはみ出しうる指摘。字下げの上限を「箱の最小幅」から逆算する
    // 方式に直したので、それより深い80段でも箱がviewBoxに収まることを確認する
    const depth = 80;
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
    const { container } = render(<ReadingFlow data={{ start: "q0", nodes }} />);
    const svg = container.querySelector("svg")!;
    const viewBoxWidth = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
    const rects = Array.from(container.querySelectorAll("svg rect"));
    expect(rects.length).toBeGreaterThan(0);
    for (const r of rects) {
      const x = Number(r.getAttribute("x"));
      const width = Number(r.getAttribute("width"));
      expect(x + width).toBeLessThanOrEqual(viewBoxWidth);
      // wrapText の最低文字数(4文字)ぶんのラベル幅+左右パディングが入る最低限の幅。
      // 質問ノードの「?」は折返し対象の文字列に最初から含まれる(layoutRows参照)ため、
      // 折返し後に別枠で確保する必要はない
      expect(width).toBeGreaterThanOrEqual(4 * 12 * 1.05 + 10 * 2 - 1); // 端数の丸め誤差を許容
    }
  });

  it("質問ノードの「?」は折返し前の文字列に含めて折り返し、箱からはみ出させない(Codexレビュー指摘・PR #230 10回目)", () => {
    // 折返し後に「?」を別途付け足す方式だと、最終行がちょうど maxChars 文字で
    // 埋まっているときに「?」の分だけ箱の内側幅をはみ出しうった。各行の各tspanの
    // 文字数が、その行の箱の実際の幅から計算できる最大文字数を超えないことを確認する
    const depth = 80;
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
    const { container } = render(<ReadingFlow data={{ start: "q0", nodes }} />);
    const rowGroups = Array.from(container.querySelectorAll("svg > g")).filter(
      (g) => g.getAttribute("aria-hidden") !== "true",
    );
    expect(rowGroups.length).toBeGreaterThan(0);
    for (const g of rowGroups) {
      const rect = g.querySelector("rect")!;
      const width = Number(rect.getAttribute("width"));
      // components/ReadingFlow.tsx の layoutRows と同じ式(BOX_H_PAD=10, FONT_SIZE=12, MIN_CONTENT_CHARS=4)
      const maxChars = Math.max(4, Math.floor((width - 10 * 2) / (12 * 1.05)));
      const tspans = Array.from(g.querySelectorAll("tspan"));
      for (const tspan of tspans) {
        expect(tspan.textContent!.length).toBeLessThanOrEqual(maxChars);
      }
    }
  });

  it("字下げの上限を超える深さでは、親子関係を区別できない可能性を警告する(Codexレビュー指摘・PR #230 9回目)", () => {
    // MAX_INDENT_DEPTH(現在54)を超える深さでは字下げが完全に頭打ちになり、
    // それより深い親子ペアが同じx位置(=同じ接続線のレーン)に描画されて
    // 区別できなくなる。以前は無警告だったため、図が完全であるかのように見えた
    const depth = 60;
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
    expect(screen.getByText(/正確な階層は下の文字表示で確認してください/)).toBeInTheDocument();
  });

  it("字下げの上限を超えないときは、階層についての警告を出さない", () => {
    render(<ReadingFlow data={flow} />);
    expect(screen.queryByText(/正確な階層は下の文字表示で確認してください/)).not.toBeInTheDocument();
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
