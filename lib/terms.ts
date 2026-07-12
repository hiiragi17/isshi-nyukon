/**
 * 用語辞書のマッチング。
 *
 * 配列+エイリアス方式・最長一致(既決事項)。`data/terms.ts` の TERMS から、
 * 表記(word + aliases)を長い順に並べた正規表現と、表記→定義の逆引きを作る。
 * 定義文はプロトタイプ準拠のため、ここでは加工しない。
 */
import { TERMS } from "@/data/terms";

/** 正規表現メタ文字を無害化(現データには無いが、エイリアス追加に備える) */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** すべての表記(word と aliases)を1件ずつに展開 */
const surfaces = TERMS.flatMap((t) =>
  [t.word, ...(t.aliases ?? [])].map((surface) => ({ surface, def: t.def })),
);

/**
 * 最長一致のため、長い表記を先に並べた選言パターン。
 * プロトタイプの TERM_PATTERN(長い順に "|" 連結)と同じ考え方。
 */
export const TERM_PATTERN = [...surfaces]
  .sort((a, b) => b.surface.length - a.surface.length)
  .map((e) => escapeRegExp(e.surface))
  .join("|");

const DEF_BY_SURFACE = new Map(surfaces.map((e) => [e.surface, e.def]));

/** タップされた表記から定義文を引く(未登録なら undefined) */
export function termDef(surface: string): string | undefined {
  return DEF_BY_SURFACE.get(surface);
}
