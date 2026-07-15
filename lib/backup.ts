/**
 * 一肢入魂 — 成績の控え(バックアップ)入出力
 *
 * localStorage は端末・ブラウザに依存し、データ削除・プライベートモード・
 * 機種変更で消える。DB(Neon)へ分離する前の低コストな耐障害策として、
 * 全件履歴(Attempt[])を JSON で書き出し / 読み戻せるようにする。
 *
 * ここは DOM に依存しない純粋なシリアライズ / パースだけを担う。
 * ファイルのダウンロード・読み込みや storage への書き戻しは UI 層が行う。
 * 復元はまず「置換(上書き)」方針(design の判断どおり)で、
 * 不正・非対応の JSON は書き戻す前に BackupError で弾く。
 */
import type { Attempt } from "@/types";

/**
 * 控えのスキーマ識別子。storage.ts の保存キー(:v1)と歩調を合わせ、
 * 将来スキーマを変えたときに古い控えを判別できるようにする。
 */
export const BACKUP_SCHEMA = "isshi-nyukon:attempts:v1";

/** 書き出す控えファイルの中身 */
export type BackupFile = {
  schema: string;
  exportedAt: string; // ISO日時(書き出した時刻)
  attempts: Attempt[];
};

/** 控えの不正(壊れた JSON・非対応スキーマ・欠けた項目)を表す例外 */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

/** Attempt として妥当な形か(復元時の異物混入を防ぐ) */
function isAttempt(v: unknown): v is Attempt {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.questionId === "string" &&
    typeof a.choiceIndex === "number" &&
    typeof a.pts === "number" &&
    typeof a.max === "number" &&
    // answeredAt は日時として解釈できる文字列に限る。壊れた値を復元すると
    // SRS(nextReviewDate → dueAt の toISOString)が Invalid Date で
    // 例外を投げ、ダッシュボードが描画できなくなるため、ここで弾く。
    typeof a.answeredAt === "string" &&
    !Number.isNaN(Date.parse(a.answeredAt))
  );
}

/** 全件履歴を控えファイルの JSON 文字列にする(整形して人が読める形で) */
export function serializeBackup(
  attempts: Attempt[],
  now: Date = new Date(),
): string {
  const file: BackupFile = {
    schema: BACKUP_SCHEMA,
    exportedAt: now.toISOString(),
    attempts,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * 控えファイルの JSON をパースし、妥当な Attempt[] を返す。
 * 壊れた JSON / 非対応スキーマ / 項目欠落は BackupError を投げる。
 * 例外を投げる = 呼び出し側は storage を一切書き換えずに終われる。
 */
export function parseBackup(json: string): Attempt[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupError("控えファイルとして読み取れません(JSONが壊れています)。");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BackupError("控えファイルの形式が違います。");
  }
  const file = parsed as Record<string, unknown>;

  if (file.schema !== BACKUP_SCHEMA) {
    throw new BackupError(
      "この控えは対応していない版で書き出されています(復元できません)。",
    );
  }
  if (!Array.isArray(file.attempts)) {
    throw new BackupError("控えに成績データが含まれていません。");
  }
  if (!file.attempts.every(isAttempt)) {
    throw new BackupError("控えに壊れた成績データが含まれています。");
  }
  return file.attempts as Attempt[];
}

/** 控えファイルのファイル名。例: isshi-nyukon-backup-20260715.json */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `isshi-nyukon-backup-${y}${m}${d}.json`;
}
