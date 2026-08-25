/**
 * 判定フロー図(要件を順に潰す図・Issue #220)。質問ノード(Yes/No分岐)と
 * 終端ノード(結論)からなる有向非巡回グラフを、開始ノードからの深さ優先順で
 * 縦に並べて描く(390px幅に収め、横スクロールさせない)。
 *
 * 図は本文の要約であって要件の全部ではないため、常にその旨を画面上に明示する。
 * 判定ノードは本文の該当セクションへのリンク(`sectionIndex`)を持てる —— 図だけで
 * 判定を完結させず、詳細は本文に委ねる設計(#214 の方針・#220 の対策)。
 *
 * 外部画像は使わず(PWAのオフライン対応・拡大時のぼやけ・トークン色が効かない、の
 * 3点から)インライン SVG で実装する(`Diagram` と同じ考え方)。SVG は
 * `role="img"` の視覚表現とし、実際のキーボード操作・スクリーンリーダー向けの
 * ナビゲーションはテキスト代替側(下部の折りたたみ)の実 DOM ボタンが担う。
 */
import type { ReadingFlow as ReadingFlowData, ReadingFlowNode } from "@/types";
import { INK, CARD, AI_BLUE, SHU, MUTED, SANS, SERIF } from "@/lib/tokens";

const VIEW_WIDTH = 340;
const LEFT_MARGIN = 8;
const RIGHT_MARGIN = 8;
const TOP_MARGIN = 8;
const BOTTOM_MARGIN = 8;
const INDENT_STEP = 16;
const MAX_INDENT_DEPTH = 3;
const FONT_SIZE = 12;
const LINE_HEIGHT = 15;
const BOX_V_PAD = 8;
const BOX_H_PAD = 10;
const BOX_MIN_HEIGHT = 30;
const BRANCH_TAG_HEIGHT = 16;
const ROW_GAP = 8;
/**
 * 経路ごとに展開する行数の上限(fail-safe)。DAGの合流を経路ごとに描画する方式は、
 * 深く繰り返し再合流するグラフだと行数が経路数(最悪 2^深さ)に比例して増える
 * (Codex レビュー指摘・PR #230)。循環参照は `visit` の `path`(現在の経路上の
 * ノードID集合)で検出して止めるため、深さそのものに別途上限は設けない
 * ——深さ専用の上限は、正当な深いチェーン(循環ではない)を無警告で打ち切って
 * しまう副作用があった(Codex レビュー指摘・PR #230 2回目)。単一チェーンでも
 * 行を積むたびにしか再帰しないため、再帰の深さは実質この行数上限で抑えられる。
 * 想定する読み物の判定フローは数問〜十数問程度なので、この上限に余裕はある
 */
const MAX_ROWS = 300;

type FlowRow = {
  node: ReadingFlowNode;
  depth: number;
  branch: "yes" | "no" | null;
};

/** 開始ノードから深さ優先で辿り、表示順の行に平らにする。同じ終端に複数の経路から
 * 到達する(DAGの合流)ときは、経路ごとに複数回出てくる —— ASCIIの判定フローと同じ表現 */
function flattenFlow(data: ReadingFlowData): { rows: FlowRow[]; truncated: boolean } {
  const byId = new Map(data.nodes.map((n) => [n.id, n] as const));
  const rows: FlowRow[] = [];
  let truncated = false;
  const visit = (id: string, depth: number, branch: "yes" | "no" | null, path: Set<string>) => {
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      return;
    }
    const node = byId.get(id);
    if (!node || path.has(id)) return;
    rows.push({ node, depth, branch });
    if (node.kind === "question") {
      const nextPath = new Set(path).add(id);
      visit(node.yes, depth + 1, "yes", nextPath);
      visit(node.no, depth + 1, "no", nextPath);
    }
  };
  visit(data.start, 0, null, new Set());
  return { rows, truncated };
}

function boxX(depth: number): number {
  return LEFT_MARGIN + Math.min(depth, MAX_INDENT_DEPTH) * INDENT_STEP;
}
function boxWidth(depth: number): number {
  return VIEW_WIDTH - boxX(depth) - RIGHT_MARGIN;
}

/** 半角スペース等の区切りが無い日本語向けの単純な折返し(文字数ベース) */
function wrapText(text: string, maxChars: number): string[] {
  if (maxChars <= 0 || text.length <= maxChars) return [text];
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    lines.push(text.slice(i, i + maxChars));
  }
  return lines;
}

type LaidOutRow = FlowRow & {
  lines: string[];
  x: number;
  width: number;
  boxHeight: number;
  y: number; // ブランチタグを含む行全体の開始y
  boxY: number; // 箱自体の開始y(ブランチタグの下)
};

