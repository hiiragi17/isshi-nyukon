/**
 * 読み物と、同じ論点(topicId)の問題の `lawVersion` の突き合わせ(#426)。
 *
 * 年度更新の機械チェック(`data/questions/integrity.test.ts` の #133)は、問題の
 * `lawVersion.examBasisDate` だけを見ている。読み物には問題と同じ論点の条文・数値が
 * 書かれているので、問題だけを更新して読み物を直し忘れても、それまでのテストは通っていた。
 *
 * ここでは、読み物の `lawVersion` と、同じ topicId の問題の `lawVersion` を項目ごとに比べる。
 * 読み物と問題で扱う条文や照合の経緯が違い、値が食い違うのが正しい組もあるので、
 * そうした組は `LAW_VERSION_SYNC_EXCEPTIONS` に、**食い違っている値そのもの**と理由を記録する。
 * どちらか一方の値が変わると、記録した食い違いと一致しなくなって落ちる——
 * つまり「問題を更新したのに読み物を直し忘れた」(またはその逆)を検出できる。
 *
 * 読み物すべてを年度更新の機械チェックの対象にする案(#426 の案A)は採らない。
 * 年度が変わった瞬間に全部の読み物がいっせいに落ち、再確認の負担が重いため。
 */
import { describe, expect, it } from "vitest";
import type { LawVersion, Question, Reading } from "@/types";
import { QUESTIONS } from "@/data/questions";
import { READINGS } from "@/data/readings";

/** 比べる項目。revisionId と verifiedAgainst は対で動くので両方見る */
const FIELDS = ["examBasisDate", "revisionId", "verifiedAgainst", "driftChecked"] as const;
type Field = (typeof FIELDS)[number];
type FieldDiff = { reading: string | undefined; question: string | undefined };
type LawVersionDiff = Partial<Record<Field, FieldDiff>>;

/** 読み物と問題の lawVersion の食い違い(一致する項目は含めない) */
function lawVersionDiff(reading?: LawVersion, question?: LawVersion): LawVersionDiff {
  const diff: LawVersionDiff = {};
  for (const f of FIELDS) {
    const r = reading?.[f];
    const q = question?.[f];
    if (r !== q) diff[f] = { reading: r, question: q };
  }
  return diff;
}

const topicOf = (q: Question) => q.topicId ?? q.id;

/** 読み物ごとの、同じ topicId の問題との組 */
function pairs(readings: Iterable<Reading>, questions: Question[]) {
  const out: { key: string; reading: Reading; question: Question }[] = [];
  for (const reading of readings) {
    for (const question of questions.filter((q) => topicOf(q) === reading.topicId)) {
      out.push({ key: `${reading.topicId}/${question.id}`, reading, question });
    }
  }
  return out;
}

/** 記録と一致しない食い違いがある組の一覧 */
function unexpectedDiffs(
  readings: Iterable<Reading>,
  questions: Question[],
  exceptions: Record<string, { diff: LawVersionDiff }>,
) {
  return pairs(readings, questions)
    .map(({ key, reading, question }) => ({
      key,
      diff: lawVersionDiff(reading.lawVersion, question.lawVersion),
    }))
    .filter(({ key, diff }) => {
      const expected = exceptions[key]?.diff ?? {};
      return JSON.stringify(diff) !== JSON.stringify(normalize(expected));
    });
}

/** 記録の項目順を FIELDS の順にそろえる(比較を項目の書き順に依存させない) */
function normalize(diff: LawVersionDiff): LawVersionDiff {
  const out: LawVersionDiff = {};
  for (const f of FIELDS) if (diff[f]) out[f] = diff[f];
  return out;
}

/**
 * 読み物と問題の lawVersion が食い違っていてよい組(キーは `topicId/問題ID`)。
 *
 * `diff` には、食い違っている項目の**現在の値**を両側とも書く。どちらかの値が変わったら
 * テストが落ちるので、そのときは、読み物と問題の両方を見直したうえで、ここを書き直す
 * (または食い違いが解消したなら消す)。理由のない登録はしない。
 */
