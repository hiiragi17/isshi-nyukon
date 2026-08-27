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
import { INK, CARD, AI_BLUE, SHU, MUTED, SANS, SERIF, LINE } from "@/lib/tokens";

const VIEW_WIDTH = 340;
const LEFT_MARGIN = 8;
const RIGHT_MARGIN = 8;
const TOP_MARGIN = 8;
const BOTTOM_MARGIN = 8;
const INDENT_STEP = 16;
/** 深さがこの段数までは字下げを1段そのままの幅で増やす。それ以降は下記 cumulativeIndent 参照 */
const FULL_INDENT_STEPS = 3;
const TEXT_INDENT_STEP = 14;
/**
 * 接続線の太さ(strokeWidth 1.2px)より十分大きい、隣り合う深さ同士の最小の字下げ差。
 * これを下回ると、接続線同士が視覚的にくっついて見分けられなくなる
 * (Codex レビュー指摘・PR #230 7回目: 減衰だけだと深さ16段目あたりから
 * 1.2px を下回り、40段目では約0.42pxまで縮んで実質見分けがつかなくなっていた)
 */
const MIN_STEP = 4;
const FONT_SIZE = 12;
const LINE_HEIGHT = 15;
const BOX_V_PAD = 8;
const BOX_H_PAD = 10;
const BOX_MIN_HEIGHT = 30;
const BRANCH_TAG_HEIGHT = 16;
const ROW_GAP = 8;
/** wrapText が保証する1行あたりの最低文字数(下記参照)と揃える */
const MIN_CONTENT_CHARS = 4;
/**
 * wrapText の最低文字数がはみ出さずに収まる、箱の最小の内側幅。質問ノードの
 * 「?」は折返し対象の文字列に最初から含める(layoutRows の displayText 参照)ため、
 * 折返し後に別枠で確保する必要はなく、MIN_CONTENT_CHARS 文字ぶんで足りる
 * (Codex レビュー指摘・PR #230 9・10回目: 折返し後に「?」を付け足す方式だと、
 * 最終行がちょうど収まっているときにはみ出しうった。付け足すのではなく
 * 最初から折返し対象に含める方式に直したので、幅の特別扱いは不要になった)
 */
const MIN_BOX_CONTENT_WIDTH = MIN_CONTENT_CHARS * FONT_SIZE * 1.05;
/**
 * 字下げを増やし続けてよい深さの上限。MIN_STEP で字下げし続けると、箱の幅が
 * wrapText の最低文字数(MIN_CONTENT_CHARS)すら収まらないほど狭くなり、
 * ラベルが箱からはみ出して 340px の viewBox の外まで出てしまう
 * (Codex レビュー指摘・PR #230 8回目: 固定値 60 は深さ55〜60あたりで
 * この条件を満たさなくなっていた)。箱の内側幅が MIN_BOX_CONTENT_WIDTH を
 * 下回らない最大の深さを、他の定数から逆算する(定数を変えても自動的に安全)
 */
const MAX_INDENT_DEPTH =
  FULL_INDENT_STEPS +
  Math.floor(
    (VIEW_WIDTH -
      LEFT_MARGIN -
      RIGHT_MARGIN -
      FULL_INDENT_STEPS * INDENT_STEP -
      MIN_BOX_CONTENT_WIDTH -
      BOX_H_PAD * 2) /
      MIN_STEP,
  );
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
function flattenFlow(
  data: ReadingFlowData,
): { rows: FlowRow[]; truncated: boolean; brokenRef: boolean; hasCycle: boolean; hasDuplicateIds: boolean } {
  // id の一意性は型では強制できない。同じidのノードが2つあると、後勝ちで
  // 片方が無言で握りつぶされ、意図と違う質問・結論が表示されてもどの警告も
  // 発火しない(Codex レビュー指摘・PR #230 13回目)。到達可能かに関わらず、
  // 全ノードを対象に重複を検出する
  const byId = new Map<string, ReadingFlowNode>();
  let hasDuplicateIds = false;
  for (const n of data.nodes) {
    if (byId.has(n.id)) hasDuplicateIds = true;
    byId.set(n.id, n);
  }
  const rows: FlowRow[] = [];
  let truncated = false;
  // yes/no は自由文字列なので、存在しないノードIDを指す誤り(タイプミス等)を
  // TypeScript は検出できない。以前はその枝を無警告で欠落させていたため、
  // 図・テキスト代替の両方が「完全に見えるが実は結論が抜けている」状態になり
  // うった(Codex レビュー指摘・PR #230 11回目)。他の欠落(MAX_ROWS)と同様、
  // 画面上に警告する
  let brokenRef = false;
  // path(現在の経路上のノードID集合)による循環検出も、無限再帰は防ぐが
  // その枝を無警告で切り落とすだけだった。DAGであるべきという前提が
  // 型では強制できない以上、誤って循環したデータも同じ枠組みで警告する
  // (Codex レビュー指摘・PR #230 12回目)
  let hasCycle = false;
  const visit = (id: string, depth: number, branch: "yes" | "no" | null, path: Set<string>) => {
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      return;
    }
    const node = byId.get(id);
    if (!node) {
      brokenRef = true;
      return;
    }
    if (path.has(id)) {
      hasCycle = true;
      return;
    }
    rows.push({ node, depth, branch });
    if (node.kind === "question") {
      const nextPath = new Set(path).add(id);
      visit(node.yes, depth + 1, "yes", nextPath);
      visit(node.no, depth + 1, "no", nextPath);
    }
  };
  visit(data.start, 0, null, new Set());
  return { rows, truncated, brokenRef, hasCycle, hasDuplicateIds };
}

