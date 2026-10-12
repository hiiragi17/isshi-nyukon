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
  // 権利関係・表で覚える論点
  q70: { sheetId: "kenri-anki", sectionId: "kenri-shakuchi" }, // 借地借家法(借地権の種類・対抗力)
  q20: { sheetId: "kenri-anki", sectionId: "kenri-teiki-tatemono" }, // 借地借家法(存続期間・更新・定期借家)
  q71: { sheetId: "kenri-anki", sectionId: "kenri-teiki-tatemono" }, // 借地借家法(借家の対抗力・正当事由)
  q41: { sheetId: "kenri-anki", sectionId: "kenri-saiken" }, // 債務不履行と解除(履行遅滞の起算点)
  q60: { sheetId: "kenri-anki", sectionId: "kenri-saiken" }, // 債権譲渡・相殺
  q68: { sheetId: "kenri-anki", sectionId: "kenri-saiken" }, // 連帯債務
  q79: { sheetId: "kenri-anki", sectionId: "kenri-saiken" }, // 弁済
  q58: { sheetId: "kenri-anki", sectionId: "kenri-kubun" }, // 区分所有法
  q46: { sheetId: "kenri-anki", sectionId: "kenri-touki" }, // 不動産登記法
  q40: { sheetId: "kenri-anki", sectionId: "kenri-futekigo" }, // 契約不適合責任
  q64: { sheetId: "kenri-anki", sectionId: "kenri-futekigo" }, // 請負・委任
  q66: { sheetId: "kenri-anki", sectionId: "kenri-jikou" }, // 取得時効(時効取得と登記)
  q45: { sheetId: "kenri-anki", sectionId: "kenri-kyoyu-souzoku" }, // 共有
  q62: { sheetId: "kenri-anki", sectionId: "kenri-kyoyu-souzoku" }, // 遺言・遺留分・配偶者居住権
  q22: { sheetId: "kenri-anki", sectionId: "kenri-kyoyu-souzoku" }, // 相続と登記
  q19: { sheetId: "kenri-anki", sectionId: "kenri-teitouken" }, // 抵当権
  q43: { sheetId: "kenri-anki", sectionId: "kenri-hikkake" }, // 賃貸借(民法。修繕)
  // 宅建業法・直前暗記
  q31: { sheetId: "gyoho-anki", sectionId: "gyoho-hoshoukin" }, // 営業保証金
  q32: { sheetId: "gyoho-anki", sectionId: "gyoho-hoshoukin" }, // 保証協会(弁済業務保証金)
  q37: { sheetId: "gyoho-anki", sectionId: "gyoho-hoshoukin" }, // 供託所等に関する説明
  q4: { sheetId: "gyoho-anki", sectionId: "gyoho-cooling-off" }, // クーリングオフ
  q78: { sheetId: "gyoho-anki", sectionId: "gyoho-cooling-off" }, // クーリングオフ(専任宅建士必置場所との非対称)
  q17: { sheetId: "gyoho-anki", sectionId: "gyoho-hozen" }, // 8種制限(手付・保全措置)
  q12: { sheetId: "gyoho-anki", sectionId: "gyoho-35-37" }, // 重要事項の説明(35条)
  q90: { sheetId: "gyoho-anki", sectionId: "gyoho-35-37" }, // 重要事項の説明(管理業者管理者方式)
  q13: { sheetId: "gyoho-anki", sectionId: "gyoho-35-37" }, // 37条書面
  q34: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 監督処分・罰則
  q15: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 免許(基準・欠格事由)
  q72: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 免許の届出・免許換え
  q65: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 宅建業の意味・免許の要否
  q74: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 宅建業者名簿と変更の届出
  q33: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 事務所・案内所の規制
  q38: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 従業者証明書・名簿・帳簿・標識
  q75: { sheetId: "gyoho-anki", sectionId: "gyoho-kantoku" }, // 従業者名簿の記載事項・標識の様式
  q14: { sheetId: "gyoho-anki", sectionId: "gyoho-baikai" }, // 媒介契約
  q36: { sheetId: "gyoho-anki", sectionId: "gyoho-8shu" }, // 8種制限(他人物売買・担保特約・割賦)
  q76: { sheetId: "gyoho-anki", sectionId: "gyoho-8shu" }, // 8種制限(所有権留保・譲渡担保の禁止)
  q5: { sheetId: "gyoho-anki", sectionId: "gyoho-houshu" }, // 報酬額の制限
  q35: { sheetId: "gyoho-anki", sectionId: "gyoho-kashi" }, // 住宅瑕疵担保履行法
  // 税・その他・直前暗記
  q51: { sheetId: "zei-anki", sectionId: "zei-zeikin" }, // 登録免許税
  q27: { sheetId: "zei-anki", sectionId: "zei-zeikin" }, // 不動産取得税
  q28: { sheetId: "zei-anki", sectionId: "zei-zeikin" }, // 固定資産税
  q52: { sheetId: "zei-anki", sectionId: "zei-zeikin" }, // 譲渡所得の特例(住宅ローン控除との併用)
  q53: { sheetId: "zei-anki", sectionId: "zei-kantei" }, // 不動産鑑定評価
  q54: { sheetId: "zei-anki", sectionId: "zei-kikou" }, // 住宅金融支援機構
  q57: { sheetId: "zei-anki", sectionId: "zei-keihin" }, // 景品表示法
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
