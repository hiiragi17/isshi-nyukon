/**
 * 問題データの読み込み境界で使う正規化。
 *
 * `data/questions/index.ts` はこの `normalizeQuestion` を通してから
 * `QUESTIONS` を公開する。照合の証跡にあたる3つのフィールドを、
 * 未指定なら**最も弱い側**に倒して常に同じ形で揃える(fail-closed)。
 *
 * - `verified`           未指定 → `false`(未検証)
 * - `source`             未指定 → `{ level: "unverified" }`
 * - `source.answerLevel` 未指定 → `source.level` と同じ
 * - `lawVersion`         未指定 → `{ driftChecked: "unchecked" }`
 * - `topicId`            未指定 → 自分の `id`(論点グルーピングの既定値)
 *
 * 「記録が無い」と「弱い記録がある」を同じ扱いにすることで、埋まっていない
 * ものが常に見える状態を保つ。
 */
import type { LawVersion, Question, SourceRef } from "@/types";

/** 記録が無いときの source(最も弱い側) */
export const UNVERIFIED_SOURCE: SourceRef = { level: "unverified" };

/** 記録が無いときの lawVersion(最も弱い側) */
export const UNCHECKED_LAW_VERSION: LawVersion = { driftChecked: "unchecked" };

/**
 * 照合の証跡フィールドを fail-closed に正規化する。
 * すでに値が入っていればそのまま保持する(`driftChecked` だけは
 * `lawVersion` があっても未指定なら `unchecked` を補う)。
 */
export function normalizeQuestion(q: Question): Question {
  return {
    ...q,
    verified: q.verified ?? false,
    topicId: q.topicId ?? q.id,
    // 既定値は共有オブジェクトなので、必ずコピーを返す。
    // 返り値を書き換えられても入力や既定値を汚染しないようにするため。
    source: q.source
      ? { ...q.source, answerLevel: q.source.answerLevel ?? q.source.level }
      : { ...UNVERIFIED_SOURCE, answerLevel: UNVERIFIED_SOURCE.level },
    lawVersion: q.lawVersion
      ? { ...q.lawVersion, driftChecked: q.lawVersion.driftChecked ?? "unchecked" }
      : { ...UNCHECKED_LAW_VERSION },
  };
}
