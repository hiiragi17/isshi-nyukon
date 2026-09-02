import { describe, it, expect } from "vitest";
import { toggleFavorite } from "@/lib/favorites";

describe("toggleFavorite — お気に入りの反転", () => {
  it("未登録の topicId を追加する", () => {
    expect(toggleFavorite([], "t1")).toEqual(["t1"]);
    expect(toggleFavorite(["t1"], "t2")).toEqual(["t1", "t2"]);
  });

  it("登録済みの topicId は取り除く", () => {
    expect(toggleFavorite(["t1", "t2"], "t1")).toEqual(["t2"]);
  });

  it("重複登録を作らない(既に入っていれば追加ではなく削除になる)", () => {
    expect(toggleFavorite(["t1", "t1"], "t1")).toEqual([]);
  });

  it("元の配列を書き換えない", () => {
    const original = ["t1"];
    toggleFavorite(original, "t2");
    expect(original).toEqual(["t1"]);
  });
});
