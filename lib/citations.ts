/**
 * 読み物1本(`Reading`)が持つ条文引用(`ReadingQuote`)から、
 * 本文中の条文参照(例: 「65条2項」)をポップアップに解決するための索引を作る。
 *
 * Issue #215。用語辞書(`lib/terms.ts`)と同じ「配列を索引に変換し、
 * 最長一致で本文からタップ可能な表記を拾う」考え方を条文参照に適用したもの。
 * 決定的な違いは、索引が `Reading` ごとに作られること(用語辞書はアプリ全体で1つ)。
 *
 * 索引キーの作り方は2通り(`ReadingQuote.article` のドキュメント参照):
 * - `quote.article` がある場合: `article + line.label` を1本のキーにする
 *   (例: article="65条" + label="2項" → "65条2項")
 * - `line.label` 自体が既に条番号を含む自己完結した表記の場合
 *   (例: "19条1項", "宅建業法69条1項"): その label をそのままキーにする。
 *   さらに法令名の接頭辞(「宅建業法」等)を外した表記も別キーとして登録する
 *   (本文が法令名を省略して書くことが多いため)。
 *
 * どちらの経路にも当たらない・`label` が見出し行("〜見出し")のときは索引に載せない
 * (fail-safe。誤ったリンクを作らない)。
 */
import type { Reading, ReadingQuoteLine } from "@/types";

export type CitationEntry = {
  key: string;
  line: ReadingQuoteLine;
  cite: string;
  sectionHeading: string;
};

/** 索引に既に入っている表記の法令名接頭辞。本文が省略しがちなので剥がした形も登録する */
const LAW_NAME_PREFIXES = [
  "宅地建物取引業法施行令",
  "宅地建物取引業法施行規則",
  "宅建業法施行令",
  "宅建業法施行規則",
  "宅地建物取引業法",
  "宅建業法",
  "行政手続法",
  "借地借家法",
  "民法",
];

function stripLawNamePrefix(label: string): string | null {
  for (const prefix of LAW_NAME_PREFIXES) {
    if (label.startsWith(prefix) && label.length > prefix.length) {
      return label.slice(prefix.length);
    }
  }
  return null;
}

/** 見出し行(「条見出し」「19条の2見出し」等)は条文参照として拾わない */
function isHeadingLabel(label: string): boolean {
  return label.endsWith("見出し");
}

/**
 * label 自体が条番号(または報酬告示のような「第N」形式)を含み、
 * 他条文と自己完結して区別できる表記か
 */
function isSelfQualified(label: string): boolean {
  return /\d+条|第\d+/.test(label);
}

/** Reading 1本ぶんの条文参照索引を作る(キー → 該当行)。同じキーは先勝ち */
export function buildCitationIndex(reading: Reading): Map<string, CitationEntry> {
  const index = new Map<string, CitationEntry>();
  const register = (key: string, entry: CitationEntry) => {
    if (!key || index.has(key)) return;
    index.set(key, entry);
  };

  // 条名(article)の候補: フルの表記(法令名つき)と、法令名を剥がした表記の両方を試す
  // (本文は確立済みの法令名を省略して書くことが多いため)
  const articleVariants = (article: string): string[] => {
    const stripped = stripLawNamePrefix(article);
    return stripped ? [article, stripped] : [article];
  };
  // 号・項の番号の前に「第」を補った表記も試す(本文の書き方が条文ごとに揺れるため。
  // 例: "64条の7第1項" と "65条2項" のどちらの書き方も本文に出てくる)
  const withDaiVariants = (suffix: string): string[] =>
    suffix.startsWith("第") ? [suffix] : [suffix, `第${suffix}`];

  for (const section of reading.sections) {
    const quote = section.quote;
    if (!quote) continue;
    for (const line of quote.lines) {
      const entry: CitationEntry = {
        key: "",
        line,
        cite: quote.cite,
        sectionHeading: section.heading,
      };
      const label = line.label;
      if (!label) {
        if (quote.article) {
          for (const a of articleVariants(quote.article)) register(a, { ...entry, key: a });
        }
        continue;
      }
      if (isHeadingLabel(label)) continue;
      if (isSelfQualified(label)) {
        register(label, { ...entry, key: label });
        const stripped = stripLawNamePrefix(label);
        if (stripped) register(stripped, { ...entry, key: stripped });
      } else if (quote.article) {
        for (const a of articleVariants(quote.article)) {
          for (const suffix of withDaiVariants(label)) {
            const key = a + suffix;
            register(key, { ...entry, key });
          }
        }
      }
    }
  }
  return index;
}

/** 索引の全キーを長い順に並べた選言パターン(最長一致のため。TERM_PATTERN と同じ考え方) */
export function citationPattern(index: Map<string, CitationEntry>): string {
  return [...index.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

/** タップされた表記から該当行を引く(未登録なら undefined) */
export function resolveCitation(
  index: Map<string, CitationEntry>,
  surface: string,
): CitationEntry | undefined {
  return index.get(surface);
}
