/**
 * 5問免除科目(登録講習修了者の免除対象)の定義。
 *
 * 対象は次の5論点(topicId)。いずれも分野は「税・その他」のまま変えない。分野は模試の配分
 * (`lib/mock.ts` の EXAM_DISTRIBUTION)・弱点判定・スコア履歴の集計単位のため、分野を分けずに
 * **印を付けるだけ**にしている(出題範囲の選択・出題の入口・ダッシュボードの目印に使う)。
 *
 * ※ これは **印と絞り込みの定義のみ**。`data/questions/index.ts` の `QUESTIONS` 配列の
 *   順序(スコア履歴・弱点判定が依存する添字)や、分野・模試の配分には一切影響しない。
 *   同じ topicId の2周目バリアント(例: q113=q54、q124=q123)も、論点単位で同じ印が付く。
 */
import type { Question } from "@/types";

/** 5問免除科目の topicId(住宅金融支援機構・景品表示法・統計・土地・建物) */
export const MENJO_TOPIC_IDS: readonly string[] = [
  "q54", // 住宅金融支援機構
  "q57", // 景品表示法
  "q123", // 統計
  "q55", // 土地
  "q56", // 建物
];

const MENJO_SET: ReadonlySet<string> = new Set(MENJO_TOPIC_IDS);

/** 画面に出す短いラベル */
export const MENJO_LABEL = "5問免除";

/** 論点(topicId)が5問免除科目か */
export const isMenjoTopic = (topicId: string): boolean => MENJO_SET.has(topicId);

/** 問題(2周目バリアントを含む)が5問免除科目の論点に属するか */
export const isMenjoQuestion = (q: Pick<Question, "id" | "topicId">): boolean =>
  isMenjoTopic(q.topicId ?? q.id);

/** questions のうち、5問免除科目に属する問題の添字(元の並び順のまま) */
export const menjoQuestionIndices = (
  questions: readonly Pick<Question, "id" | "topicId">[],
): number[] =>
  questions.reduce<number[]>((acc, q, i) => {
    if (isMenjoQuestion(q)) acc.push(i);
    return acc;
  }, []);
