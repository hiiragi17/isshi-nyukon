import type { Question } from "@/types";

/** q6 広告規制(宅建業法32条・表示規約・spot) */
export const koukokuKisei: Question = {
  id: "q6",
  verified: true,
  category: "宅建業法",
  topic: "広告規制",
  law: "宅建業法32条・表示規約",
  type: "spot",
  scenario:
    "宅建業者「みどり台不動産販売」が出した戸建売買の広告を押収した。この広告には違反が4箇所ある。疑わしい記載をタップし、根拠を持って申し立てよ。誤った申立ては減点。",
  lesson: [
    "誇大広告の禁止(32条): 実際より著しく優良・有利と誤認させる表示は、実害がなくても違反。",
    "表示規約の定番ルール: 「新築」は建築後1年未満かつ未入居だけ / 徒歩は道路距離80m=1分・端数切上げ / 根拠のない最上級表現(日本一・完璧など)は禁止。",
    "得点は「4 − 誤指摘数」。適法な記載を疑って申し立てると減点される。疑わしきは根拠とセットで。",
  ],
  spot: {
    errorCount: 4,
    zones: [
      {
        id: "A",
        violation: true,
        name: "「新築」の表示",
        reason:
          "「新築」と表示できるのは建築後1年未満かつ未入居の物件だけ。この物件は築3年。",
      },
      {
        id: "B",
        violation: true,
        name: "「日本一の眺望」",
        reason: "根拠のない最上級表現(日本一・完璧・抜群 等)は使用禁止。",
      },
      {
        id: "C",
        violation: true,
        name: "徒歩3分(約650m)",
        reason:
          "徒歩分数は道路距離80m=1分・端数切上げ。650mなら9分と表示すべき。",
      },
      {
        id: "D",
        violation: true,
        name: "他物件写真の流用",
        reason:
          "実在する物件の広告は実物の外観写真を用いるべきで、他物件・施工例の写真で代替するのは不当表示。『イメージ・当社施工例』と注記しても、未完成等で撮影できない事情がない限り正当化されない。",
      },
      {
        id: "safePrice",
        violation: false,
        name: "価格の表示",
        note: "税込の総額表示 — 適法です。",
      },
      {
        id: "safeMadori",
        violation: false,
        name: "間取り・面積の表示",
        note: "㎡での表記 — 適法です。",
      },
      {
        id: "safeChiku",
        violation: false,
        name: "築年月の表示",
        note: "事実の記載 — 適法です。ただし、上の「新築」表記と矛盾していないか?",
      },
    ],
  },
};
