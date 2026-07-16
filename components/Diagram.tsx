/** 登場人物の関係図(SVG)。プロトタイプの Diagram と同一 */
import type { Diagram as DiagramData } from "@/types";
import { INK, CARD, AI_BLUE, MUTED, SERIF, SANS } from "@/lib/tokens";

/**
 * 長い辺ラベルを2行に折り返す。横書きの長いラベルが斜めの辺の線を
 * 横切って潰れるのを防ぐ。括弧付きなら括弧の前で分割する。
 */
function wrapLabel(label: string): string[] {
  if (label.length <= 8) return [label];
  const p = label.indexOf("(");
  if (p > 0) return [label.slice(0, p), label.slice(p)];
  return [label];
}

export function Diagram({ data }: { data: DiagramData }) {
  const R = 22;
  const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  // 図の重心。頂点(上側)ノードのサブラベルは中央へ食い込まないよう
  // ノードの上に出す(下に置くと枝やその中点ラベルと重なるため)
  const cy =
    data.nodes.reduce((acc, n) => acc + n.y, 0) / (data.nodes.length || 1);
  return (
    <svg
      viewBox="0 0 340 185"
      style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}
      role="img"
      aria-label="登場人物の関係図"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={AI_BLUE} />
        </marker>
      </defs>
      {data.edges.map((e, i) => {
        const a = nodeById[e.from];
        const b = nodeById[e.to];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len,
          uy = dy / len;
        const x1 = a.x + ux * (R + 4),
          y1 = a.y + uy * (R + 4);
        const x2 = b.x - ux * (R + 8),
          y2 = b.y - uy * (R + 8);
        const mx = (x1 + x2) / 2,
          my = (y1 + y2) / 2;
        // ラベルは線分に対して垂直・上側(斜めの線では外側)へ逃がす。
        // 頂点を共有する枝どうしでラベルが中央に寄って重なるのを防ぐ
        let px = -uy,
          py = ux;
        if (py > 0) {
          px = -px;
          py = -py;
        }
        const LABEL_OFFSET = 11;
        const lx = mx + px * LABEL_OFFSET,
          ly = my + py * LABEL_OFFSET;
        const lines = wrapLabel(e.label);
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={AI_BLUE}
              strokeWidth="1.8"
              markerEnd="url(#arrow)"
              strokeDasharray={e.dashed ? "5 4" : "none"}
            />
            <text
              x={lx}
              y={ly - (lines.length - 1) * 6}
              textAnchor="middle"
              fontSize="11"
              fill={AI_BLUE}
              style={{
                fontFamily: SANS,
                paintOrder: "stroke",
                stroke: CARD,
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {lines.map((line, j) => (
                <tspan key={j} x={lx} dy={j === 0 ? 0 : 12}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      {data.nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={R} fill={CARD} stroke={INK} strokeWidth="1.6" />
          <text
            x={n.x}
            y={n.y + 6}
            textAnchor="middle"
            fontSize="17"
            fontWeight="700"
            fill={INK}
            style={{ fontFamily: SERIF }}
          >
            {n.label}
          </text>
          <text
            x={n.x}
            y={n.y < cy ? Math.max(n.y - R - 6, 12) : n.y + R + 15}
            textAnchor="middle"
            fontSize="10.5"
            fill={MUTED}
            style={{ fontFamily: SANS }}
          >
            {n.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}
