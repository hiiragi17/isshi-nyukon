/**
 * 条文参照対応テキスト。本文中の条文表記(例:「65条2項」)をタップすると
 * その項/号だけをポップアップ表示する(Issue #215)。`components/TermText.tsx` の
 * termify と同じ考え方(最長一致・索引に無い表記は素通し)を、
 * `lib/citations.ts` が読み物ごとに作る索引に対して適用する。
 */
import type { ReactNode } from "react";
import { AI_BLUE } from "@/lib/tokens";
import type { CitationEntry } from "@/lib/citations";

function CitationButton({
  surface,
  onCite,
}: {
  surface: string;
  onCite: (surface: string) => void;
}) {
  return (
    <button
      onClick={() => onCite(surface)}
      style={{
        font: "inherit",
        lineHeight: "inherit",
        color: "inherit",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "help",
        borderBottom: `2px dotted ${AI_BLUE}`,
      }}
      aria-label={`条文「${surface}」の原文を見る`}
    >
      {surface}
    </button>
  );
}

/**
 * テキスト中の条文参照を CitationButton に置き換える。
 * `index` が空、または `onCite` が無いときは素の文字列を返す。
 * 索引に無い表記はマッチしないため、そのまま素通しする(fail-safe)。
 */
export function citify(
  text: string,
  index: Map<string, CitationEntry>,
  pattern: string,
  onCite?: (surface: string) => void,
): ReactNode {
  if (!onCite || index.size === 0 || !pattern) return text;
  let re: RegExp;
  try {
    re = new RegExp(pattern, "g");
  } catch {
    // pattern は境界チェックに後読み(lookbehind)を使っており、これをサポートしない
    // 古いブラウザ(iOS 16.3以前のSafari等)では正規表現の構築自体が例外を投げる。
    // ページ全体が描画不能になるのを避けるため、そのときは条文リンク無しの
    // 素のテキストとして表示する(fail-safe。索引に無い表記の素通しと同じ考え方)
    return text;
  }
  const parts: Array<string | { surface: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ surface: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) =>
    typeof p === "string" ? (
      p
    ) : (
      <CitationButton key={i} surface={p.surface} onCite={onCite} />
    ),
  );
}
