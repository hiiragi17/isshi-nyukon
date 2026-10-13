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

/**
 * 書き出す控えファイルの中身。
 * favorites は任意項目(お気に入りの itemKey の配列)。お気に入りを含めない旧形式の控えも
 * 同じ schema のまま読めるよう、無いことを許す(#507)。
 */
export type BackupFile = {
  schema: string;
  exportedAt: string; // ISO日時(書き出した時刻)
  attempts: Attempt[];
  favorites?: string[];
};

/**
 * 控えを読み込んだ結果。favorites が null は「控えにお気に入りが含まれない」(旧形式)で、
 * この場合は復元しても今のお気に入りに触らない。配列(空配列を含む)なら置換する。
 */
export type BackupContents = {
  attempts: Attempt[];
  favorites: string[] | null;
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

/** お気に入りとして妥当な形か(文字列だけの配列) */
function isFavoriteList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((k) => typeof k === "string");
}

/**
 * 全件履歴(と、渡されればお気に入り)を控えファイルの JSON 文字列にする
 * (整形して人が読める形で)。favorites を省くと、お気に入りを含まない控えになる。
 */
export function serializeBackup(
  attempts: Attempt[],
  now: Date = new Date(),
  favorites?: string[],
): string {
  const file: BackupFile = {
    schema: BACKUP_SCHEMA,
    exportedAt: now.toISOString(),
    attempts,
    ...(favorites ? { favorites } : {}),
  };
  return JSON.stringify(file, null, 2);
}

/**
 * 控えファイルの JSON をパースし、妥当な成績とお気に入りを返す。
 * 壊れた JSON / 非対応スキーマ / 項目欠落は BackupError を投げる。
 * 例外を投げる = 呼び出し側は storage を一切書き換えずに終われる
 * (成績・お気に入りのどちらかが壊れていても、どちらも書き換えない)。
 */
export function parseBackupFile(json: string): BackupContents {
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
  // favorites は旧形式の控えには無い。キーがあるのに配列でなければ壊れた控えとして弾く
  if ("favorites" in file && !isFavoriteList(file.favorites)) {
    throw new BackupError("控えに壊れたお気に入りデータが含まれています。");
  }
  return {
    attempts: file.attempts as Attempt[],
    favorites: "favorites" in file ? (file.favorites as string[]) : null,
  };
}

/** 成績だけが必要な呼び出し側向け。お気に入りは読み捨てる */
export function parseBackup(json: string): Attempt[] {
  return parseBackupFile(json).attempts;
}

/** 控えファイルのファイル名。例: isshi-nyukon-backup-20260715.json */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `isshi-nyukon-backup-${y}${m}${d}.json`;
}
