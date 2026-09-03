import { describe, it, expect } from "vitest";
import { toggleFavorite, toggleFavoriteGroup } from "@/lib/favorites";

describe("toggleFavorite — お気に入りの反転(肢=itemKey単位)", () => {
  it("未登録の itemKey を追加する", () => {
    expect(toggleFavorite([], "q1-0")).toEqual(["q1-0"]);
    expect(toggleFavorite(["q1-0"], "q1-1")).toEqual(["q1-0", "q1-1"]);
  });

  it("登録済みの itemKey は取り除く", () => {
    expect(toggleFavorite(["q1-0", "q1-1"], "q1-0")).toEqual(["q1-1"]);
  });

  it("重複登録を作らない(既に入っていれば追加ではなく削除になる)", () => {
    expect(toggleFavorite(["q1-0", "q1-0"], "q1-0")).toEqual([]);
  });

  it("元の配列を書き換えない", () => {
    const original = ["q1-0"];
    toggleFavorite(original, "q1-1");
    expect(original).toEqual(["q1-0"]);
  });
});

describe("toggleFavoriteGroup — 論点(topicId)単位のまとめて反転", () => {
  it("グループが1つも登録されていなければ全て追加する", () => {
    expect(toggleFavoriteGroup([], ["q1-0", "q1-1"])).toEqual(["q1-0", "q1-1"]);
  });

  it("グループが全て登録済みなら全て取り除く", () => {
    expect(toggleFavoriteGroup(["q1-0", "q1-1"], ["q1-0", "q1-1"])).toEqual([]);
  });

  it("一部だけ登録済み(中間状態)は未選択とみなし、残りを追加して全登録にする", () => {
    expect(toggleFavoriteGroup(["q1-0"], ["q1-0", "q1-1"])).toEqual([
      "q1-0",
      "q1-1",
    ]);
  });

  it("グループ以外の登録は変更しない", () => {
    expect(
      toggleFavoriteGroup(["q9-0", "q1-0", "q1-1"], ["q1-0", "q1-1"]),
    ).toEqual(["q9-0"]);
  });

  it("元の配列を書き換えない", () => {
    const original = ["q1-0"];
    toggleFavoriteGroup(original, ["q1-0", "q1-1"]);
    expect(original).toEqual(["q1-0"]);
  });
});
