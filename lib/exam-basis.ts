/**
 * 試験の法令基準日(`LawVersion.examBasisDate`)の導出。
 *
 * 一次ソース(不動産適正取引推進機構「宅建試験の概要」)は日付を直接書かず、
 * **年度に対して相対的**に定めている。
 *
 * > 出題の根拠となる法令は、試験を実施する年度の4月1日現在施行されているものです。
 *
 * したがって `examBasisDate: "2026-04-01"` は令和8年度に当てはめた**導出値**であり、
 * 年度が変われば動く。値を固定で持つと年度をまたいだときに古いまま残るため、
 * ここで規則から導出し、`data/questions/integrity.test.ts` が全問と突き合わせる。
 */

/** 日本の年度の境目。4月1日始まりなので、1〜3月は前年度になる */
const FISCAL_YEAR_START_MONTH = 4;

/**
 * 基準日の判定は日本の年度で行うので、実行環境のタイムゾーンに依存させない。
 * UTC で動くCIだと、3月31日の夕方(JST では4月1日)に前年度と判定されてしまう。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** JST に直した年・月(月は1〜12)を返す */
function jstYearMonth(now: Date): { year: number; month: number } {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 };
}

/**
 * その時点が属する年度(西暦)。4月1日始まりなので、1〜3月は前年を返す。
 * 例: 2027-02-15 は 2026 年度。
 */
export function examYearFor(now: Date): number {
  const { year, month } = jstYearMonth(now);
  return month < FISCAL_YEAR_START_MONTH ? year - 1 : year;
}

/**
 * その時点で実施される試験の法令基準日(`YYYY-04-01`)。
 * 例: 2026-07-30 → `"2026-04-01"` / 2027-02-15 → `"2026-04-01"`。
 */
export function examBasisDateFor(now: Date): string {
  return `${examYearFor(now)}-04-01`;
}
