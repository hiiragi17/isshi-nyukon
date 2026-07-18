/**
 * 一肢入魂 — ストレージ抽象化
 *
 * 成績(Attempt)は「全件履歴」で保存する(既決事項)。
 * 弱点判定=最新結果 / SRS=最終挑戦日 / 成長グラフ=全履歴 の3用途を、
 * どれも同じ全件履歴から導出できるようにするため。
 *
 * アプリ側は `StorageAdapter` だけを見る。localStorage → Neon の移行は
 * このファイルの Adapter 差し替えのみで完了する(design-v1.md 3.2)。
 */
import type { Attempt } from "@/types";

/**
 * 成績ストア。実装は localStorage(v1)/ Neon(v3)で差し替える。
 * メソッドは Promise を返す(Neon など非同期実装に備える)。
 */
export interface StorageAdapter {
  /** 保存済みの Attempt を全件、記録順(古い→新しい)で返す */
  getAttempts(): Promise<Attempt[]>;
  /** Attempt を1件、履歴の末尾に追記する(既存は上書きしない) */
  saveAttempt(a: Attempt): Promise<void>;
  /**
   * 全件履歴を丸ごと置き換える(控えからの復元で使う)。
   * 追記の saveAttempt と対になる一括書き込みで、Neon など将来の実装でも
   * 「保存経路は Adapter だけ」の原則を保つために置く。
   */
  replaceAttempts(attempts: Attempt[]): Promise<void>;
}

/** localStorage 上の保存キー。バージョンを含めてスキーマ変更に備える */
const STORAGE_KEY = "isshi-nyukon:attempts:v1";

/**
 * 肢(item)を一意に指す文字列キー。
 * プロトタイプの history キー `${qi}-${ci}` と同じ粒度(問題×肢)。
 */
export function itemKey(questionId: string, choiceIndex: number): string {
  return `${questionId}-${choiceIndex}`;
}

/**
 * 全件履歴から「肢ごとの最新結果」を導出する。
 * キーは itemKey(questionId, choiceIndex)、値はその肢の最も新しい Attempt。
 * プロトタイプの `history`("qi-ci" -> 最新結果)に相当する。
 */
export function latestByItem(attempts: Attempt[]): Map<string, Attempt> {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const key = itemKey(a.questionId, a.choiceIndex);
    const prev = latest.get(key);
    // answeredAt が新しい方を採用。同時刻なら後勝ち(記録順で新しい方)
    if (!prev || a.answeredAt >= prev.answeredAt) {
      latest.set(key, a);
    }
  }
  return latest;
}

/**
 * localStorage 実装(v1)。
 * SSR(window 不在)では読み書きを no-op にして例外を出さない。
 * 破損した JSON は空履歴として扱い、以降の保存で復旧させる。
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly key: string;

  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }

  /** localStorage が使える環境か(SSR / 無効化ブラウザを弾く) */
  private available(): boolean {
    return typeof window !== "undefined" && !!window.localStorage;
  }

  private read(): Attempt[] {
    if (!this.available()) return [];
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * localStorage へ実際に書き込む。書けない環境・容量超過等では例外を投げる。
   * 「失敗を伝えたい経路(復元)」と「伝えたくない経路(追記)」を分けるための土台。
   */
  private persist(attempts: Attempt[]): void {
    if (!this.available()) {
      throw new Error("localStorage が利用できないため保存できません");
    }
    window.localStorage.setItem(this.key, JSON.stringify(attempts));
  }

  private write(attempts: Attempt[]): void {
    try {
      this.persist(attempts);
    } catch {
      // 容量超過 / プライベートブラウジング等で setItem が例外を投げても、
      // 保存を no-op に落として呼び出し側(セッション終了時の記録)を壊さない
    }
  }

  async getAttempts(): Promise<Attempt[]> {
    return this.read();
  }

  async saveAttempt(a: Attempt): Promise<void> {
    const attempts = this.read();
    attempts.push(a);
    this.write(attempts);
  }

  async replaceAttempts(attempts: Attempt[]): Promise<void> {
    // 追記ではなく丸ごと差し替え(控えからの復元)。渡された配列を複製して
    // 外部からの後続変更が保存内容に波及しないようにする。
    // 復元は「保存できなかった」ことを呼び出し側へ伝える必要があるため、
    // write() の握りつぶしを使わず persist() の例外を伝播させる
    // (BackupPanel が失敗をユーザーに表示できるようにする)。
    this.persist([...attempts]);
  }
}

/**
 * アプリ全体で共有する既定アダプタ。
 * アプリ側はこの `storage` 経由でのみ成績にアクセスする(localStorage 直呼び禁止)。
 */
export const storage: StorageAdapter = new LocalStorageAdapter();
