import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Diagram } from "./Diagram";
import { QUESTIONS as questions } from "@/data/questions";
import type { Diagram as DiagramData } from "@/types";

/** viewBox の高さを描画結果から読む */
function heightOf(data: DiagramData): number {
  const m = renderToStaticMarkup(<Diagram data={data} />).match(
    /viewBox="0 0 340 (\d+(?:\.\d+)?)"/,
  );
  if (!m) throw new Error("viewBox が見つからない");
  return Number(m[1]);
}

const node = (id: string, y: number) => ({ id, x: 100, y, label: id, sub: "x" });

describe("Diagram の viewBox 高さ", () => {
  it("ノードの最大 y が 145 以下なら従来どおり 185", () => {
    expect(heightOf({ nodes: [node("A", 45), node("B", 145)], edges: [] })).toBe(185);
  });

  it("ノードの最大 y が 145 を超えたら、下のサブラベルまで収まるよう広げる", () => {
    expect(heightOf({ nodes: [node("A", 45), node("B", 220)], edges: [] })).toBe(260);
  });

  it("登録済みのどの図でも、ノードとサブラベルが viewBox に収まる", () => {
    for (const q of questions) {
      if (!q.diagram) continue;
      const d = q.diagram;
      const h = heightOf(d);
      const cy = d.nodes.reduce((a, n) => a + n.y, 0) / d.nodes.length;
      for (const n of d.nodes) {
        const bottom = n.y < cy ? n.y + 22 : n.y + 37 + 3;
        expect(bottom, `${q.id} ${n.id}`).toBeLessThanOrEqual(h);
      }
    }
  });
});
