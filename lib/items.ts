/**
 * 肢(item)まわりの共有ヘルパー。
 *
 * 「1論点が持つ肢数」は play / ダッシュボード / 成長グラフの3箇所で使うため、
 * ここに一本化して定義がずれないようにする(calc / spot は1肢、zenshi は肢数)。
 */
import type { Question } from "@/types";
import { itemKey } from "@/lib/storage";

/** 論点(問題)1件が持つ肢数。calc / spot は1、zenshi は choices の数 */
export function itemCountOf(q: Question): number {
  return q.type === "calc" || q.type === "spot" ? 1 : q.choices!.length;
}

/**
 * 論点(topicId)に属する全問題の全肢の itemKey を集める(参考書モードの
 * 「この論点を解く」導線用・Issue #216)。`questions` から `topicId ?? id` が
 * 一致するものを QUESTIONS の出現順ですべて拾うため、頻出論点の2周目(同じ
 * topicId の別ファイル)があれば両方の肢を含む。習熟度による絞り込みはしない
 * (読んだ直後は全肢が妥当という判断。ダッシュボードの再審理とは別挙動)。
 */
export function itemKeysForTopic(
  topicId: string,
  questions: Question[],
): string[] {
  return questions
    .filter((q) => (q.topicId ?? q.id) === topicId)
    .flatMap((q) =>
      Array.from({ length: itemCountOf(q) }, (_, ci) => itemKey(q.id, ci)),
    );
}
