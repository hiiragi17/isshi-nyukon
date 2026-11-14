/**
 * lib/attempts.ts のユニットテスト(#592)。
 *
 * 問題の版番号が現在の問題データと合わない Attempt が、弱点判定・SRS(召喚状)・
 * 成長グラフ・習熟・進捗の**どれにも使われない**ことを確かめる。
 * 判別に時刻を使っていないことを、次の2つの場面で確かめる。
 * - 端末の時計が進んでいる(直す前の記録の answeredAt が、いちばん新しく見える)
 * - 古い版を表示して回答した(問題を直したあとの日時に、直す前の版へ回答した)
 */
import { describe, it, expect } from "vitest";
import type { Attempt, Question } from "@/types";
import { currentAttempts, loadAttempts, revisionOf } from "@/lib/attempts";
import { normalizeQuestion } from "@/lib/questions";
import { latestByItem, itemKey } from "@/lib/storage";
import { buildSummonQueue, type SrsTarget } from "@/lib/srs";
import { buildGrowth } from "@/lib/growth";
import { topicProgress, summarizeProgress } from "@/lib/progress";
import { parseBackupFile, serializeBackup } from "@/lib/backup";

/** 肢2つの zenshi 問題(○肢=2点 / ×肢=3点) */
function q2(id: string, revision?: number): Question {
  return {
    id,
    category: "宅建業法",
    topic: id,
    law: "テスト",
    lesson: [],
    ...(revision === undefined ? {} : { revision }),
    choices: [
      { segments: ["a"], correct: true, reasons: [], explanation: "" },
      { segments: ["b"], correct: false, wrongIndex: 0, reasons: [], explanation: "" },
    ],
  };
}

function attempt(
  questionId: string,
  choiceIndex: number,
  pts: number,
  max: number,
  answeredAt: string,
  questionRevision: number,
): Attempt {
  return { questionId, choiceIndex, pts, max, answeredAt, questionRevision };
}

/** 現在の問題データ。qA は肢を直して版2になった。qB は直していない(版1) */
const QUESTIONS: Question[] = [q2("qA", 2), q2("qB")].map(normalizeQuestion);
const TARGETS: SrsTarget[] = QUESTIONS.flatMap((q) =>
  [0, 1].map((choiceIndex) => ({ questionId: q.id, choiceIndex })),
);
const NOW = new Date("2026-11-14T00:00:00.000Z");

/** 集計一式を、画面と同じ経路(currentAttempts を通した記録)で求める */
function aggregate(all: Attempt[]) {
  const current = currentAttempts(all, QUESTIONS);
  const latest = latestByItem(current);
  const queue = buildSummonQueue(TARGETS, current, NOW);
  const bucketOf = (questionId: string, choiceIndex: number) =>
    queue.find((s) => s.key === itemKey(questionId, choiceIndex))!.bucket;
  const progress = QUESTIONS.map((q) =>
    topicProgress(q, (ci) => latest.get(itemKey(q.id, ci))),
  );
  return {
    current,
    latest,
    bucketOf,
    progress,
    summary: summarizeProgress(progress),
    growth: buildGrowth(current, QUESTIONS),
  };
}

describe("revisionOf / normalizeQuestion — 版番号の既定値", () => {
  it("revision を省略した問題は 1", () => {
    expect(revisionOf(q2("x"))).toBe(1);
    expect(normalizeQuestion(q2("x")).revision).toBe(1);
  });

  it("指定した revision は保たれる", () => {
    expect(normalizeQuestion(q2("x", 3)).revision).toBe(3);
  });
});