/**
 * 深さ0から depth までの累積字下げ幅。最初の FULL_INDENT_STEPS 段は step の
 * フル幅で増やし、それより深い段(MAX_INDENT_DEPTH まで)は MIN_STEP を
 * 保証しながら増やし続ける。MAX_INDENT_DEPTH を超えたら増やすのをやめる。
 *
 * 以前は一定の深さで字下げを完全に固定していたため、それより深い親子ペアが
 * 同じx位置に描画され、SVGの接続線が重なってどの質問への回答か区別できな
 * かった(Codex レビュー指摘・PR #230 6回目。実データの `q-notice`→`q-delivery`
 * で発生)。そこで増分を反比例で減衰させる方式に変えたが、減衰だけだと深い
 * 段では MIN_STEP を割り込み、結局また見分けがつかなくなった(7回目)。
 * MAX_INDENT_DEPTH までは MIN_STEP を必ず確保することで、実際に想定する
 * 深さの範囲では確実に見分けがつくようにした
 */
function cumulativeIndent(depth: number, step: number): number {
  const d = Math.min(depth, MAX_INDENT_DEPTH);
  if (d <= FULL_INDENT_STEPS) return d * step;
  return FULL_INDENT_STEPS * step + (d - FULL_INDENT_STEPS) * MIN_STEP;
}

function boxX(depth: number): number {
  return LEFT_MARGIN + cumulativeIndent(depth, INDENT_STEP);
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
    const maxChars = Math.max(MIN_CONTENT_CHARS, Math.floor((width - BOX_H_PAD * 2) / (FONT_SIZE * 1.05)));
    // 質問ノードの「?」は折返し後に別途足すのではなく、折返し対象の文字列に
    // 最初から含める。折返し後に付け足す方式だと、最終行がちょうど maxChars
    // 文字で埋まっているときに「?」の分だけ箱からはみ出しうった
    // (Codex レビュー指摘・PR #230 10回目)
    const displayText = row.node.kind === "question" ? `${row.node.text}?` : row.node.text;
    const lines = wrapText(displayText, maxChars);
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
  if (node.positive === "conditional") return AI_BLUE;
  return node.positive ? INK : SHU;
}

/**
 * 各行の親行のインデックスを、DFS前順(深さ付き)から復元する。`buildFlowTree`
 * (テキスト代替のネスト構築)と同じ考え方の別実装 —— こちらは SVG 側で
 * 親子をつなぐ接続線を引くために使う。字下げだけでは、離れた行同士が
 * どの質問への回答かが分かりにくいため(Codex レビュー指摘・PR #230 5回目)
 */
function computeParentIndices(rows: FlowRow[]): (number | null)[] {
  const parents: (number | null)[] = [];
  const stack: number[] = [];
  rows.forEach((row, i) => {
    parents.push(row.depth > 0 ? (stack[row.depth - 1] ?? null) : null);
    stack[row.depth] = i;
    stack.length = row.depth + 1;
  });
  return parents;
}

type FlowTreeNode = { row: FlowRow; children: FlowTreeNode[] };

/**
 * 深さ優先順のフラットな行(rows)を、実際のネスト構造に組み直す。rows は
 * 既に DFS 前順(親の直後にその子が並ぶ)なので、深さの増減だけで親子関係を
 * 復元できる。テキスト代替を CSS の字下げだけの平らな行の並びにすると、
 * 深い分岐から戻った直後の「No →」がどの質問への回答かをスクリーンリーダー
 * 利用者が辿れない(Codex レビュー指摘・PR #230 4回目)。実際の `<ul>/<li>`
 * のネストで表現することで、リストの入れ子そのものが階層を伝える
 */
function buildFlowTree(rows: FlowRow[]): FlowTreeNode[] {
  const roots: FlowTreeNode[] = [];
  const stack: FlowTreeNode[] = [];
  for (const row of rows) {
    const node: FlowTreeNode = { row, children: [] };
    const parent = row.depth > 0 ? stack[row.depth - 1] : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack[row.depth] = node;
    stack.length = row.depth + 1;
  }
  return roots;
}

