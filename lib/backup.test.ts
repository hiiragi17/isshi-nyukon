/**
 * lib/backup.ts のユニットテスト。
 * - serializeBackup / parseBackup: 控えの往復(書き出し→読み戻し)で欠落しない
 * - parseBackup: 壊れた JSON・非対応スキーマ・項目欠落を BackupError で弾く
 *   (= storage を書き換える前に失敗できること)
 * - backupFilename: 日付入りのファイル名形式
 */
import { describe, it, expect } from "vitest";
import type { Attempt } from "@/types";
import {
  serializeBackup,
  parseBackup,
  parseBackupFile,
  backupFilename,
  BackupError,
  BACKUP_SCHEMA,
} from "@/lib/backup";

function attempt(
  questionId: string,
  choiceIndex: number,
  pts: number,
  max: number,
  answeredAt: string,
): Attempt {
  return { questionId, choiceIndex, pts, max, answeredAt, questionRevision: 1 };
}

const SAMPLE: Attempt[] = [
  attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
  attempt("q1", 1, 1, 3, "2026-07-02T00:00:00.000Z"),
  attempt("q2", 0, 0, 2, "2026-07-03T00:00:00.000Z"),
];

describe("serializeBackup / parseBackup — 控えの往復", () => {
  it("全件履歴が欠落なく往復する", () => {
    const restored = parseBackup(serializeBackup(SAMPLE));
    expect(restored).toEqual(SAMPLE);
  });

  it("空の履歴も往復できる", () => {
    expect(parseBackup(serializeBackup([]))).toEqual([]);
  });

  it("書き出した控えは schema と exportedAt を含む", () => {
    const now = new Date("2026-07-15T09:30:00.000Z");
    const file = JSON.parse(serializeBackup(SAMPLE, now));
    expect(file.schema).toBe(BACKUP_SCHEMA);
    expect(file.exportedAt).toBe(now.toISOString());
    expect(file.attempts).toHaveLength(SAMPLE.length);
  });
});

describe("お気に入りを含む控え(#507)", () => {
  const FAVS = ["q1-0", "q2-1"];

  it("お気に入りが成績と一緒に往復する", () => {
    const restored = parseBackupFile(
      serializeBackup(SAMPLE, new Date(), FAVS),
    );
    expect(restored.attempts).toEqual(SAMPLE);
    expect(restored.favorites).toEqual(FAVS);
  });

  it("お気に入りが0件でも、空配列として往復する(復元で全解除される)", () => {
    const restored = parseBackupFile(serializeBackup(SAMPLE, new Date(), []));
    expect(restored.favorites).toEqual([]);
  });

  it("旧形式の控え(favorites なし)も読め、favorites は null(今のお気に入りに触らない)", () => {
    const restored = parseBackupFile(serializeBackup(SAMPLE));
    expect(restored.attempts).toEqual(SAMPLE);
    expect(restored.favorites).toBeNull();
    expect(JSON.parse(serializeBackup(SAMPLE))).not.toHaveProperty("favorites");
  });

  it("parseBackup は成績だけを返す(従来の呼び出しを壊さない)", () => {
    expect(parseBackup(serializeBackup(SAMPLE, new Date(), FAVS))).toEqual(
      SAMPLE,
    );
  });

  it("favorites が文字列配列でない控えは、成績が正しくても弾く", () => {
    for (const bad of [{ not: "array" }, ["q1-0", 1], null, "q1-0"]) {
      const json = JSON.stringify({
        schema: BACKUP_SCHEMA,
        exportedAt: "2026-07-15T00:00:00.000Z",
        attempts: SAMPLE,
        favorites: bad,
      });
      expect(() => parseBackupFile(json)).toThrow(BackupError);
    }
  });
});

describe("お気に入りの形式の検証(#507)", () => {
  const withFavorites = (favorites: unknown) =>
    JSON.stringify({
      schema: BACKUP_SCHEMA,
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: SAMPLE,
      favorites,
    });

  it("itemKey の形式でない文字列が混ざる控えは弾く(成績にも触れない)", () => {
    for (const bad of ["q1", "q1-", "-0", "q1-x", "q1- 1", "q1-1.5", ""]) {
      expect(() => parseBackupFile(withFavorites(["q1-0", bad]))).toThrow(
        BackupError,
      );
    }
  });

  it("questionId にハイフンを含む itemKey も受け入れる", () => {
    expect(parseBackupFile(withFavorites(["q-sp-1-0"])).favorites).toEqual([
      "q-sp-1-0",
    ]);
  });

  it("形式が正しければ、いまの問題データに無い問題のキーでも弾かない(問題の入れ替え前の控えを復元できる)", () => {
    expect(parseBackupFile(withFavorites(["removed-q-0"])).favorites).toEqual([
      "removed-q-0",
    ]);
  });
});

