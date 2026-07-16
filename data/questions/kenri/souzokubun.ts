import type { Question } from "@/types";

/** q23 法定相続分(配偶者と子の相続・民法900条・calc) */
export const souzokubun: Question = {
  id: "q23",
  verified: true,
  category: "権利関係(民法)",
  topic: "法定相続分",
  law: "民法900条",
  type: "calc",
  scenario:
    "Aが死亡し、相続人は配偶者Bと、AとBの子であるC・Dの2人である。相続財産は6,000万円であった。",
  lesson: [
    "配偶者は常に相続人になる。配偶者と子が相続人のとき、法定相続分は配偶者2分の1・子(全体)2分の1(民法900条1号)。",
    "子が複数いるときは、子全体の相続分を頭数で均等に分ける(900条4号)。子が2人なら1人あたり 1/2 × 1/2 = 1/4。",
    "割合を出したら相続財産に掛けて取得額を求める。「配偶者と直系尊属(2/3・1/3)」「配偶者と兄弟姉妹(3/4・1/4)」の割合と取り違えないこと。",
  ],
  diagram: {
    nodes: [
      { id: "B", x: 95, y: 50, label: "B", sub: "配偶者" },
      { id: "A", x: 210, y: 50, label: "A", sub: "被相続人" },
      { id: "C", x: 115, y: 145, label: "C", sub: "子" },
      { id: "D", x: 235, y: 145, label: "D", sub: "子" },
    ],
    edges: [
      { from: "A", to: "B", label: "婚姻", dashed: true },
      { from: "A", to: "C", label: "子" },
      { from: "A", to: "D", label: "子" },
    ],
  },
  calc: {
    prompt: "子Cが取得する法定相続分に当たる額を、途中式を組み立てて求めよ。",
    given: [
      { label: "相続財産", value: "6,000万円" },
      { label: "相続人", value: "配偶者B、子C・Dの2人" },
      { label: "問われている相続人", value: "子C" },
    ],
    build: [
      {
        label: "第一式 — 子Cの法定相続分(割合)を選ぶ",
        options: [
          {
            formula: "配偶者1/2・子全体1/2、子は2人で均分 → C = 1/2 × 1/2 = 1/4",
            value: 25,
            correct: true,
            trap: "",
          },
          {
            formula: "子全体の相続分1/2をそのまま子C一人分とする → 1/2",
            value: 50,
            correct: false,
            trap: "子が複数のときは、子全体の相続分をさらに頭数で均等に分ける(民法900条4号)",
          },
          {
            formula: "配偶者2/3・子全体1/3 とし、子2人で均分 → C = 1/3 × 1/2 = 1/6",
            value: 100 / 6,
            correct: false,
            trap: "2/3・1/3は配偶者と『直系尊属』が相続人のときの割合。配偶者と『子』なら各1/2",
          },
        ],
      },
      {
        label: "第二式 — 子Cの取得額を求める",
        options: [
          {
            formula: "相続財産 6,000万円 × 相続割合",
            op: "mul",
            operand: 6000,
            correct: true,
            trap: "",
          },
          {
            formula: "相続財産 6,000万円 ÷ 相続割合",
            op: "div",
            operand: 6000,
            correct: false,
            trap: "取得額は「相続財産 × 相続割合」で求める。割り算ではない",
          },
          {
            formula: "相続割合(%)をそのまま取得額とする",
            op: "identity",
            correct: false,
            trap: "相続割合は財産に対する割合。金額そのものではない",
          },
        ],
      },
    ],
    canonical: [
      { label: "① 相続人と法定相続分(民法900条1号)", formula: "配偶者B 1/2 ・ 子C・D で 1/2" },
      { label: "② 子は2人で均分(900条4号)", formula: "子1人 = 1/2 × 1/2 = 1/4" },
      { label: "③ 子Cの取得額", formula: "6,000万円 × 1/4 = 1,500万円" },
    ],
    answer: 1500,
    unit: "万円",
  },
};
