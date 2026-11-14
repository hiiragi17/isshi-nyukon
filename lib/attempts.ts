/**
 * 一肢入魂 — 成績の読み込み境界(問題の版番号による照合)
 *
 * 問題の肢を直したあと、直す前の `Attempt` が、直したあとの肢の結果として
 * 扱われないようにする(#592 / docs/design-exam-format.md 4章)。
 * 履歴は消さず、**読むときに無視する**。全件履歴を保つ既決事項は守られる。
 *
 * 判別には時刻を使わない。`answeredAt` は端末の時計なので、時計が進んでいると
 * 直す前の記録が新しく見える。PWA の Service Worker はオフライン時に古いページを
 * 返すので、直したあとの日時に、直す前の問題へ回答することもできる。そこで、
 * **回答時に画面が表示した問題の版番号**(`Attempt.questionRevision`)を、
 * 現在の問題データの版番号(`Question.revision`)と突き合わせる。
 *
 * 集計(弱点判定・SRS・成長グラフ・習熟・進捗)に渡す成績は、必ずここを通す。
 * フィルタは StorageAdapter の外に置く(Adapter は全件をそのまま返す保管庫のまま。
 * 控えの書き出しは全件を使うため、Adapter 側では絞らない)。
 */
import type { Attempt, Question } from "@/types";
import type { StorageAdapter } from "@/lib/storage";

/** `Question.revision` を省略したときの版番号 */
export const DEFAULT_QUESTION_REVISION = 1;

/** 問題の現在の版番号(省略時は 1) */
export function revisionOf(q: Pick<Question, "revision">): number {
  return q.revision ?? DEFAULT_QUESTION_REVISION;
}

/**
 * 全件履歴から、**現在の問題データと版番号が一致する記録だけ**を返す(順序は保つ)。
 *
 * 落とすもの(どれも履歴には残り、集計に使わないだけ):
 * - 版番号が現在の問題と一致しない記録(直す前の問題への回答。古い版を表示して
 *   回答した記録も、表示した版が記録されているのでここで落ちる)
 * - 現在の問題データにない問題IDの記録(問題の入れ替え前の記録)
 * - 版番号を持たない記録(壊れた保存データ。fail-closed)
 */
export function currentAttempts(
  attempts: Attempt[],
  questions: Pick<Question, "id" | "revision">[],
): Attempt[] {
  const revisions = new Map<string, number>();
  for (const q of questions) revisions.set(q.id, revisionOf(q));
  return attempts.filter(
    (a) => revisions.get(a.questionId) === a.questionRevision,
  );
}

/** 読み込んだ成績。`all`=保存されている全件 / `current`=集計に使ってよい記録 */
export type LoadedAttempts = { all: Attempt[]; current: Attempt[] };

/**
 * 成績を読み、集計に使ってよい記録(`current`)を添えて返す。
 * 画面は `current` で集計する。`all` は「保存されている記録があるか」の判定など、
 * 履歴そのものを扱う場面にだけ使う。
 */
export async function loadAttempts(
  adapter: Pick<StorageAdapter, "getAttempts">,
  questions: Pick<Question, "id" | "revision">[],
): Promise<LoadedAttempts> {
  const all = await adapter.getAttempts();
  return { all, current: currentAttempts(all, questions) };
}
