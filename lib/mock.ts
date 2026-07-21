/**
 * ミニ模試モード(本試験配分の分野横断・通し出題)の出題構成を組み立てる純粋ロジック。
 *
 * 方針(Issue #101 / 検討 #96):
 * - 本試験の分野配分(権利14 : 業法20 : 法令8 : 税その他8)を縮小比率で再現する
 * - 論点(問題)単位で抽出し、各分野内は shuffle に委ねる。shuffle を差し替え可能に
 *   することで、既定(恒等)なら決定的になりユニットテストできる。実アプリでは
 *   Fisher–Yates を渡して回替わりにする(`lib/quickPick.ts` と同じ作法)
 * - 母集団が配分に満たない分野が出たら、不足分を余力のある分野へ回して total を保つ
 *
 * ここは純粋関数のみ(React / localStorage に依存しない)。
 */
import type { Category } from "@/types";
import type { Shuffle } from "@/lib/quickPick";

/** 分野ごとの出題比重。weight は本試験の出題数(相対比としてのみ使う) */
export type CategoryWeight = { category: Category; weight: number };

/** 本試験の分野配分(権利14 : 業法20 : 法令8 : 税その他8) */
export const EXAM_DISTRIBUTION: CategoryWeight[] = [
  { category: "権利関係(民法)", weight: 14 },
  { category: "宅建業法", weight: 20 },
  { category: "法令上の制限", weight: 8 },
  { category: "税・その他", weight: 8 },
];

/**
 * 最大剰余方式(ハミルトン方式)で total を weights の比に配分する。
 * 各枠に floor(比例配分)を割り当て、余りを小数部の大きい順に1ずつ配る。
 * weights が全て 0、または total <= 0 のときは全て 0。
 */
export function allocateByWeight(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);

  const quotas = weights.map((w) => (w / sum) * total);
  const result = quotas.map(Math.floor);
  let remaining = total - result.reduce((a, b) => a + b, 0);

  // 小数部の大きい順(同点は添字の小さい順)に、余りを1ずつ加える
  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && remaining > 0; k++) {
    result[order[k].i]++;
    remaining--;
  }
  return result;
}

/**
 * 本試験配分に沿って items(論点)から total 件を抽出する。
 *
 * @param items 抽出対象の全論点(問題)
 * @param categoryOf 各 item の分野を返す
 * @param total 抽出する論点数(6〜8 想定)
 * @param distribution 分野ごとの比重(既定は本試験配分)
 * @param shuffle 各分野内の並べ替え(既定は恒等=決定的)
 * @returns 分野順(distribution の順)に並んだ抽出結果
 *
 * 母集団が配分に満たない分野があれば、その不足分を余力のある分野へ
 * distribution の順で回し、母集団全体に余裕がある限り total 件を返す。
 */
export function buildMockSession<T>(
  items: T[],
  categoryOf: (item: T) => Category,
  total: number,
  distribution: CategoryWeight[] = EXAM_DISTRIBUTION,
  shuffle: Shuffle<T> = (a) => a,
): T[] {
  if (total <= 0) return [];

  const pools = distribution.map((d) => ({
    items: items.filter((it) => categoryOf(it) === d.category),
  }));

  const target = allocateByWeight(
    total,
    distribution.map((d) => d.weight),
  );
  // 各分野の母集団数で頭打ちにする(取りすぎない)
  const take = target.map((t, i) => Math.min(t, pools[i].items.length));

  // 頭打ちで生じた不足を、余力のある分野へ distribution 順で1ずつ回す
  let shortfall = total - take.reduce((a, b) => a + b, 0);
  while (shortfall > 0) {
    let moved = false;
    for (let i = 0; i < pools.length && shortfall > 0; i++) {
      if (take[i] < pools[i].items.length) {
        take[i]++;
        shortfall--;
        moved = true;
      }
    }
    if (!moved) break; // どの分野にも空きが無い(母集団を使い切った)
  }

  const selected: T[] = [];
  pools.forEach((p, i) => {
    selected.push(...shuffle([...p.items]).slice(0, take[i]));
  });
  return selected;
}