describe("parseBackup — 不正な控えは書き戻す前に弾く", () => {
  it("壊れた JSON は BackupError", () => {
    expect(() => parseBackup("{broken")).toThrow(BackupError);
  });

  it("配列そのもの(トップレベルが配列)は非対応形式として弾く", () => {
    expect(() => parseBackup(JSON.stringify(SAMPLE))).toThrow(BackupError);
  });

  it("非対応スキーマは弾く", () => {
    const bad = JSON.stringify({
      schema: "other:v9",
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: SAMPLE,
    });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });

  it("attempts が配列でないものは弾く", () => {
    const bad = JSON.stringify({
      schema: BACKUP_SCHEMA,
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: { not: "array" },
    });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });

  it("項目が欠けた成績が混ざっていれば弾く", () => {
    const bad = JSON.stringify({
      schema: BACKUP_SCHEMA,
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: [{ questionId: "q1", choiceIndex: 0 }], // pts/max/answeredAt 欠落
    });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });

  it("型の違う成績(pts が文字列)も弾く", () => {
    const bad = JSON.stringify({
      schema: BACKUP_SCHEMA,
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: [
        {
          questionId: "q1",
          choiceIndex: 0,
          pts: "2",
          max: 2,
          answeredAt: "2026-07-01T00:00:00.000Z",
          questionRevision: 1,
        },
      ],
    });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });

  it("日時として解釈できない answeredAt は弾く(復元後の SRS 例外を防ぐ)", () => {
    // 形は Attempt でも answeredAt が壊れていると、復元後に
    // buildSummonQueue の dueAt.toISOString() が RangeError を投げるため、
    // ここで弾いてダッシュボードの描画不能を防ぐ
    const bad = JSON.stringify({
      schema: BACKUP_SCHEMA,
      exportedAt: "2026-07-15T00:00:00.000Z",
      attempts: [
        {
          questionId: "q1",
          choiceIndex: 0,
          pts: 2,
          max: 2,
          answeredAt: "not-a-date",
          questionRevision: 1,
        },
      ],
    });
    expect(() => parseBackup(bad)).toThrow(BackupError);
  });
});

describe("backupFilename — 日付入りのファイル名", () => {
  it("isshi-nyukon-backup-YYYYMMDD.json 形式(月日はゼロ埋め)", () => {
    expect(backupFilename(new Date(2026, 6, 15))).toBe(
      "isshi-nyukon-backup-20260715.json",
    );
    expect(backupFilename(new Date(2026, 0, 3))).toBe(
      "isshi-nyukon-backup-20260103.json",
    );
  });
});

describe("問題の版番号(questionRevision)と旧形式の控え(#592)", () => {
  const fileWith = (attempts: unknown[], schema: string = BACKUP_SCHEMA) =>
    JSON.stringify({
      schema,
      exportedAt: "2026-11-14T00:00:00.000Z",
      attempts,
    });
  const base = {
    questionId: "q1",
    choiceIndex: 0,
    pts: 2,
    max: 2,
    answeredAt: "2026-11-01T00:00:00.000Z",
  };

  it("questionRevision は往復で保たれる(版が違う記録も、そのまま残る)", () => {
    const mixed: Attempt[] = [
      { ...base, questionRevision: 1 },
      { ...base, choiceIndex: 1, questionRevision: 2 },
      { ...base, questionId: "q9", questionRevision: 7 },
    ];
    const restored = parseBackup(serializeBackup(mixed));
    expect(restored).toEqual(mixed);
    expect(restored.map((a) => a.questionRevision)).toEqual([1, 2, 7]);
  });

  it("古い形式(v1)の控えは、中身が正しくても、理由を示して断る", () => {
    const legacy = fileWith([base], "isshi-nyukon:attempts:v1");
    expect(() => parseBackupFile(legacy)).toThrow(BackupError);
    expect(() => parseBackupFile(legacy)).toThrow(/古い形式/);
  });

  it("古い形式(v1)の控えは、questionRevision を持っていても断る(スキーマで判別する)", () => {
    const legacy = fileWith(
      [{ ...base, questionRevision: 1 }],
      "isshi-nyukon:attempts:v1",
    );
    expect(() => parseBackupFile(legacy)).toThrow(/古い形式/);
  });

  it("現行スキーマでも、questionRevision の無い記録が混ざっていれば断る", () => {
    expect(() =>
      parseBackupFile(fileWith([{ ...base, questionRevision: 1 }, base])),
    ).toThrow(BackupError);
  });

  it("questionRevision が1以上の整数でない記録は断る", () => {
    for (const bad of [0, -1, 1.5, "1", null, Number.NaN]) {
      expect(() =>
        parseBackupFile(fileWith([{ ...base, questionRevision: bad }])),
      ).toThrow(BackupError);
    }
  });

  it("いまの問題データに無い問題ID・版の記録は断らない(読み込み側が無視する)", () => {
    const stale = [
      { ...base, questionId: "removed-q", questionRevision: 1 },
      { ...base, questionRevision: 99 },
    ];
    expect(parseBackupFile(fileWith(stale)).attempts).toEqual(stale);
  });
});
