import type { Question } from "@/types";

/** q5 報酬額の制限(宅建業法46条・calc) */
export const hoshu: Question = {
  id: "q5",
  category: "宅建業法",
  topic: "報酬額の制限",
  law: "宅建業法46条",
  type: "calc",
  scenario:
    "宅建業者A(課税事業者)は、B所有の宅地の売買の媒介を依頼され、売買契約を成立させた。",
  lesson: [
    "売買の媒介報酬の上限(価格400万円超)は、速算式「価格 × 3% + 6万円」で出す。",
    "課税事業者は、計算した報酬の全体に消費税10%を上乗せできる(6万円の部分も課税対象)。",
    "媒介で受け取れるのは、依頼者の一方からこの上限まで。双方から依頼されていれば、それぞれから上限まで受け取れる。",
  ],
  diagram: {
    nodes: [
      { id: "A", x: 90, y: 90, label: "A", sub: "宅建業者(課税)" },
      { id: "B", x: 250, y: 90, label: "B", sub: "依頼者(売主)" },
    ],
    edges: [{ from: "B", to: "A", label: "売買の媒介を依頼" }],
  },
  calc: {
    prompt: "AがBから受領できる報酬の上限額はいくらか。",
    given: [
      { label: "売買価格", value: "3,000万円(税抜)" },
      { label: "取引態様", value: "媒介(依頼者の一方から)" },
      { label: "消費税", value: "Aは課税事業者(10%)" },
    ],
    build: [
      {
        label: "第一式 — 速算式を選ぶ",
        options: [
          { formula: "3,000万円 × 3% + 6万円", value: 96, correct: true, trap: "" },
          {
            formula: "3,000万円 × 5%",
            value: 150,
            correct: false,
            trap: "低価格帯(200万円以下)の率を全体に適用する誤り",
          },
          {
            formula: "(3,000万円 − 400万円) × 4%",
            value: 104,
            correct: false,
            trap: "区分計算と速算式の混同",
          },
        ],
      },
      {
        label: "第二式 — 消費税の扱いを選ぶ",
        options: [
          { formula: "全体に × 1.10(消費税10%)", kind: "taxAll", correct: true, trap: "" },
          {
            formula: "消費税は上乗せしない",
            kind: "taxNone",
            correct: false,
            trap: "課税事業者の上乗せ忘れ — 定番の失点",
          },
          {
            formula: "6万円を除いた部分だけ × 1.10",
            kind: "taxPartial6",
            correct: false,
            trap: "6万円の部分にも消費税はかかる",
          },
        ],
      },
    ],
    canonical: [
      { label: "① 速算式(売買価格400万円超)", formula: "3,000万円 × 3% + 6万円 = 96万円" },
      { label: "② 課税事業者は消費税10%を上乗せ", formula: "96万円 × 1.10 = 105.6万円" },
      { label: "③ 媒介 — 依頼者の一方から受領できる上限", formula: "105.6万円" },
    ],
    answer: 105.6,
    unit: "万円",
  },
};