function layoutRows(rows: FlowRow[]): { laid: LaidOutRow[]; height: number } {
  let cursor = TOP_MARGIN;
  const laid: LaidOutRow[] = rows.map((row, i) => {
    const x = boxX(row.depth);
    const width = boxWidth(row.depth);
    const maxChars = Math.max(4, Math.floor((width - BOX_H_PAD * 2) / (FONT_SIZE * 1.05)));
    const lines = wrapText(row.node.text, maxChars);
    const boxHeight = Math.max(BOX_MIN_HEIGHT, lines.length * LINE_HEIGHT + BOX_V_PAD * 2);
    const y = cursor + (i === 0 ? 0 : ROW_GAP);
    const boxY = y + (row.branch ? BRANCH_TAG_HEIGHT : 0);
    cursor = boxY + boxHeight;
    return { ...row, lines, x, width, boxHeight, y, boxY };
  });
  return { laid, height: cursor + BOTTOM_MARGIN };
}

function nodeColor(node: ReadingFlowNode): string {
  if (node.kind === "question") return AI_BLUE;
  return node.positive ? INK : SHU;
}

/** テキスト代替(折りたたみ)の1行。判定ノードは sectionIndex があればボタンにする */
function FlowTextRow({
  row,
  onJumpToSection,
}: {
  row: FlowRow;
  onJumpToSection?: (index: number) => void;
}) {
  const color = nodeColor(row.node);
  const branchLabel = row.branch === "yes" ? "Yes" : row.branch === "no" ? "No" : null;
  const sectionIndex = row.node.kind === "question" ? row.node.sectionIndex : undefined;
  const canJump = sectionIndex !== undefined && !!onJumpToSection;
  const content =
    row.node.kind === "question" ? `${row.node.text}?` : row.node.text;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        paddingLeft: Math.min(row.depth, MAX_INDENT_DEPTH) * 14,
        minHeight: 32,
      }}
    >
      {branchLabel && (
        <span
          style={{
            flexShrink: 0,
            fontFamily: SANS,
            fontSize: 10.5,
            fontWeight: 700,
            color: AI_BLUE,
          }}
        >
          {branchLabel} →
        </span>
      )}
      {canJump ? (
        <button
          type="button"
          onClick={() => onJumpToSection!(sectionIndex!)}
          style={{
            minHeight: 44,
            padding: "4px 8px",
            background: "none",
            border: `1px solid ${color}`,
            borderRadius: 4,
            color,
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 700,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {content}
        </button>
      ) : (
        <span style={{ fontFamily: SANS, fontSize: 12, color, fontWeight: row.node.kind === "terminal" ? 700 : 400 }}>
          {content}
        </span>
      )}
    </div>
  );
}

export function ReadingFlow({
  data,
  onJumpToSection,
}: {
  data: ReadingFlowData;
  onJumpToSection?: (index: number) => void;
}) {
  const { rows, truncated } = flattenFlow(data);
  if (rows.length === 0) return null;
  const { laid, height } = layoutRows(rows);
  const rootText = rows[0].node.kind === "question" ? `${rows[0].node.text}?` : rows[0].node.text;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}
        role="img"
        aria-label={`判定フロー図: ${rootText} から始まる判定順序(本文の要約)`}
      >
        {laid.map((row, i) => {
          const color = nodeColor(row.node);
          return (
            <g key={i}>
              {row.branch && (
                <text
                  x={row.x}
                  y={row.y + BRANCH_TAG_HEIGHT - 4}
                  fontSize="10.5"
                  fontWeight="700"
                  fill={AI_BLUE}
                  style={{ fontFamily: SANS }}
                >
                  {row.branch === "yes" ? "Yes →" : "No →"}
                </text>
              )}
              <rect
                x={row.x}
                y={row.boxY}
                width={row.width}
                height={row.boxHeight}
                rx={6}
                fill={CARD}
                stroke={color}
                strokeWidth={row.node.kind === "terminal" ? 1.8 : 1.4}
              />
              <text
                x={row.x + BOX_H_PAD}
                y={row.boxY + BOX_V_PAD + FONT_SIZE - 1}
                fontSize={FONT_SIZE}
                fontWeight={row.node.kind === "terminal" ? 700 : 400}
                fill={row.node.kind === "terminal" ? color : INK}
                style={{ fontFamily: row.node.kind === "terminal" ? SERIF : SANS }}
              >
                {row.lines.map((line, li) => (
                  <tspan key={li} x={row.x + BOX_H_PAD} dy={li === 0 ? 0 : LINE_HEIGHT}>
                    {row.node.kind === "question" && li === row.lines.length - 1 ? `${line}?` : line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ margin: "6px 0 0", fontSize: 10.5, color: MUTED, lineHeight: 1.6 }}>
        この図は本文の要約であり、要件の全部ではありません。正確な要件は本文で確認してください。
      </p>
      {truncated && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
          分岐が多いため図を途中で打ち切っています。表示されていない結論がある可能性があります。
        </p>
      )}
      <details style={{ marginTop: 8 }}>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 700,
            color: AI_BLUE,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }}
        >
          文字で見る(判定順序の代替表示)
        </summary>
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((row, i) => (
            <FlowTextRow key={i} row={row} onJumpToSection={onJumpToSection} />
          ))}
        </div>
      </details>
    </div>
  );
}