const LAW_VERSION_SYNC_EXCEPTIONS: Record<string, { diff: LawVersionDiff; reason: string }> = {
  "q34/q89": {
    diff: {
      driftChecked: { reading: "checked", question: "not_required" },
    },
    reason:
      "q89 は宅建業法本則(70条・79条・84条)だけに依拠し、版の施行日が基準日と一致するので not_required。読み物は q34 と同じく行政手続法13条(基準日より前に施行された版)も引用するため checked。",
  },
  "q48/q97": {
    diff: {
      revisionId: { reading: "343AC0000000100_20250604_507AC0000000051", question: "343AC0000000100_20260527_508AC0000000023" },
      verifiedAgainst: { reading: "2025-06-04", question: "2026-05-27" },
    },
    reason:
      "q97 は都市計画法の別の条文(8条・15条・15条の2・18条)に依拠し、現行版(令和8年5月27日施行)を版として記録している(基準日時点の版との突き合わせの経緯は q97 の note)。読み物は q48 と同じ令和7年6月4日施行版を記録している。扱う条文と照合の経緯が違う。",
  },
  "q69/q98": {
    diff: {
      driftChecked: { reading: "unchecked", question: "checked" },
    },
    reason:
      "読み物は昭和55年建設省告示第1800号(採光の緩和)に依拠し、告示の基準日時点の版を特定できていないため unchecked。q98 は告示に依拠せず、建築基準法・同施行令の版で checked。",
  },
  "q28/q110": {
    diff: {
      revisionId: { reading: "325AC0000000226_20260605_508AC0000000031", question: "325AC0000000226_20260401_508AC0000000002" },
      verifiedAgainst: { reading: "2026-06-05", question: "2026-04-01" },
      driftChecked: { reading: "checked", question: "not_required" },
    },
    reason:
      "読み物と q28 は地方税法の令和8年6月5日施行版で照合し、基準日版と該当条が逐語一致することを確認して checked。q110・q167・q168 は基準日版(令和8年4月1日施行)そのもので照合したので not_required。照合に使った版が違うだけで、基準日時点の内容は同じことを確認済み。",
  },
  "q28/q167": {
    diff: {
      revisionId: { reading: "325AC0000000226_20260605_508AC0000000031", question: "325AC0000000226_20260401_508AC0000000002" },
      verifiedAgainst: { reading: "2026-06-05", question: "2026-04-01" },
      driftChecked: { reading: "checked", question: "not_required" },
    },
    reason:
      "読み物と q28 は地方税法の令和8年6月5日施行版で照合し、基準日版と該当条が逐語一致することを確認して checked。q110・q167・q168 は基準日版(令和8年4月1日施行)そのもので照合したので not_required。照合に使った版が違うだけで、基準日時点の内容は同じことを確認済み。",
  },
  "q28/q168": {
    diff: {
      revisionId: { reading: "325AC0000000226_20260605_508AC0000000031", question: "325AC0000000226_20260401_508AC0000000002" },
      verifiedAgainst: { reading: "2026-06-05", question: "2026-04-01" },
      driftChecked: { reading: "checked", question: "not_required" },
    },
    reason:
      "読み物と q28 は地方税法の令和8年6月5日施行版で照合し、基準日版と該当条が逐語一致することを確認して checked。q110・q167・q168 は基準日版(令和8年4月1日施行)そのもので照合したので not_required。照合に使った版が違うだけで、基準日時点の内容は同じことを確認済み。",
  },
  "q52/q111": {
    diff: {
      revisionId: { reading: "332AC0000000026_20260625_508AC0000000012", question: "332AC0000000026_20260401_508AC0000000012" },
      verifiedAgainst: { reading: "2026-06-25", question: "2026-04-01" },
      driftChecked: { reading: "analysed", question: "not_required" },
    },
    reason:
      "読み物と q52 は所得税法(令和8年6月25日施行版。analysed)。q111 は租税特別措置法36条の2(基準日版。not_required)に依拠しており、法令が違う。",
  },
  "q53/q53": {
    diff: {
      driftChecked: { reading: "unchecked", question: "checked" },
    },
    reason:
      "同じ不動産鑑定評価基準について、読み物(2026-09-23)は利用者提供の PDF が国土交通省の現行公開版そのものか確認できないとして unchecked、問題は PDF の改正履歴から checked としている。判断が分かれており、どちらに揃えるかは要確認(#426 の PR で報告)。",
  },
  "q123/q124": {
    diff: {
      revisionId: { reading: "令和8年地価公示の概要(国土交通省、令和8年3月18日公表)", question: "年次別法人企業統計調査(令和7年度)結果の概要(財務省、令和8年9月1日公表)" },
    },
    reason:
      "統計。revisionId には代表の統計の公表資料を記録している。読み物と q123 は地価公示、q124 は法人企業統計で、代表している統計が違う。",
  },
  "q35/q122": {
    diff: {
      revisionId: { reading: "419AC0000000066_20251001_505AC0000000053", question: "411AC0000000081_20250601_504AC0000000068" },
      verifiedAgainst: { reading: "2025-10-01", question: "2025-06-01" },
    },
    reason:
      "q122 は品確法2条2項(令和7年6月1日施行版)を代表の版として記録している。読み物は q35・q175 と同じ住宅瑕疵担保履行法の版を代表にしている。",
  },
  "q65/q65": {
    diff: {
      examBasisDate: { reading: "2026-04-01", question: undefined },
      revisionId: { reading: "327AC1000000176_20260401_507AC0000000068", question: undefined },
      verifiedAgainst: { reading: "2026-04-01", question: undefined },
    },
    reason:
      "問題 q65 の lawVersion が未記録(版の記録を入れる前の問題)。読み物だけが版を記録している。",
  },
  "q31/q158": {
    diff: {
      driftChecked: { reading: "checked", question: "not_required" },
    },
    reason:
      "読み物と q31 は営業保証金規則5条(基準日より前に施行された版)も引用するため checked。q158 は宅建業法と同法施行令(どちらも基準日版)だけに依拠するので not_required。",
  },
  "q68/q68": {
    diff: {
      examBasisDate: { reading: "2026-04-01", question: undefined },
      revisionId: { reading: "129AC0000000089_20260401_506AC0000000033", question: undefined },
      verifiedAgainst: { reading: "2026-04-01", question: undefined },
      driftChecked: { reading: "not_required", question: "unchecked" },
    },
    reason:
      "問題 q68 の lawVersion が未記録(版の記録を入れる前の問題)。読み物と q105 は同じ版を記録している。",
  },
  "q67/q67": {
    diff: {
      examBasisDate: { reading: "2026-04-01", question: undefined },
      revisionId: { reading: "129AC0000000089_20260401_506AC0000000033", question: undefined },
      verifiedAgainst: { reading: "2026-04-01", question: undefined },
      driftChecked: { reading: "not_required", question: "unchecked" },
    },
    reason:
      "問題 q67 の lawVersion が未記録(版の記録を入れる前の問題)。読み物だけが版を記録している。",
  },
  "q20/q20": {
    diff: {
      driftChecked: { reading: "unchecked", question: "checked" },
    },
    reason:
      "読み物は38条1項・2項・4項を版の記載のない提示原文で引用しており、照合した版との一致が未確認のため unchecked。問題は照合した版の条文だけに依拠して checked。",
  },
  "q70/q70": {
    diff: {
      revisionId: { reading: undefined, question: "403AC0000000090_20260521" },
      verifiedAgainst: { reading: undefined, question: "2026-05-21" },
      driftChecked: { reading: "unchecked", question: "analysed" },
    },
    reason:
      "読み物が引用した原文(2026-10-06 提示)には版の記載がなく、版を記録していない(unchecked)。問題は令和8年5月21日施行版で照合し analysed。",
  },
  "q71/q71": {
    diff: {
      revisionId: { reading: undefined, question: "403AC0000000090_20260521" },
      verifiedAgainst: { reading: undefined, question: "2026-05-21" },
      driftChecked: { reading: "unchecked", question: "analysed" },
    },
    reason:
      "読み物が引用した原文(2026-10-06 提示)には版の記載がなく、版を記録していない(unchecked)。問題は令和8年5月21日施行版で照合し analysed。",
  },
  "q66/q66": {
    diff: {
      examBasisDate: { reading: "2026-04-01", question: undefined },
      revisionId: { reading: "129AC0000000089_20260401_506AC0000000033", question: undefined },
      verifiedAgainst: { reading: "2026-04-01", question: undefined },
      driftChecked: { reading: "not_required", question: "unchecked" },
    },
    reason:
      "問題 q66 の lawVersion が未記録(版の記録を入れる前の問題)。読み物だけが版を記録している。",
  },
};

