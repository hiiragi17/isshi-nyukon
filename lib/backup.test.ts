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
  return { questionId, choiceIndex, pts, max, answeredAt };
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
        { questionId: "q1", choiceIndex: 0, pts: "2", max: 2, answeredAt: "x" },
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
