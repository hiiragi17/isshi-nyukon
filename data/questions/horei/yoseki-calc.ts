import type { Question } from "@/types";

/** q10 容積率(延べ面積の上限・建築基準法52条・calc) */
export const yosekiCalc: Question = {
  id: "q10",
  verified: false,
  category: "法令上の制限",
  topic: "容積率",
  law: "建築基準法52条",
  type: "calc",
  scenario:
    "甲土地に建物を建てる。甲土地は第一種住居地域(容積率の法定乗数は10分の4)にあり、前面道路の幅員は6m、都市計画で定められた指定容積率は300%である。",
  lesson: [
    "容積率は、延べ面積(各階の床面積の合計)の敷地面積に対する上限。",
    "前面道路の幅員が12m未満のときは、指定容積率と「前面道路の幅員 × 法定乗数(住居系4/10・その他6/10)」のうち、小さいほうが限度になる。",
    "延べ面積の上限は、こうして求めた適用容積率に敷地面積を掛けて出す。割合(容積率)と面積を取り違えないこと。",
  ],
  calc: {
    prompt: "甲土地に建てられる建築物の延べ面積の上限を、途中式を組み立てて求めよ。",
    given: [
      { label: "敷地面積", value: "400㎡" },
      { label: "指定容積率", value: "300%" },
      { label: "前面道路の幅員", value: "6m(第一種住居地域・乗数4/10)" },
    ],
    build: [
      {
        label: "第一式 — 適用する容積率を選ぶ",
        options: [
          {
            formula: "前面道路 6m × 4/10 = 240% と 指定 300% の小さいほう → 240%",
            value: 240,
            correct: true,
            trap: "",
          },
          {
            formula: "指定容積率 300% をそのまま用いる",
            value: 300,
            correct: false,
            trap: "前面道路の幅員が12m未満のときは、道路幅員による容積率と比べて小さいほうをとる",
          },
          {
            formula: "前面道路 6m × 6/10 = 360% と 指定 300% の小さいほう → 300%",
            value: 300,
            correct: false,
            trap: "住居系の法定乗数は4/10。6/10(その他の地域)を使う誤り",
          },
        ],
      },
      {
        label: "第二式 — 延べ面積の上限を求める",
        options: [
          {
            formula: "敷地面積 400㎡ × 適用容積率",
            op: "mul",
            operand: 400,
            correct: true,
            trap: "",
          },
          {
            formula: "敷地面積 400㎡ ÷ 適用容積率",
            op: "div",
            operand: 400,
            correct: false,
            trap: "延べ面積は「敷地面積 ÷ 容積率」ではなく「敷地面積 × 容積率」で求める",
          },
          {
            formula: "適用容積率をそのまま延べ面積とする",
            op: "identity",
            correct: false,
            trap: "容積率は割合。延べ面積は敷地面積に容積率を掛けて求める",
          },
        ],
      },
    ],
    canonical: [
      { label: "① 前面道路(12m未満)による容積率", formula: "6m × 4/10 = 240%" },
      { label: "② 指定容積率と比較して小さいほう", formula: "240% ＜ 300% ∴ 適用は240%" },
      { label: "③ 延べ面積の上限", formula: "400㎡ × 240% = 960㎡" },
    ],
    answer: 960,
    unit: "㎡",
  },
};
