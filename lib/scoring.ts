/**
 * 一肢入魂 — スコアリング(得点の唯一の定義)
 *
 * `reference/prototype/takken-zenshi-game.jsx` の maxOf が正(CLAUDE.md):
 * zenshi は ○肢=2点 / ×肢=3点、calc=2点、spot=errorCount。
 * 満点計算はアプリ側で重複定義せず、必ずここを参照する。
 */
import type { Question } from "@/types";
import { itemCountOf } from "@/lib/items";

/** 肢(item)1件の満点。ci は zenshi の肢番号(calc / spot は 0 のみ) */
export function maxOf(q: Question, ci: number): number {
  if (q.type === "calc") return 2;
  if (q.type === "spot") return q.spot!.errorCount;
  return q.choices![ci].correct ? 2 : 3;
}

/** 論点(問題)1件の満点 = 全肢の満点の合計 */
export function questionMax(q: Question): number {
  let sum = 0;
  for (let ci = 0; ci < itemCountOf(q); ci++) sum += maxOf(q, ci);
  return sum;
}