describe("currentAttempts — 版番号が一致する記録だけを返す", () => {
  it("一致する記録は順序を保って残り、一致しない記録だけが落ちる", () => {
    const a1 = attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1); // 直す前
    const a2 = attempt("qB", 0, 2, 2, "2026-11-02T00:00:00.000Z", 1);
    const a3 = attempt("qA", 0, 0, 2, "2026-11-03T00:00:00.000Z", 2);
    expect(currentAttempts([a1, a2, a3], QUESTIONS)).toEqual([a2, a3]);
  });

  it("渡した配列は書き換えない(履歴は消さない)", () => {
    const all = [attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1)];
    const copy = [...all];
    currentAttempts(all, QUESTIONS);
    expect(all).toEqual(copy);
  });

  it("現在の問題データにない問題IDの記録は落とす", () => {
    const gone = attempt("removed", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1);
    expect(currentAttempts([gone], QUESTIONS)).toEqual([]);
  });

  it("現在より新しい版の記録も落とす(問題を前の版へ戻した場合など。一致だけを使う)", () => {
    const future = attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 3);
    expect(currentAttempts([future], QUESTIONS)).toEqual([]);
  });

  it("版番号を持たない記録(壊れた保存データ)は落とす", () => {
    const broken = {
      questionId: "qB",
      choiceIndex: 0,
      pts: 2,
      max: 2,
      answeredAt: "2026-11-01T00:00:00.000Z",
    } as Attempt;
    expect(currentAttempts([broken], QUESTIONS)).toEqual([]);
  });

  it("正規化していない問題(revision 省略)も版1として照合する", () => {
    const a = attempt("raw", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1);
    expect(currentAttempts([a], [q2("raw")])).toEqual([a]);
  });
});

describe("版が合わない記録は、どの集計にも使われない", () => {
  it("端末の時計が進んでいた場合: 直す前の満点の記録が最新に見えても、使わない", () => {
    // 直す前(版1)に qA を全肢満点。端末の時計が進んでいて、answeredAt は未来の日付
    const stale = [
      attempt("qA", 0, 2, 2, "2027-03-01T00:00:00.000Z", 1),
      attempt("qA", 1, 3, 3, "2027-03-01T00:00:00.000Z", 1),
    ];
    // 直したあと(版2)に、肢0だけを回答して失点。answeredAt は実際の日付で、stale より古い
    const fresh = attempt("qA", 0, 0, 2, "2026-11-10T00:00:00.000Z", 2);
    const r = aggregate([...stale, fresh]);

    // 時刻で選ぶと stale(満点)が勝つ。版で選ぶので、失点の記録が使われる
    expect(latestByItem([...stale, fresh]).get("qA-0")).toBe(stale[0]);
    expect(r.latest.get("qA-0")).toBe(fresh);
    // 肢1は、直したあとは未挑戦
    expect(r.latest.has("qA-1")).toBe(false);

    // 弱点判定・SRS
    expect(r.bucketOf("qA", 0)).toBe("weak");
    expect(r.bucketOf("qA", 1)).toBe("new");
    // 習熟・進捗(完璧にならない)
    expect(r.progress[0]).toMatchObject({ tried: 1, perfect: 0, weak: 1, untried: 1, level: 1 });
    // 成長グラフ(直す前の2件は数えず、集印もつかない)
    expect(r.growth.totalAttempts).toBe(1);
    expect(r.growth.currentSeal).toBe(0);
    expect(r.growth.maxSeal).toBe(0);
    expect(r.growth.points.map((p) => p.day)).not.toContain("2027-03-01");
  });

  it("古い版を表示して回答した場合: 直したあとの日時の記録でも、表示した版が古ければ使わない", () => {
    // 問題を直した(版2)あと、オフラインで古いページ(版1)が表示され、全肢満点で回答した。
    // answeredAt は直したあとの日時だが、記録される版は、画面が表示した版1
    const offline = [
      attempt("qA", 0, 2, 2, "2026-11-13T00:00:00.000Z", 1),
      attempt("qA", 1, 3, 3, "2026-11-13T00:00:00.000Z", 1),
    ];
    const r = aggregate(offline);

    expect(r.current).toEqual([]);
    expect(r.latest.size).toBe(0);
    // 未挑戦のまま(満点扱いにして復習を後回しにしない)
    expect(r.bucketOf("qA", 0)).toBe("new");
    expect(r.bucketOf("qA", 1)).toBe("new");
    expect(r.progress[0]).toMatchObject({ tried: 0, perfect: 0, level: 0 });
    expect(r.growth.totalAttempts).toBe(0);
    expect(r.growth.points).toEqual([]);
    expect(r.growth.currentSeal).toBe(0);
  });

  it("直していない問題(qB)の記録は、これまでどおり集計に使われる", () => {
    const all = [
      // qA の直す前の記録(使われない)
      attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1),
      attempt("qA", 1, 3, 3, "2026-11-01T00:00:00.000Z", 1),
      // qB は全肢満点(使われる)
      attempt("qB", 0, 2, 2, "2026-11-13T00:00:00.000Z", 1),
      attempt("qB", 1, 3, 3, "2026-11-13T00:00:00.000Z", 1),
    ];
    const r = aggregate(all);

    expect(r.progress[1].level).toBe(2);
    expect(r.progress[0].level).toBe(0);
    expect(r.bucketOf("qB", 0)).toBe("later");
    expect(r.bucketOf("qA", 0)).toBe("new");
    expect(r.growth.totalAttempts).toBe(2);
    expect(r.growth.currentSeal).toBe(1);
    // フィルタを通さないと、qA まで完璧(集印2)に見えてしまう
    expect(buildGrowth(all, QUESTIONS).currentSeal).toBe(2);
  });

  it("SRS の間隔にも、直す前の満点を数えない", () => {
    // 直す前に満点2回(間隔が伸びていた)。直したあとに満点1回
    const all = [
      attempt("qA", 0, 2, 2, "2026-10-01T00:00:00.000Z", 1),
      attempt("qA", 0, 2, 2, "2026-10-05T00:00:00.000Z", 1),
      attempt("qA", 0, 2, 2, "2026-11-13T00:00:00.000Z", 2),
    ];
    const current = currentAttempts(all, QUESTIONS);
    const state = (attempts: Attempt[]) =>
      buildSummonQueue(TARGETS, attempts, NOW).find((s) => s.key === "qA-0")!;
    expect(state(current).attemptCount).toBe(1);
    expect(state(current).intervalDays).toBeLessThan(state(all).intervalDays);
  });
});

