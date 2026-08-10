/**
 * 読み物データの読み込み境界で使う正規化。
 *
 * `data/readings/index.ts` はこの `normalizeReading` を通してから
 * `READINGS` を公開する。`lib/questions.ts` の `normalizeQuestion` と
 * 同じ fail-closed パターンを適用する(未指定は最も弱い側に倒す)。
 */
import type { LawVersion, Reading, SourceRef } from "@/types";
import { UNCHECKED_LAW_VERSION, UNVERIFIED_SOURCE } from "@/lib/questions";

/**
 * 照合の証跡フィールドを fail-closed に正規化する。
 * すでに値が入っていればそのまま保持する。
 */
export function normalizeReading(r: Reading): Reading {
  return {
    ...r,
    verified: r.verified ?? false,
    source: r.source
      ? { ...r.source, answerLevel: r.source.answerLevel ?? r.source.level }
      : { ...UNVERIFIED_SOURCE, answerLevel: UNVERIFIED_SOURCE.level },
    lawVersion: r.lawVersion
      ? { ...r.lawVersion, driftChecked: r.lawVersion.driftChecked ?? "unchecked" }
      : { ...UNCHECKED_LAW_VERSION },
  } satisfies Reading & { source: SourceRef; lawVersion: LawVersion };
}
