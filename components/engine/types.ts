/** エンジン共通の型。3形式(zenshi / calc / spot)で採点結果と遷移の契約を揃える */
import type { Question } from "@/types";

/** 1肢(item)の採点結果 */
export type EngineResult = { pts: number; max: number };

/** 各エンジンが受け取る共通 props */
export type EngineCommonProps = {
  question: Question;
  onTerm: (word: string) => void;
  lessonOpen: boolean;
  onToggleLesson: () => void;
  /** その item を解き終えて採点が確定した瞬間に1回だけ呼ぶ */
  onComplete: (result: EngineResult) => void;
  /** 「次の肢へ / 次の問題へ / 判決を聞く」のラベル(セッション側が決める) */
  nextLabel: string;
  onNext: () => void;
};
