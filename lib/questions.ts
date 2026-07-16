/**
 * 問題データの読み込み境界で使う正規化・フィルタ。
 *
 * `data/questions/index.ts` はこの `normalizeQuestion` を通してから
 * `QUESTIONS` を公開する。新規問題ファイルで `verified` を書き忘れても、
 * 未検証(false)に倒れて本番に漏れない(fail-closed)ための安全網。
 */
import type { Question } from "@/types";

/**
 * verified 未指定を false(未検証)に正規化する。
 * すでに boolean が入っていればそのまま保持する。
 */
export function normalizeQuestion(q: Question): Question {
  return { ...q, verified: q.verified ?? false };
}
