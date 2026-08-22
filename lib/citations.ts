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

/**
 * 表記から法令名の接頭辞を剥がした表記を、当てはまる分だけすべて返す
 * (最初に当たったものだけで打ち切らない)。例えば「宅地建物取引業法施行令3条の5」は
 * 「宅地建物取引業法施行令」を剥がした「3条の5」だけでなく、「宅地建物取引業法」を
 * 剥がした「施行令3条の5」でも本文に出てくるため、両方を候補として返す
 */
function stripLawNamePrefixes(label: string): string[] {
  const results: string[] = [];
  for (const prefix of LAW_NAME_PREFIXES) {
    if (label.startsWith(prefix) && label.length > prefix.length) {
      results.push(label.slice(prefix.length));
    }
  }
  return results;
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

/** 純粋な「N項」だけの表記(「1項」「23項」等)か */
function isBareProjection(label: string): boolean {
  return /^\d+項$/.test(label);
}

/** 「N項柱書」の表記から、項の部分(「N項」)だけを取り出す。当たらなければ null */
function projectionPrefixOf(label: string): string | null {
  const m = /^(\d+項)柱書$/.exec(label);
  return m ? m[1] : null;
}

/** 純粋な「漢数字+号」だけの表記(「一号」「十一号」等。柱書・下位区分は含まない)か */
function isBareGou(label: string): boolean {
  return /^[一二三四五六七八九十]+号$/.test(label);
}

/** 「漢数字+号+柱書」の表記から、号の部分(「一号」等)だけを取り出す。当たらなければ null */
function gouPrefixOf(label: string): string | null {
  const m = /^([一二三四五六七八九十]+号)柱書$/.exec(label);
  return m ? m[1] : null;
}

/**
 * 行の本文が2文以上からなる(末尾の句点を除いても内部に句点がある)か。
 * 前段・後段の2文構成を検出するための簡易な合図(構文解析はしない)。
 * 誤検出しても、当たる先は同じ行(段全体)なので誤ったリンクにはならない
 */
function hasTrailingSentence(text: string): boolean {
  return text.replace(/。\s*$/, "").includes("。");
}

/** イ〜ホ等、号の下位区分の表記(1文字のカタカナ)か */
function isKanaSubItem(label: string): boolean {
  return /^[イロハニホヘトチリヌル]$/.test(label);
}

/** 報酬告示のように丸数字で項を表す様式(①=1項・②=2項…)の対応表 */
const CIRCLED_DIGIT_PROJECTION: Record<string, string> = {
  "①": "1項",
  "②": "2項",
  "③": "3項",
  "④": "4項",
  "⑤": "5項",
};

/** Reading 1本ぶんの条文参照索引を作る(キー → 該当行)。同じキーは先勝ち */
export function buildCitationIndex(reading: Reading): Map<string, CitationEntry> {
  const index = new Map<string, CitationEntry>();
  const register = (key: string, entry: CitationEntry) => {
    if (!key || index.has(key)) return;
    index.set(key, entry);
  };

  // 条名(article)の候補: フルの表記(法令名つき)と、法令名を剥がした表記の両方を試す
  // (本文は確立済みの法令名を省略して書くことが多いため)
  const articleVariants = (article: string): string[] => [
    article,
    ...stripLawNamePrefixes(article),
  ];
  // 号・項の番号の前に「第」を補った表記も試す(本文の書き方が条文ごとに揺れるため。
  // 例: "64条の7第1項" と "65条2項" のどちらの書き方も本文に出てくる)
  const withDaiVariants = (suffix: string): string[] =>
    suffix.startsWith("第") ? [suffix] : [suffix, `第${suffix}`];
  const registerWithArticle = (article: string, suffix: string, entry: CitationEntry) => {
    for (const a of articleVariants(article)) {
      for (const s of withDaiVariants(suffix)) {
        const key = a + s;
        register(key, { ...entry, key });
      }
    }
  };

  // 「柱書」だけの bare な表記(項番号を伴わない)を暗黙の「1項」とみなしてよい条文かどうか。
  // 同じ article を持つ他の quote ブロックのどこかに明示的な「N項」表記があれば、
  // その条文には項の区分があると判断する(例: juuyou-jikou.ts は 35条1項 と
  // 35条4項 が別ブロックに分かれているため、35条1項 側の「柱書」は「1項」を暗黙に持つ)
  const articlesWithExplicitProjection = new Set<string>();
  for (const section of reading.sections) {
    const quote = section.quote;
    if (!quote?.article) continue;
    if (quote.lines.some((l) => l.label && /\d+項/.test(l.label))) {
      articlesWithExplicitProjection.add(quote.article);
    }
  }

  // 条名を付けない「素の項」表記(例: 「3項」「1項後段」)は、本来なら他の条文の
  // 同じ項と衝突しうるので登録しない。ただし、この Reading の中でその表記が
  // ただ1箇所にしか出てこないなら、衝突の心配がないので素のまま登録してよい
  // (例: cooling-off.ts は 37条の2 だけを扱うため、本文の「(3項)」は
  // 曖昧さなく 37条の2第3項 を指すと判断できる)。
  // 「N項」という表記だけでなく「N項柱書」「N項ただし書」等も同じ項を指すので、
  // 項番号(先頭の「N項」)を単位に、どの article がその項に触れているかを見る
  // (例: baikai-keiyaku.ts は 34条の2 が「1項柱書」を、施行規則15条の10 が
  // 素の「1項」を持つため、表記としては「1項」が1回しか出てこなくても、
  // 実際には2つの条文にまたがる項番号なので、素の「1項」は登録しない)
  const projectionNumberToArticles = new Map<string, Set<string>>();
  for (const section of reading.sections) {
    const quote = section.quote;
    if (!quote?.article) continue;
    for (const line of quote.lines) {
      const m = line.label && /^(\d+項)/.exec(line.label);
      if (!m) continue;
      const articles = projectionNumberToArticles.get(m[1]) ?? new Set<string>();
      articles.add(quote.article);
      projectionNumberToArticles.set(m[1], articles);
    }
  }

  const bareProjectionOccurrences = new Map<string, CitationEntry[]>();

  for (const section of reading.sections) {
    const quote = section.quote;
    if (!quote) continue;
    // このブロックを上から見ていくときの「今どの項/号の中にいるか」(表示ラベルは変えない。
    // 索引キーを補うためだけの内部状態)
    let currentProjection: string | null = null;
    let currentGou: string | null = null;
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
        // 表示用の注記「(媒介)」等が付いた自己完結表記は、注記を外した表記でも拾えるようにする
        // (例: "第7(媒介)" → "第7")
        const bare = label.replace(/[(（][^)）]*[)）]$/, "");
        const surfaces = new Set([label, ...stripLawNamePrefixes(label)]);
        if (bare !== label) {
          surfaces.add(bare);
          for (const s of stripLawNamePrefixes(bare)) surfaces.add(s);
        }
        for (const s of surfaces) register(s, { ...entry, key: s });
        // 1行に条文全体をまとめて引用しているとき(自己完結 label で、他に号等の
        // 下位区分が無い)、その行の本文中に「ただし、」で始まるただし書が
        // 含まれているなら、「ただし書」を付けた表記でも同じ行に解決できるように
        // する(例: "19条の2ただし書" → 19条の2 の唯一の行。本文はただし書だけを
        // 引用しているわけではないが、該当行を示せば読者は原文中で見つけられる)
        if (line.text.includes("ただし、")) {
          for (const s of [...surfaces]) register(`${s}ただし書`, { ...entry, key: `${s}ただし書` });
        }
        continue;
      }

      if (!quote.article) continue;

      if (/^\d+項/.test(label)) {
        const occurrences = bareProjectionOccurrences.get(label) ?? [];
        occurrences.push(entry);
        bareProjectionOccurrences.set(label, occurrences);
      }

      // 報酬告示のように「①」「②」で項を表す様式は、本文の「N項」表記でも
      // 拾えるようにする。本文が「告示第11条2項」のように「条」を挟んで書くことも
      // あるため、その表記も別キーとして登録する
      const circledProjection = CIRCLED_DIGIT_PROJECTION[label];
      if (circledProjection) {
        registerWithArticle(quote.article, circledProjection, entry);
        for (const a of articleVariants(quote.article)) {
          if (/^第\d+$/.test(a)) {
            const key = `${a}条${circledProjection}`;
            register(key, { ...entry, key });
          }
        }
        continue;
      }

      if (isBareProjection(label)) {
        currentProjection = label;
        currentGou = null;
        registerWithArticle(quote.article, label, entry);
        // この項が2文以上からなるとき(「〜できない。これより長い期間を…、三月とする。」の
        // ような前段・後段の構成)、本文が「N項後段」と参照することがある。行を分割せず
        // 段全体を指すポップアップになるが(ただし書の扱いと同じ)、無関係な条文には
        // 広がらないよう素の表記の衝突判定(bareProjectionOccurrences)にも乗せる
        if (hasTrailingSentence(line.text)) {
          const alias = `${label}後段`;
          registerWithArticle(quote.article, alias, entry);
          const occurrences = bareProjectionOccurrences.get(alias) ?? [];
          occurrences.push(entry);
          bareProjectionOccurrences.set(alias, occurrences);
        }
        continue;
      }

      const projFromChapeau = projectionPrefixOf(label);
      if (projFromChapeau) {
        currentProjection = projFromChapeau;
        currentGou = null;
        registerWithArticle(quote.article, label, entry);
        // 柱書を除いた「N項」だけの表記でも、その項全体への参照として拾えるようにする
        registerWithArticle(quote.article, projFromChapeau, entry);
        continue;
      }

      if (label === "柱書") {
        if (articlesWithExplicitProjection.has(quote.article)) {
          currentProjection = "1項";
          currentGou = null;
          registerWithArticle(quote.article, "1項柱書", entry);
          registerWithArticle(quote.article, "1項", entry);
        } else {
          registerWithArticle(quote.article, label, entry);
        }
        continue;
      }

      const gouFromChapeau = gouPrefixOf(label);
      if (gouFromChapeau) {
        currentGou = gouFromChapeau;
        registerWithArticle(quote.article, label, entry);
        const withProjection = (currentProjection ?? "") + gouFromChapeau;
        registerWithArticle(quote.article, withProjection, entry);
        continue;
      }

      if (isBareGou(label)) {
        currentGou = label;
        registerWithArticle(quote.article, label, entry);
        if (currentProjection) {
          const combined = currentProjection + label;
          registerWithArticle(quote.article, combined, entry);
          // 「1項4号」のように項+号を条名なしでそのまま参照する書き方も本文にはある
          // (例: 37条書面の「宅地又は建物の引渡しの時期(1項4号)」)。素の「N項」表記と
          // 同じく、この Reading の中で衝突しないときだけ条名なしでも登録できるようにする
          const occurrences = bareProjectionOccurrences.get(combined) ?? [];
          occurrences.push(entry);
          bareProjectionOccurrences.set(combined, occurrences);
        }
        continue;
      }

      if (isKanaSubItem(label) && currentGou) {
        registerWithArticle(quote.article, currentGou + label, entry);
        if (currentProjection) {
          registerWithArticle(quote.article, currentProjection + currentGou + label, entry);
        }
        continue;
      }

      // 「1項前段」のような表記は「1項本文」でも拾えるようにする(同じ項の主文を指す
      // 言い回しの揺れ。「後段」「ただし書」は別内容を指すため対象にしない)
      if (label.endsWith("前段")) {
        registerWithArticle(quote.article, label.replace(/前段$/, "本文"), entry);
      }

      // 条文全体が1文だけの条(施行令3条の5等)は、唯一の実質行に「本文」という
      // label が付くことがある。この場合は無ラベル行と同じく、条名そのものでも
      // 拾えるようにする(例: 本文が「施行令3条の5により」と、号や項を付けずに
      // 条名だけで参照するため)
      if (label === "本文") {
        for (const a of articleVariants(quote.article)) register(a, { ...entry, key: a });
      }

      registerWithArticle(quote.article, label, entry);
    }
  }

  // この Reading の中で衝突しない「素の項」表記は、条名なしでも登録する
  for (const [label, occurrences] of bareProjectionOccurrences) {
    if (occurrences.length !== 1) continue;
    const m = /^(\d+項)/.exec(label);
    const articles = m ? projectionNumberToArticles.get(m[1]) : undefined;
    if (articles && articles.size > 1) continue;
    register(label, { ...occurrences[0], key: label });
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
 * 「〜」「～」(範囲を表す波ダッシュ)も同様——「第2〜第10」「1号〜8号」の
 * ように範囲の始点だけが索引に載っていても、その一部分だけを指す表記として
 * 開いてしまうと、範囲全体を指す本文の趣旨とずれるため塞ぐ。
 * 「の」は境界に含めない — 「1項の規定により」のような正当な言い回しを
 * 塞いでしまうため(「37条」が「37条の2」に食われる懸念は、同じ Reading 内で
 * 両方が無ラベル行として登録されない限り起きない)
 */
const NON_BOUNDARY_FOLLOW = "(?![0-9一二三四五六七八九十号項条〜～]|柱書|ただし書|本文|前段|後段)";

/**
 * 条名を伴わない「N項」から始まるキー(例: 「3項」「1項後段」)の手前に付ける境界。
 * 「条」や数字、「第」が直前にあると、そのキーは実は「35条5項」や
 * 「16条の15第3項から第5項まで」のような別条文への参照の末尾を切り取っただけの
 * 可能性があるため、マッチさせない(fail-safe。本来は同じ項を指す「第3項」という
 * 言い回しも同様に塞がれるが、無関係な条文の範囲参照に誤爆するほうが害が大きいため
 * 安全側に倒す)
 */
const NON_BOUNDARY_PRECEDE = "(?<![0-9条第])";

/**
 * 「〜」「～」(範囲を表す波ダッシュ)の直後には、キーの種類を問わずマッチさせない境界。
 * 「64条の7〜64条の15」のように自己完結表記(64条の15)が範囲の終点として使われている
 * ときも、その終点だけを指す参照として開いてしまうと範囲全体を指す本文の趣旨とずれる
 * ため、NON_BOUNDARY_FOLLOW(直後の境界)と対になる直前側の境界として全キーに適用する
 */
const NON_BOUNDARY_PRECEDE_RANGE = "(?<![〜～])";

/** 条名を伴わない「N項」始まりのキーか(境界ガードが必要かどうかの判定) */
function isBareProjectionKey(key: string): boolean {
  return /^\d+項/.test(key);
}

/** 索引の全キーを長い順に並べた選言パターン(最長一致のため。TERM_PATTERN と同じ考え方) */
export function citationPattern(index: Map<string, CitationEntry>): string {
  if (index.size === 0) return "";
  const alternation = [...index.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const precede = NON_BOUNDARY_PRECEDE_RANGE + (isBareProjectionKey(k) ? NON_BOUNDARY_PRECEDE : "");
      return `${precede}${escaped}`;
    })
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
