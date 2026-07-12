/**
 * 肢(item)まわりの共有ヘルパー。
 *
 * 「1論点が持つ肢数」は play / ダッシュボード / 成長グラフの3箇所で使うため、
 * ここに一本化して定義がずれないようにする(calc / spot は1肢、zenshi は肢数)。
 */
import type { Question } from "@/types";

/** 論点(問題)1件が持つ肢数。calc / spot は1、zenshi は choices の数 */
export function itemCountOf(q: Question): number {
  return q.type === "calc" || q.type === "spot" ? 1 : q.choices!.length;
}
