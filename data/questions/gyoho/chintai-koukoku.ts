import type { Question } from "@/types";

/** q11 広告規制・賃貸マイソク(宅建業法32条・表示規約・spot) */
export const chintaiKoukoku: Question = {
  id: "q11",
  category: "宅建業法",
  topic: "広告規制(賃貸)",
  law: "宅建業法32条・表示規約",
  type: "spot",
  scenario:
    "宅建業者「さくら住宅サービス」が出した賃貸マンションの広告を押収した。この広告には違反が4箇所ある。疑わしい記載をタップし、根拠を持って申し立てよ。誤った申立ては減点。",
  lesson: [
    "表示規約は賃貸広告にも適用。徒歩分数は道路距離80m=1分・端数切上げ。200mなら3分。",
    "専有面積にバルコニーや共用部分は含めない(壁芯面積で表示)。根拠のない「最安値」等の比較・最上級表現も不当表示。",
    "「初期費用0円」等を強調しつつ実際は費用がかかる表示は、著しく有利と誤認させる不当表示。得点は「4 − 誤指摘数」。",
  ],
  spot: {
    errorCount: 4,
    zones: [
      {
        id: "cost",
        violation: true,
        name: "「初期費用0円!」",
        reason:
          "実際には前家賃・保証料等が必要なのに「初期費用0円」を強調するのは、著しく有利と誤認させる不当表示。",
      },
      {
        id: "best",
        violation: true,
        name: "「地域最安値・掘り出し物件!」",
        reason: "合理的な根拠のない最上級・比較表現(最安値・掘り出し 等)は不当表示。",
      },
      {
        id: "walk",
        violation: true,
        name: "徒歩1分(約200m)",
        reason:
          "徒歩分数は道路距離80m=1分・端数切上げ。200mなら3分と表示すべき。",
      },
      {
        id: "area",
        violation: true,
        name: "専有面積 28.0㎡(バルコニー含む)",
        reason:
          "専有面積にバルコニー(共用部分)は含めない。壁芯面積で表示すべき。",
      },
      {
        id: "safeRent",
        violation: false,
        name: "家賃・管理費の表示",
        note: "家賃と管理費をともに月額で表示 — 適法です。",
      },
      {
        id: "safeDeposit",
        violation: false,
        name: "敷金・礼金の表示",
        note: "事実の記載 — 適法です。",
      },
      {
        id: "safeAddress",
        violation: false,
        name: "所在地の表示",
        note: "事実の記載 — 適法です。",
      },
    ],
  },
};