/** テキスト代替(折りたたみ)の1項目。判定ノードは sectionIndex があればボタンにする */
function FlowTextNode({
  node,
  onJumpToSection,
}: {
  node: FlowTreeNode;
  onJumpToSection?: (index: number) => void;
}) {
  const { row, children } = node;
  const color = nodeColor(row.node);
  const branchLabel = row.branch === "yes" ? "Yes" : row.branch === "no" ? "No" : null;
  const sectionIndex = row.node.kind === "question" ? row.node.sectionIndex : undefined;
  const canJump = sectionIndex !== undefined && !!onJumpToSection;
  const content = row.node.kind === "question" ? `${row.node.text}?` : row.node.text;
  // SVG側の字下げ(cumulativeIndent)と同じ考え方。頭打ちにせず、深いほど増分を小さくする
  const childIndent = cumulativeIndent(row.depth + 1, TEXT_INDENT_STEP) - cumulativeIndent(row.depth, TEXT_INDENT_STEP);
  return (
    <li style={{ listStyle: "none", margin: 0, padding: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 32,
          marginTop: 2,
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
          <span
            style={{
              fontFamily: SANS,
              fontSize: 12,
              color,
              fontWeight: row.node.kind === "terminal" ? 700 : 400,
            }}
          >
            {content}
          </span>
        )}
      </div>
      {children.length > 0 && (
        <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, paddingLeft: childIndent }}>
          {children.map((child, i) => (
            <FlowTextNode key={i} node={child} onJumpToSection={onJumpToSection} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ReadingFlow({
  data,
  onJumpToSection,
}: {
  data: ReadingFlowData;
  onJumpToSection?: (index: number) => void;
}) {
  const { rows, truncated, brokenRef, hasCycle, hasDuplicateIds } = flattenFlow(data);
  if (rows.length === 0) {
    // nodes が空(意図的に何も渡さない)場合は、そもそも図を出す意図が無いと
    // みなして何も描画しない。一方、nodes はあるのに start が解決できない
    // (壊れた参照)場合は、この読み物の該当セクションには本来判定フロー図が
    // あるはずなので、無言で消さずに壊れている旨を示す(Codex レビュー指摘・
    // PR #230 13回目)
    if (data.nodes.length === 0) return null;
    return (
      <p style={{ margin: 0, fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
        データに壊れた参照があるため、判定フロー図を表示できません。
      </p>
    );
  }
  const { laid, height } = layoutRows(rows);
  const parentIndices = computeParentIndices(rows);
  // MAX_INDENT_DEPTH を超える行は cumulativeIndent で頭打ちになり、それより
  // 深い親子ペアが同じx位置(=同じ接続線のレーン)に描画されて区別できなくなる
  // (Codex レビュー指摘・PR #230 9回目)。想定する読み物の深さ(現状最大5)を
  // 大きく超える異常なデータでのみ起こるが、無警告で「見た目は完全」にしない
  const depthCapped = rows.some((row) => row.depth > MAX_INDENT_DEPTH);
  const rootText = rows[0].node.kind === "question" ? `${rows[0].node.text}?` : rows[0].node.text;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}
        role="img"
        aria-label={`判定フロー図: ${rootText} から始まる判定順序(本文の要約)`}
      >
        <g aria-hidden="true">
          {laid.map((row, i) => {
            const parentIndex = parentIndices[i];
            if (parentIndex === null) return null;
            const parent = laid[parentIndex];
            // 親の箱の下端左から、子の行の開始位置(ブランチタグの上)まで、
            // 縦→横のL字で結ぶ。字下げが頭打ちになる深さでも、この接続線が
            // どの質問から伸びた枝かを示す(Codex レビュー指摘・PR #230 5回目)
            const startX = parent.x + 4;
            const startY = parent.boxY + parent.boxHeight;
            const endX = row.x + 4;
            const endY = row.y;
            return (
              <path
                key={i}
                d={`M ${startX} ${startY} V ${endY} H ${endX}`}
                fill="none"
                stroke={LINE}
                strokeWidth={1.2}
              />
            );
          })}
        </g>
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
                    {line}
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
      {depthCapped && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
          階層が深いため、図の字下げ・接続線では一部の親子関係を区別できません。正確な階層は下の文字表示で確認してください。
        </p>
      )}
      {brokenRef && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
          データに壊れた参照があるため、図の一部が表示されていません。
        </p>
      )}
      {hasCycle && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
          データに循環参照があるため、図の一部が表示されていません。
        </p>
      )}
      {hasDuplicateIds && (
        <p style={{ margin: "4px 0 0", fontSize: 10.5, color: SHU, fontWeight: 700, lineHeight: 1.6 }}>
          データに同じIDのノードが複数あるため、意図と異なる内容が表示されている可能性があります。
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
        <ul role="list" style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
          {buildFlowTree(rows).map((node, i) => (
            <FlowTextNode key={i} node={node} onJumpToSection={onJumpToSection} />
          ))}
        </ul>
      </details>
    </div>
  );
}
