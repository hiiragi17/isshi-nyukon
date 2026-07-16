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

/**
 * 学習モード。
 * - renshu(練習): 全問出題。未検証には「未検証」バッジを付ける。
 * - honban(本番): verified===true の問題だけ出題し、集印の分母もそれに連動。
 */
export type StudyMode = "renshu" | "honban";

/** URLクエリなどの文字列を StudyMode に解決する(不明・欠落は練習) */
export function toStudyMode(value: string | null | undefined): StudyMode {
  return value === "honban" ? "honban" : "renshu";
}

/** そのモードで出題対象になるか。本番は検証済みのみ。 */
export function isActiveInMode(q: Question, mode: StudyMode): boolean {
  return mode === "renshu" || q.verified === true;
}
