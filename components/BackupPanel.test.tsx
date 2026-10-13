// @vitest-environment jsdom
/**
 * BackupPanel の書き出しボタンの条件を固定する(#507)。
 * お気に入りの読み込み前に書き出すと、未読み込みを「0件」として控えに入れてしまい、
 * 復元で本来のお気に入りが消える。それを防ぐ挙動をここで確かめる。
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Attempt } from "@/types";
import { BackupPanel } from "./BackupPanel";

const ATTEMPT: Attempt = {
  questionId: "q1",
  choiceIndex: 0,
  pts: 2,
  max: 2,
  answeredAt: "2026-07-20T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const exportButton = () => screen.getByRole("button", { name: "控えを書き出す" });

/** 書き出しで作られる Blob を捕まえて、中身の JSON を返す */
async function clickExportAndReadJson(): Promise<Record<string, unknown>> {
  let blob: Blob | undefined;
  URL.createObjectURL = vi.fn((b: Blob) => {
    blob = b;
    return "blob:test";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  fireEvent.click(exportButton());
  expect(blob).toBeDefined();
  // jsdom の Blob には text() が無いので FileReader で読む
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob!);
  });
  return JSON.parse(text);
}

describe("BackupPanel — 書き出し(お気に入りを含める)", () => {
  it("お気に入りの読み込み中は、成績があっても書き出せない", () => {
    render(
      <BackupPanel
        attempts={[ATTEMPT]}
        favorites={null}
        favoritesError={false}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeDisabled();
    expect(screen.getByText("お気に入りを読み込んでいます…")).toBeInTheDocument();
  });

  it("読み込みが終われば、お気に入りを含めて書き出す", async () => {
    render(
      <BackupPanel
        attempts={[ATTEMPT]}
        favorites={["q1-0"]}
        favoritesError={false}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeEnabled();
    const json = await clickExportAndReadJson();
    expect(json.favorites).toEqual(["q1-0"]);
    expect(screen.getByText(/成績1件・お気に入り1肢/)).toBeInTheDocument();
  });

  it("お気に入りの読み込みに失敗したときは、お気に入りを含めずに成績だけ書き出す", async () => {
    // 空配列を「0件」として入れると、復元で本来のお気に入りが消えてしまう
    render(
      <BackupPanel
        attempts={[ATTEMPT]}
        favorites={[]}
        favoritesError={true}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeEnabled();
    const json = await clickExportAndReadJson();
    expect(json).not.toHaveProperty("favorites");
    expect(screen.getByText(/お気に入りは読み込めなかったため含まれていません/)).toBeInTheDocument();
  });

  it("成績もお気に入りも無いときだけ、書き出せない", () => {
    render(
      <BackupPanel
        attempts={[]}
        favorites={[]}
        favoritesError={false}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeDisabled();
    expect(
      screen.getByText("まだ成績もお気に入りもないため書き出せません。"),
    ).toBeInTheDocument();
  });

  it("成績が無くても、お気に入りがあれば書き出せる", () => {
    render(
      <BackupPanel
        attempts={[]}
        favorites={["q1-0"]}
        favoritesError={false}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeEnabled();
  });

  it("お気に入りの読み込みに失敗していて成績も無いときは、書き出せない", () => {
    render(
      <BackupPanel
        attempts={[]}
        favorites={[]}
        favoritesError={true}
        onImported={() => {}}
      />,
    );
    expect(exportButton()).toBeDisabled();
  });
});
