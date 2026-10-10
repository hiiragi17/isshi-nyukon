import { QUESTIONS } from "@/data/questions";
import { itemKeysForTopic } from "@/lib/items";
import { SHEETS } from "./index";

/** 論点から暗記シートの節へのリンク先 */
export type SheetLink = {
  sheetId: string;
  sectionId: string;
};

/**
 * 論点(`Question.topicId`、無ければ `id`)から、関連する暗記シートの節への対応表。
 *
 * `Question` 型や各問題ファイルには持たせず、ここ1か所で持つ(リンクは論点単位)。
 * 暗記シートの節や論点を増やしたら、ここも足す。`links.test.ts` が、対応表の論点と
 * 節が実在することを検査する。
 */
export const SHEET_LINKS: Record<string, SheetLink> = {
  // 建築基準法の数字
  q47: { sheetId: "horei-suuji", sectionId: "kenchiku" }, // 建築確認(増築10㎡・用途変更200㎡)
  q69: { sheetId: "horei-suuji", sectionId: "kenchiku" }, // 単体規定(避雷・非常用昇降機・採光換気)
  q9: { sheetId: "horei-suuji", sectionId: "kenchiku" }, // 建蔽率・容積率(前面道路・建蔽率の緩和)
  q10: { sheetId: "horei-suuji", sectionId: "kenchiku" }, // 容積率の計算
  q49: { sheetId: "horei-suuji", sectionId: "kenchiku" }, // 集団規定(斜線制限・天空率)
  // 用途地域
  q7: { sheetId: "horei-suuji", sectionId: "youto" },
  // 開発許可
  q8: { sheetId: "horei-suuji", sectionId: "kaihatsu" },
  // 国土利用計画法
  q25: { sheetId: "horei-suuji", sectionId: "kokudo" },
};

/** 画面に出すリンク。見出しは暗記シート側の節の見出しを使う(二重管理しない) */
export type ResolvedSheetLink = {
  href: string;
  /** 節の見出し(例: 開発許可) */
  heading: string;
  /** 暗記シートの題名 */
  sheetTitle: string;
};

/** 暗記シートの節の下に出す、論点の問題へのリンク */
export type SectionQuestionLink = {
  topicId: string;
  /** 論点名(`Question.topic`) */
  topic: string;
  /** その論点の全肢で `/play` を開始するリンク */
  href: string;
};

/**
 * 暗記シートの節に対応する論点の問題リンクを返す(`SHEET_LINKS` の逆引き)。
 * 同じ論点の問題が複数ファイルあれば、全肢をまとめて出題する。
 * 問題データに無い論点は捨てる。
 */
export function questionLinksForSection(
  sheetId: string,
  sectionId: string,
): SectionQuestionLink[] {
  return Object.entries(SHEET_LINKS)
    .filter(([, l]) => l.sheetId === sheetId && l.sectionId === sectionId)
    .flatMap(([topicId]) => {
      const keys = itemKeysForTopic(topicId, QUESTIONS);
      const q = QUESTIONS.find((x) => (x.topicId ?? x.id) === topicId);
      if (!q || !keys.length) return [];
      return [{ topicId, topic: q.topic, href: `/play?items=${keys.join(",")}` }];
    });
}

/** 論点IDに対応する暗記シートのリンクを返す。対応が無い、または節が見つからなければ null */
export function sheetLinkFor(topicId: string): ResolvedSheetLink | null {
  const link = SHEET_LINKS[topicId];
  if (!link) return null;
  const sheet = SHEETS.find((s) => s.id === link.sheetId);
  const section = sheet?.sections.find((s) => s.id === link.sectionId);
  if (!sheet || !section) return null;
  return {
    href: `/learn/sheets/${sheet.id}#${section.id}`,
    heading: section.heading,
    sheetTitle: sheet.title,
  };
}
