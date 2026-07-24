/**
 * 分野(カテゴリ)の表示順。
 *
 * 学習戦略にもとづく優先度順(得点源の宅建業法を先頭、深追いしない権利関係を末尾)で
 * ダッシュボードのマトリクス行順・出題範囲選択の並びをそろえる。
 *
 * ※ これは **表示順のみ** の定義。`data/questions/index.ts` の `QUESTIONS` 配列の
 *   順序(スコア履歴・弱点判定が依存する添字)や、`lib/mock.ts` の
 *   `EXAM_DISTRIBUTION`(模試の分野配分)には一切影響しない。
 */
import type { Category } from "@/types";

/** 優先度順(宅建業法 → 法令上の制限 → 税・その他 → 権利関係) */
export const CATEGORY_ORDER: Category[] = [
  "宅建業法",
  "法令上の制限",
  "税・その他",
  "権利関係(民法)",
];

/**
 * CATEGORY_ORDER 基準の比較関数。未知の分野はすべて同順(既知分野の後ろ)となり、
 * 安定ソート(Array.prototype.sort)のもとでは元の登場順を保ったまま末尾にまとまる。
 */
export function byCategoryPriority(a: string, b: string): number {
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c as Category);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  return rank(a) - rank(b);
}
