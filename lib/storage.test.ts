/**
 * lib/storage.ts のユニットテスト。
 * - itemKey / latestByItem: 弱点判定の基盤(肢ごとの最新採用)を検証する
 * - LocalStorageAdapter: 全件追記保存・破損データのフォールバック・
 *   SSR(window 不在)での安全性を検証する
 */
import { describe, it, expect, afterEach } from "vitest";
import type { Attempt } from "@/types";
import { itemKey, latestByItem, LocalStorageAdapter } from "@/lib/storage";

/** テスト用に Attempt を作るヘルパー */
function attempt(
  questionId: string,
  choiceIndex: number,
  pts: number,
  max: number,
  answeredAt: string,
): Attempt {
  return { questionId, choiceIndex, pts, max, answeredAt };
}

describe("itemKey — 肢の一意キー", () => {
  it("`${questionId}-${choiceIndex}` 形式", () => {
    expect(itemKey("q1", 0)).toBe("q1-0");
    expect(itemKey("q12", 3)).toBe("q12-3");
  });
});

describe("latestByItem — 肢ごとの最新採用(弱点判定の基盤)", () => {
  it("空の履歴からは空の Map", () => {
    expect(latestByItem([]).size).toBe(0);
  });

  it("同一肢は answeredAt が最も新しい Attempt を採用する", () => {
    const old = attempt("q1", 0, 0, 2, "2026-07-01T00:00:00.000Z");
    const latest = attempt("q1", 0, 2, 2, "2026-07-02T00:00:00.000Z");
    expect(latestByItem([old, latest]).get("q1-0")).toBe(latest);
    // 記録順が逆でも answeredAt で判定する
    expect(latestByItem([latest, old]).get("q1-0")).toBe(latest);
  });

  it("answeredAt が同時刻なら記録順で後の Attempt を採用する(後勝ち)", () => {
    const first = attempt("q1", 0, 0, 2, "2026-07-01T00:00:00.000Z");
    const second = attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z");
    expect(latestByItem([first, second]).get("q1-0")).toBe(second);
  });

  it("肢が違えば別エントリとして保持する(問題×肢の粒度)", () => {
    const a = attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z");
    const b = attempt("q1", 1, 1, 3, "2026-07-01T00:00:00.000Z");
    const c = attempt("q2", 0, 2, 2, "2026-07-01T00:00:00.000Z");
    const m = latestByItem([a, b, c]);
    expect(m.size).toBe(3);
    expect(m.get("q1-0")).toBe(a);
    expect(m.get("q1-1")).toBe(b);
    expect(m.get("q2-0")).toBe(c);
  });
});

/** window / localStorage を持たない node 環境に、テスト用の window を生やす */
type TestWindow = { localStorage: Pick<Storage, "getItem" | "setItem"> };
const globals = globalThis as { window?: TestWindow };

function fakeLocalStorage(store: Map<string, string>): TestWindow {
  return {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    },
  };
}

afterEach(() => {
  delete globals.window;
});

describe("LocalStorageAdapter", () => {
  const KEY = "test:attempts";

  it("SSR(window 不在)では読み=空・書き=no-op で例外を出さない", async () => {
    const adapter = new LocalStorageAdapter(KEY);
    await expect(adapter.getAttempts()).resolves.toEqual([]);
    await expect(
      adapter.saveAttempt(attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z")),
    ).resolves.toBeUndefined();
  });

  it("saveAttempt は全件履歴の末尾に追記する(上書きしない)", async () => {
    const store = new Map<string, string>();
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    const a1 = attempt("q1", 0, 0, 2, "2026-07-01T00:00:00.000Z");
    const a2 = attempt("q1", 0, 2, 2, "2026-07-02T00:00:00.000Z");
    await adapter.saveAttempt(a1);
    await adapter.saveAttempt(a2); // 同一肢でも追記(全件履歴が既決事項)
    await expect(adapter.getAttempts()).resolves.toEqual([a1, a2]);
  });

  it("破損した JSON は空履歴として扱う", async () => {
    const store = new Map<string, string>([[KEY, "{broken"]]);
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    await expect(adapter.getAttempts()).resolves.toEqual([]);
  });

  it("配列でない JSON も空履歴として扱う", async () => {
    const store = new Map<string, string>([[KEY, '{"not":"array"}']]);
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    await expect(adapter.getAttempts()).resolves.toEqual([]);
  });

  it("破損データがあっても以降の保存で復旧する", async () => {
    const store = new Map<string, string>([[KEY, "{broken"]]);
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    const a = attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z");
    await adapter.saveAttempt(a);
    await expect(adapter.getAttempts()).resolves.toEqual([a]);
  });

  it("setItem が例外を投げても saveAttempt は落ちない(容量超過等)", async () => {
    const store = new Map<string, string>();
    globals.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    };
    const adapter = new LocalStorageAdapter(KEY);
    await expect(
      adapter.saveAttempt(attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z")),
    ).resolves.toBeUndefined();
  });

  it("キーが違えば履歴は分離される", async () => {
    const store = new Map<string, string>();
    globals.window = fakeLocalStorage(store);
    const a = new LocalStorageAdapter("test:a");
    const b = new LocalStorageAdapter("test:b");
    await a.saveAttempt(attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"));
    await expect(b.getAttempts()).resolves.toEqual([]);
  });

  it("replaceAttempts は既存の全件履歴を丸ごと差し替える(控えからの復元)", async () => {
    const store = new Map<string, string>();
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    await adapter.saveAttempt(attempt("q1", 0, 0, 2, "2026-07-01T00:00:00.000Z"));
    const restored = [
      attempt("q2", 0, 2, 2, "2026-07-05T00:00:00.000Z"),
      attempt("q2", 1, 3, 3, "2026-07-06T00:00:00.000Z"),
    ];
    await adapter.replaceAttempts(restored);
    await expect(adapter.getAttempts()).resolves.toEqual(restored);
  });

  it("replaceAttempts は渡した配列の複製を保存する(後からの変更が波及しない)", async () => {
    const store = new Map<string, string>();
    globals.window = fakeLocalStorage(store);
    const adapter = new LocalStorageAdapter(KEY);
    const restored = [attempt("q2", 0, 2, 2, "2026-07-05T00:00:00.000Z")];
    await adapter.replaceAttempts(restored);
    restored.push(attempt("q9", 0, 0, 2, "2026-07-09T00:00:00.000Z"));
    await expect(adapter.getAttempts()).resolves.toHaveLength(1);
  });

  it("replaceAttempts は保存できないとき失敗を伝播する(SSR / localStorage 不在)", async () => {
    // 復元は「保存できたか」を呼び出し側へ返す必要があるため、
    // 追記系(saveAttempt)と違って失敗を握りつぶさず reject する
    const adapter = new LocalStorageAdapter(KEY);
    await expect(adapter.replaceAttempts([])).rejects.toThrow();
  });

  it("replaceAttempts は setItem が例外を投げたら reject する(容量超過等)", async () => {
    globals.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    };
    const adapter = new LocalStorageAdapter(KEY);
    await expect(
      adapter.replaceAttempts([
        attempt("q1", 0, 2, 2, "2026-07-01T00:00:00.000Z"),
      ]),
    ).rejects.toThrow();
  });
});
