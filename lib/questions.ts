/**
 * 問題データの読み込み境界で使う正規化。
 *
 * `data/questions/index.ts` はこの `normalizeQuestion` を通してから
 * `QUESTIONS` を公開する。`verified`(一次ソースで裏取り済みかの記録)を、
 * 未指定なら false に正規化して常に boolean で揃える。
 */
import type { Question } from "@/types";

/**
 * verified 未指定を false(未検証)に正規化する。
 * すでに boolean が入っていればそのまま保持する。
 */
export function normalizeQuestion(q: Question): Question {
  return { ...q, verified: q.verified ?? false };
}