describe("loadAttempts — 読み込みの境界", () => {
  it("all は保存されている全件、current は版が合う記録だけ", async () => {
    const stale = attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1);
    const ok = attempt("qB", 0, 2, 2, "2026-11-02T00:00:00.000Z", 1);
    const adapter = { getAttempts: async () => [stale, ok] };
    await expect(loadAttempts(adapter, QUESTIONS)).resolves.toEqual({
      all: [stale, ok],
      current: [ok],
    });
  });

  it("読み取りの失敗は握りつぶさず伝える", async () => {
    const adapter = {
      getAttempts: async (): Promise<Attempt[]> => {
        throw new Error("read failed");
      },
    };
    await expect(loadAttempts(adapter, QUESTIONS)).rejects.toThrow("read failed");
  });
});

describe("控えの往復のあとも、版番号の照合が効く", () => {
  it("直す前に書き出した控えを復元しても、版が合わない記録は集計に使われない", () => {
    // 直す前(版1)の qA 全肢満点を含む控え
    const exported: Attempt[] = [
      attempt("qA", 0, 2, 2, "2026-11-01T00:00:00.000Z", 1),
      attempt("qA", 1, 3, 3, "2026-11-01T00:00:00.000Z", 1),
      attempt("qB", 0, 0, 2, "2026-11-02T00:00:00.000Z", 1),
    ];
    const restored = parseBackupFile(serializeBackup(exported)).attempts;

    // 控えは履歴をそのまま保つ(版番号を含めて、1件も落とさない)
    expect(restored).toEqual(exported);

    const r = aggregate(restored);
    expect(r.current).toEqual([exported[2]]);
    expect(r.progress[0].level).toBe(0);
    expect(r.bucketOf("qA", 0)).toBe("new");
    expect(r.bucketOf("qB", 0)).toBe("weak");
    expect(r.growth.totalAttempts).toBe(1);
    expect(r.growth.currentSeal).toBe(0);
  });
});