describe("読み物と同じ論点の問題の lawVersion(#426)", () => {
  it("すべての読み物に、同じ topicId の問題がある", () => {
    const orphans = [...READINGS.values()]
      .filter((r) => !QUESTIONS.some((q) => topicOf(q) === r.topicId))
      .map((r) => r.topicId);
    expect(orphans, "対応する問題が無い読み物").toEqual([]);
  });

  it("読み物の lawVersion が、同じ論点の問題と一致する(食い違いは記録したものだけ)", () => {
    const found = unexpectedDiffs(READINGS.values(), QUESTIONS, LAW_VERSION_SYNC_EXCEPTIONS);
    expect(
      found,
      [
        "読み物と同じ論点の問題とで、lawVersion が記録と違う形で食い違っている:",
        ...found.map(({ key, diff }) => `  ${key}: ${JSON.stringify(diff)}`),
        "",
        "すべきこと:",
        "1. 問題か読み物の一方だけを更新していないか確認する(年度更新・版の差し替え・数値の更新など)",
        "2. 更新漏れなら、もう一方も原文で見直して lawVersion を揃える(照合シートも併せて直す)",
        "3. 扱う条文や照合の経緯が違い、食い違うのが正しいなら、",
        "   LAW_VERSION_SYNC_EXCEPTIONS の該当の組を、現在の値と理由で書き直す",
      ].join("\n"),
    ).toEqual([]);
  });

  it("除外リストが監査可能な状態を保っている", () => {
    const keys = new Set(pairs(READINGS.values(), QUESTIONS).map((p) => p.key));
    for (const [key, { diff, reason }] of Object.entries(LAW_VERSION_SYNC_EXCEPTIONS)) {
      expect(keys.has(key), `除外リストの ${key} に対応する読み物と問題の組が無い`).toBe(true);
      expect(reason.trim(), `除外リストの ${key} に理由が書かれていない`).not.toBe("");
      // 食い違いが無い組を登録しても意味がない(解消したら消す)。
      expect(Object.keys(diff).length, `除外リストの ${key} に食い違いが書かれていない`).toBeGreaterThan(0);
    }
  });

  it("問題だけを更新すると、読み物の更新漏れとして検出する(検査自体の確認)", () => {
    // 食い違いの無い組の問題の examBasisDate だけを翌年度に進めると、検出される。
    const clean = pairs(READINGS.values(), QUESTIONS).find(
      ({ key, question }) =>
        !LAW_VERSION_SYNC_EXCEPTIONS[key] && question.lawVersion?.examBasisDate,
    );
    expect(clean, "食い違いの無い組").toBeDefined();
    const updated: Question = {
      ...clean!.question,
      lawVersion: { ...clean!.question.lawVersion, examBasisDate: "2099-04-01" },
    };
    const questions = QUESTIONS.map((q) => (q.id === updated.id ? updated : q));
    expect(
      unexpectedDiffs(READINGS.values(), questions, LAW_VERSION_SYNC_EXCEPTIONS).map((d) => d.key),
    ).toContain(clean!.key);

    // 食い違いを記録した組でも、記録した値から動けば検出される。
    const [exceptedKey] = Object.keys(LAW_VERSION_SYNC_EXCEPTIONS);
    const [, exceptedId] = exceptedKey.split("/");
    const q = QUESTIONS.find((x) => x.id === exceptedId)!;
    const moved = QUESTIONS.map((x) =>
      x.id === q.id ? { ...q, lawVersion: { ...q.lawVersion, examBasisDate: "2099-04-01" } } : x,
    );
    expect(
      unexpectedDiffs(READINGS.values(), moved, LAW_VERSION_SYNC_EXCEPTIONS).map((d) => d.key),
    ).toContain(exceptedKey);
  });
});
