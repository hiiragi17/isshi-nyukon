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
