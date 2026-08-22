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

/** 漢数字(一〜九・十の組み合わせ、1〜99)を算用数字に変換する。変換できなければ null */
function kanjiDigitsToArabic(kanji: string): number | null {
  const digits: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (kanji === "十") return 10;
  if (kanji.length === 1) return digits[kanji] ?? null;
  const tenIndex = kanji.indexOf("十");
  if (tenIndex === -1) return null;
  const tensPart = kanji.slice(0, tenIndex);
  const onesPart = kanji.slice(tenIndex + 1);
  const tens = tensPart === "" ? 1 : digits[tensPart];
  const ones = onesPart === "" ? 0 : digits[onesPart];
  if (tens === undefined || ones === undefined) return null;
  return tens * 10 + ones;
}

/**
 * キー中の「漢数字+号」(例: "四号"・"十一号")を算用数字表記(例: "4号"・"11号")に
 * 変換した表記を返す。本文は号の番号を算用数字で書くことが多いため
 * (例: "68条の2第1項4号"・"79条2号")、label 由来の漢数字表記だけでは
 * ヒットしないケースを補う。変換対象が無ければ null
 */
function withArabicGou(key: string): string | null {
  const re = /[一二三四五六七八九十]+号/g;
  let changed = false;
  const converted = key.replace(re, (m) => {
    const n = kanjiDigitsToArabic(m.slice(0, -1));
    if (n === null) return m;
    changed = true;
    return `${n}号`;
  });
  return changed ? converted : null;
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

  // 漢数字の号を算用数字に変換した表記も登録する(本文は算用数字で書くことが多いため。
  // 例: label 由来の "68条の2第1項四号" に対し "68条の2第1項4号" も拾えるようにする)
  for (const [key, entry] of [...index.entries()]) {
    const arabic = withArabicGou(key);
    if (arabic) register(arabic, { ...entry, key: arabic });
  }

  return index;
}

/**
 * 索引のキーが、本文中でより長い(索引に無い)表記の先頭部分でしかないときは
 * マッチさせない境界。番号の続き(算用数字・漢数字)や「号」「項」「条」、
 * 「柱書」「ただし書」等の続きが直後に来る場合はマッチを不成立にする(fail-safe。
 * 索引に無い、より具体的な参照を、粗い参照として誤って開かないため)。
 * 「の」は境界に含めない — 「1項の規定により」のような正当な言い回しを
 * 塞いでしまうため(「37条」が「37条の2」に食われる懸念は、同じ Reading 内で
 * 両方が無ラベル行として登録されない限り起きない)
 */
const NON_BOUNDARY_FOLLOW = "(?![0-9一二三四五六七八九十号項条]|柱書|ただし書|本文|前段|後段)";

/** 索引の全キーを長い順に並べた選言パターン(最長一致のため。TERM_PATTERN と同じ考え方) */
export function citationPattern(index: Map<string, CitationEntry>): string {
  if (index.size === 0) return "";
  const alternation = [...index.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return `(?:${alternation})${NON_BOUNDARY_FOLLOW}`;
}

/** タップされた表記から該当行を引く(未登録なら undefined) */
export function resolveCitation(
  index: Map<string, CitationEntry>,
  surface: string,
): CitationEntry | undefined {
  return index.get(surface);
}
