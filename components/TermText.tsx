/**
 * 用語辞書対応テキスト。点線付きの語をタップすると意味を表示する。
 * プロトタイプの TermButton / termify と同一挙動(最長一致・非対応時は素通し)。
 */
import type { ReactNode } from "react";
import { AI_BLUE } from "@/lib/tokens";
import { TERM_PATTERN } from "@/lib/terms";

function TermButton({
  word,
  onTerm,
}: {
  word: string;
  onTerm: (word: string) => void;
}) {
  return (
    <button
      onClick={() => onTerm(word)}
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
      aria-label={`用語「${word}」の意味を見る`}
    >
      {word}
    </button>
  );
}

/**
 * テキスト中の用語を TermButton に置き換える。
 * onTerm が無いときは素の文字列を返す(プロトタイプと同じ)。
 */
export function termify(
  text: string,
  onTerm?: (word: string) => void,
): ReactNode {
  if (!onTerm) return text;
  const re = new RegExp(TERM_PATTERN, "g");
  const parts: Array<string | { word: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ word: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) =>
    typeof p === "string" ? (
      p
    ) : (
      <TermButton key={i} word={p.word} onTerm={onTerm} />
    ),
  );
}
