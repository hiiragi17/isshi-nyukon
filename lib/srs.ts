/**
 * 一肢入魂 — 間隔反復(SRS)
 *
 * SM-2 の簡易版(既決事項 / design-v1.md 3.3):
 * - 肢ごとに「満点なら復習間隔を2倍、失点したら間隔をリセット」
 * - 「本日の召喚状」キュー = 弱点(最新が満点未満) > 復習期限切れ > 未着手 > その他
 *
 * ここは純粋関数のみ(React / localStorage に依存しない)。
 * 入力は全件履歴 Attempt[] と対象の肢一覧、および基準時刻。
 * ユニットテストで間隔計算とキュー順を検証する(lib/srs.test.ts)。
 */
import type { Attempt } from "@/types";
import { itemKey } from "@/lib/storage";

/** 復習間隔の基準(日)。初回・リセット後はこの間隔から始まる */
export const SRS_BASE_INTERVAL_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 召喚状キューの並び分類。優先度は weak > due > new > later。
 * - weak : 最新の挑戦が満点未満(弱点)
 * - due  : 直近は満点だが復習期限が切れている
 * - new  : 未着手(一度も挑戦していない)
 * - later: 直近は満点で、まだ復習期限が来ていない
 */
export type SrsBucket = "weak" | "due" | "new" | "later";

/** 分類ごとの優先順位(小さいほど先に出す) */
const BUCKET_RANK: Record<SrsBucket, number> = {
  weak: 0,
  due: 1,
  new: 2,
  later: 3,
};

/** キュー生成の対象となる肢(問題×肢) */
export type SrsTarget = { questionId: string; choiceIndex: number };

/** 肢1件の SRS 状態。召喚状カードやマトリクスの駆動に使う */
export type SrsItemState = {
  questionId: string;
  choiceIndex: number;
  /** itemKey(questionId, choiceIndex) */
  key: string;
  /** これまでの挑戦回数 */
  attemptCount: number;
  /** 最新挑戦の ISO 日時(未着手は null) */
  lastAttemptAt: string | null;
  /** 最新挑戦が満点だったか(未着手は null) */
  latestPerfect: boolean | null;
  /** 現在の復習間隔(日) */
  intervalDays: number;
  /** 次回復習期限の ISO 日時(未着手は null) */
  dueAt: string | null;
  bucket: SrsBucket;
};

/** answeredAt(ISO文字列)昇順で比較する。ISO日時は辞書順=時系列順 */
function byAnsweredAt(a: Attempt, b: Attempt): number {
  if (a.answeredAt < b.answeredAt) return -1;
  if (a.answeredAt > b.answeredAt) return 1;
  return 0;
}

/** 満点なら true(pts が max 以上) */
function isPerfect(a: Attempt): boolean {
  return a.pts >= a.max;
}

/**
 * 1つの肢の全挑戦から、現在の復習間隔(日数)を求める。
 * 満点 → 間隔2倍 / 失点 → 基準にリセット、を古い挑戦から順に畳み込む。
 * attempts は同一肢のものを渡す(順不同でよい。内部で時系列に整列する)。
 */
export function reviewInterval(attempts: Attempt[]): number {
  const sorted = [...attempts].sort(byAnsweredAt);
  let interval = SRS_BASE_INTERVAL_DAYS;
  for (const a of sorted) {
    if (isPerfect(a)) interval *= 2;
    else interval = SRS_BASE_INTERVAL_DAYS;
  }
  return interval;
}

/**
 * 1つの肢の次回復習期限を求める(最終挑戦日 + 復習間隔)。
 * 未挑戦(attempts 空)は null。
 */
export function nextReviewDate(attempts: Attempt[]): Date | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort(byAnsweredAt);
  const last = sorted[sorted.length - 1];
  const interval = reviewInterval(sorted);
  return new Date(new Date(last.answeredAt).getTime() + interval * DAY_MS);
}

/** 履歴を肢(itemKey)ごとにまとめる */
function groupByItem(attempts: Attempt[]): Map<string, Attempt[]> {
  const byItem = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const k = itemKey(a.questionId, a.choiceIndex);
    const arr = byItem.get(k);
    if (arr) arr.push(a);
    else byItem.set(k, [a]);
  }
  return byItem;
}

/** 1つの肢の状態を導出する */
function stateOf(
  target: SrsTarget,
  attempts: Attempt[],
  now: Date,
): SrsItemState {
  const key = itemKey(target.questionId, target.choiceIndex);
  const sorted = [...attempts].sort(byAnsweredAt);
  const last = sorted.length ? sorted[sorted.length - 1] : null;
  const intervalDays = reviewInterval(sorted);
  const due = last
    ? new Date(new Date(last.answeredAt).getTime() + intervalDays * DAY_MS)
    : null;
  const latestPerfect = last ? isPerfect(last) : null;

  let bucket: SrsBucket;
  if (!last) bucket = "new";
  else if (!latestPerfect) bucket = "weak";
  else if (due!.getTime() <= now.getTime()) bucket = "due";
  else bucket = "later";

  return {
    questionId: target.questionId,
    choiceIndex: target.choiceIndex,
    key,
    attemptCount: sorted.length,
    lastAttemptAt: last ? last.answeredAt : null,
    latestPerfect,
    intervalDays,
    dueAt: due ? due.toISOString() : null,
    bucket,
  };
}

/**
 * 「本日の召喚状」キューを生成する。
 * 対象の全肢について SRS 状態を導出し、優先度順に並べて返す。
 *
 * 並び順:
 *  1. 分類の優先度(weak > due > new > later)
 *  2. 同一分類内:
 *     - weak / due / later は復習期限(dueAt)の古い順(=より切迫している順)
 *     - new は targets で与えられた順序を保つ
 *  3. 最終的なタイブレークは targets の元順(安定ソート)
 *
 * @param targets 出題対象の全肢(未着手を含めるため QUESTIONS 由来の全肢を渡す)
 * @param attempts 全件履歴
 * @param now 基準時刻(既定は現在時刻)
 */
export function buildSummonQueue(
  targets: SrsTarget[],
  attempts: Attempt[],
  now: Date = new Date(),
): SrsItemState[] {
  const byItem = groupByItem(attempts);
  const indexed = targets.map((t, index) => {
    const its = byItem.get(itemKey(t.questionId, t.choiceIndex)) ?? [];
    return { index, state: stateOf(t, its, now) };
  });

  indexed.sort((a, b) => {
    const rank = BUCKET_RANK[a.state.bucket] - BUCKET_RANK[b.state.bucket];
    if (rank !== 0) return rank;
    // new 以外は復習期限の古い順(dueAt は同一分類内では必ず非 null)
    if (a.state.bucket !== "new" && a.state.dueAt && b.state.dueAt) {
      if (a.state.dueAt < b.state.dueAt) return -1;
      if (a.state.dueAt > b.state.dueAt) return 1;
    }
    return a.index - b.index;
  });

  return indexed.map((x) => x.state);
}
