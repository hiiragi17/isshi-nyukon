/**
 * 一肢入魂 — 成長グラフ(v1.5)のデータ導出
 *
 * StorageAdapter が保持する Attempt の「全件履歴」から、
 * 日ごとの学習の歩みを導く純粋関数。UI(components/GrowthChart)は
 * ここが返す GrowthSummary だけを見て描画する(localStorage 直呼び禁止)。
 *
 * 「集印(完璧論点)」は、その日の終了時点までの最新結果で判定した
 * 完璧論点数。履歴を日単位で再生して求めるので、ダッシュボードの
 * 集印カウンタ(最新時点)と地続きの「歩み」として読める。
 */
import type { Attempt, Question } from "@/types";
import { itemKey } from "./storage";
import { itemCountOf } from "./items";

/** ローカル日付のキー(YYYY-M-D)。同じ暦日の Attempt をまとめる単位 */
function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 日付キー(YYYY-M-D)を "M/D" 表記の軸ラベルにする */
function labelOf(dayKey: string): string {
  const [, m, d] = dayKey.split("-");
  return `${m}/${d}`;
}

/** 最新結果マップから、完璧論点(全肢を最新で正解)の数を数える */
function sealFrom(
  latest: Map<string, Attempt>,
  questions: Question[],
): number {
  let seal = 0;
  for (const q of questions) {
    const n = itemCountOf(q);
    let perfect = 0;
    let tried = 0;
    for (let ci = 0; ci < n; ci++) {
      const a = latest.get(itemKey(q.id, ci));
      if (!a) continue;
      tried++;
      if (a.pts >= a.max) perfect++;
    }
    if (tried === n && perfect === n) seal++;
  }
  return seal;
}

/** 審理した日1日ぶんの歩み */
export type GrowthPoint = {
  /** ローカル日付キー(YYYY-M-D) */
  day: string;
  /** 軸ラベル("M/D") */
  label: string;
  /** その日に審理した肢の数 */
  attempts: number;
  /** その日の終了時点での完璧論点数(集印)の累積 */
  sealCount: number;
  /** その日の得点率(0〜1)。満点合計に対する獲得点合計 */
  scoreRate: number;
};

/** 成長グラフの描画に必要な集計一式 */
export type GrowthSummary = {
  /** 審理日ごとの歩み(古い→新しい) */
  points: GrowthPoint[];
  /** 全期間の総審理肢数 */
  totalAttempts: number;
  /** 審理した日数 */
  activeDays: number;
  /** 全期間の得点率(0〜1) */
  avgScoreRate: number;
  /** 最新時点の集印(完璧論点数) */
  currentSeal: number;
  /** 期間中に到達した集印の最大値 */
  maxSeal: number;
  /** 全論点数(集印の分母・グラフの上限スケール) */
  totalTopics: number;
};

/**
 * 全件履歴から成長グラフ用の集計を作る。
 *
 * - 時系列に並べ、暦日ごとにまとめる
 * - 各日の終了時点の「最新結果」を再生して集印(完璧論点数)を求める
 *   → 一度完璧にした論点を後日落とせば集印は減る(履歴に忠実)
 */
export function buildGrowth(
  attempts: Attempt[],
  questions: Question[],
): GrowthSummary {
  const totalTopics = questions.length;
  const sorted = [...attempts].sort((a, b) =>
    a.answeredAt < b.answeredAt ? -1 : a.answeredAt > b.answeredAt ? 1 : 0,
  );

  const latest = new Map<string, Attempt>();
  const points: GrowthPoint[] = [];
  let curDay: string | null = null;
  let dayAttempts = 0;
  let dayPts = 0;
  let dayMax = 0;
  let totalPts = 0;
  let totalMax = 0;

  /** 1日ぶんの集計を points に確定する */
  const flush = (day: string) => {
    points.push({
      day,
      label: labelOf(day),
      attempts: dayAttempts,
      sealCount: sealFrom(latest, questions),
      scoreRate: dayMax > 0 ? dayPts / dayMax : 0,
    });
  };

  for (const a of sorted) {
    const day = dayKeyOf(a.answeredAt);
    if (curDay !== null && day !== curDay) {
      flush(curDay);
      dayAttempts = 0;
      dayPts = 0;
      dayMax = 0;
    }
    curDay = day;
    dayAttempts++;
    dayPts += a.pts;
    dayMax += a.max;
    totalPts += a.pts;
    totalMax += a.max;
    // 同一肢は最新の Attempt で上書き(時系列順なので後勝ちでよい)
    latest.set(itemKey(a.questionId, a.choiceIndex), a);
  }
  if (curDay !== null) flush(curDay);

  const maxSeal = points.reduce((m, p) => Math.max(m, p.sealCount), 0);
  return {
    points,
    totalAttempts: attempts.length,
    activeDays: points.length,
    avgScoreRate: totalMax > 0 ? totalPts / totalMax : 0,
    currentSeal: points.length ? points[points.length - 1].sealCount : 0,
    maxSeal,
    totalTopics,
  };
}
