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

/**
 * 権利関係(民法)論点(topicId)の表示順プライオリティ(出題頻度・得点しやすさベース)。
 * docs/design-v1.md「民法内の優先順位」に対応。
 *
 * ※ これも **表示順のみ** の定義(ダッシュボードの検地帳マトリクスの列順)。
 *   QUESTIONS 配列の順序や添字には一切影響しない。
 */
const TOPIC_PRIORITY_HIGH: string[] = [
  // 意思表示
  "q2", // 詐欺・強迫と第三者
  "q18", // 意思表示(虚偽表示・錯誤・心裡留保)
  // 代理
  "q3", // 無権代理
  "q63", // 表見代理・復代理
  // 抵当権
  "q19", // 抵当権(法定地上権・物上代位ほか)
  // 保証・連帯保証
  "q42", // 保証・連帯保証
  "q68", // 連帯債務
  // 賃貸借(借地借家法とも関連)
  "q43", // 賃貸借(民法)
  "q67", // 使用貸借
  "q20", // 借地借家法(存続期間・更新・定期借家)
  "q70", // 借地借家法(借地)
  "q71", // 借地借家法(借家)
  // 相続
  "q23", // 法定相続分
  "q22", // 相続と登記
  "q62", // 遺言・遺留分・配偶者居住権
];

const TOPIC_PRIORITY_MID: string[] = [
  // 物権変動
  "q1", // 二重譲渡
  "q21", // 物権変動と登記
  // 不法行為
  "q59", // 不法行為
  // 契約の解除・弁済
  "q40", // 契約不適合責任
  "q41", // 債務不履行と解除
  "q60", // 債権譲渡・相殺
  "q61", // 危険負担・同時履行の抗弁
  "q79", // 弁済
];

/**
 * 優先度低(判例知識が細かく問われる/条文の例外パターンが多い分野)。
 * 優先度高・中に載らない一般論点よりも、さらに後ろに回す。
 */
export const TOPIC_LOW_PRIORITY: ReadonlySet<string> = new Set([
  "q39", // 制限行為能力者(未成年/成年被後見人/被保佐人/被補助人の細かい例外)
]);

/** 優先度高→中の順に並べた表示順リスト(byTopicPriority の並び替えに使う) */
export const TOPIC_PRIORITY_ORDER: string[] = [
  ...TOPIC_PRIORITY_HIGH,
  ...TOPIC_PRIORITY_MID,
];

/**
 * TOPIC_PRIORITY_ORDER 基準の比較関数。載っていない論点は次点(優先度低の
 * 論点よりは前)に、優先度低の論点はさらにその後ろに回る。同順内は安定ソート
 * (Array.prototype.sort)により元の登場順を保つ。
 */
export function byTopicPriority(a: string, b: string): number {
  const rank = (tid: string) => {
    const i = TOPIC_PRIORITY_ORDER.indexOf(tid);
    if (i >= 0) return i;
    return TOPIC_LOW_PRIORITY.has(tid)
      ? TOPIC_PRIORITY_ORDER.length + 1
      : TOPIC_PRIORITY_ORDER.length;
  };
  return rank(a) - rank(b);
}

/**
 * 論点(topicId)の優先度ラベル。載っていない論点(未分類)は null。
 * 出題範囲選択画面で「この論点は優先度高/中/低」と一目でわかるように表示するために使う。
 */
export function topicPriorityLabel(tid: string): "優先度高" | "優先度中" | "優先度低" | null {
  if (TOPIC_PRIORITY_HIGH.includes(tid)) return "優先度高";
  if (TOPIC_PRIORITY_MID.includes(tid)) return "優先度中";
  if (TOPIC_LOW_PRIORITY.has(tid)) return "優先度低";
  return null;
}
