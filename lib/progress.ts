/**
 * 一肢入魂 — 進捗集計(検地帳・論点選択画面の共通ロジック)
 *
 * 「肢ごとの最新結果」から、論点1件の習熟統計(TopicProgress)と、
 * 分野・全体単位のサマリ「完璧 X/Y論点・獲得 P/M点」(ProgressSummary)を導出する。
 * 検地帳(app/page.tsx)と論点選択画面(app/play/page.tsx)で同じ定義を共有し、
 * 集計ロジックの二重実装を防ぐ。
 *
 * データ源は必ず StorageAdapter 経由の全件履歴(latestByItem で最新化したもの)。
 * getResult の形は Attempt にも play 画面の history エントリにも合わせてある。
 */
import type { Question } from "@/types";
import { itemCountOf } from "@/lib/items";
import { questionMax } from "@/lib/scoring";

/** 肢1件の最新結果。answeredAt は最終審理日の導出に使う(省略可) */
export type ItemResult = { pts: number; max: number; answeredAt?: string };

/** 論点(問題)1件の習熟統計 */
export type TopicProgress = {
  /** 肢数 */
  n: number;
  /** 挑戦済みの肢数 */
  tried: number;
  /** 最新で満点の肢数 */
  perfect: number;
  /** 最新で失点した肢数 */
  weak: number;
  /** 未挑戦の肢数 */
  untried: number;
  /** 挑戦済み肢の最新得点の合計 */
  pts: number;
  /** 論点満点(lib/scoring の questionMax) */
  max: number;
  /** 最終審理日時(ISO)。未挑戦なら null */
  lastAt: string | null;
  /** 0=未着手 / 1=学習中 / 2=完璧(全肢が最新で満点) */
  level: 0 | 1 | 2;
};

/**
 * 論点1件の習熟統計を「肢ごとの最新結果」から導く。
 * getResult は肢番号 ci の最新結果を返す(未挑戦は undefined)。
 */
export function topicProgress(
  q: Question,
  getResult: (ci: number) => ItemResult | undefined,
): TopicProgress {
  const n = itemCountOf(q);
  let tried = 0;
  let perfect = 0;
  let weak = 0;
  let pts = 0;
  let lastAt: string | null = null;
  for (let ci = 0; ci < n; ci++) {
    const r = getResult(ci);
    if (!r) continue;
    tried++;
    pts += r.pts;
    if (r.pts >= r.max) perfect++;
    else weak++;
    if (r.answeredAt && (!lastAt || r.answeredAt > lastAt)) lastAt = r.answeredAt;
  }
  const level = tried === 0 ? 0 : perfect === n ? 2 : 1;
  return {
    n,
    tried,
    perfect,
    weak,
    untried: n - tried,
    pts,
    max: questionMax(q),
    lastAt,
    level,
  };
}

/** 複数論点のサマリ。分野単位にも全体にも同じ形で使う */
export type ProgressSummary = {
  /** 論点数 */
  topics: number;
  /** 完璧(level=2)に到達した論点数 */
  perfectTopics: number;
  /** 獲得点(挑戦済み肢の最新得点の合計) */
  pts: number;
  /** 満点(未挑戦分も含む全論点の満点合計) */
  max: number;
};

/** 論点統計の集合を「完璧 X/Y論点・獲得 P/M点」に畳み込む */
export function summarizeProgress(list: TopicProgress[]): ProgressSummary {
  let perfectTopics = 0;
  let pts = 0;
  let max = 0;
  for (const t of list) {
    if (t.level === 2) perfectTopics++;
    pts += t.pts;
    max += t.max;
  }
  return { topics: list.length, perfectTopics, pts, max };
}
