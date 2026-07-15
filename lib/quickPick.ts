/**
 * 少量モード(通勤のスキマに数肢だけ)の出題順を組み立てる純粋ロジック。
 *
 * 方針: 弱点 → 未着手 → その他 の優先順で拾い、各層内は shuffle に委ねてから
 * n 件に切る。shuffle を差し替え可能にすることで、既定(恒等)なら決定的になり
 * ユニットテストできる。実アプリでは Fisher–Yates を渡してセッションごとに
 * 並びを変える。
 */

/** 肢1件の学習状態。weak=最新失点 / untried=未着手 / other=最新満点 */
export type QuickState = "weak" | "untried" | "other";

/** 各層内の並びを決める関数。既定は恒等(並べ替えない=決定的) */
export type Shuffle<T> = (items: T[]) => T[];

/**
 * items を weak → untried → other の順に並べ、n 件に切る。
 * @param classify 各 item の学習状態を返す
 * @param n 出題する肢数
 * @param shuffle 各層内の並べ替え(省略時は恒等)
 */
export function buildQuickSession<T>(
  items: T[],
  classify: (item: T) => QuickState,
  n: number,
  shuffle: Shuffle<T> = (a) => a,
): T[] {
  const weak: T[] = [];
  const untried: T[] = [];
  const other: T[] = [];
  for (const it of items) {
    const state = classify(it);
    if (state === "weak") weak.push(it);
    else if (state === "untried") untried.push(it);
    else other.push(it);
  }
  const ordered = [...shuffle(weak), ...shuffle(untried), ...shuffle(other)];
  return n < 0 ? [] : ordered.slice(0, n);
}

/** Fisher–Yates シャッフル(引数を破壊的に並べ替えて返す) */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
