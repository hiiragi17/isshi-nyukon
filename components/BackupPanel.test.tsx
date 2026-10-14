// @vitest-environment jsdom
/**
 * BackupPanel の書き出しボタンの条件を固定する(#507)。
 * お気に入りの読み込み前に書き出すと、未読み込みを「0件」として控えに入れてしまい、
 * 復元で本来のお気に入りが消える。それを防ぐ挙動をここで確かめる。
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import type { Attempt } from "@/types";
import { BackupPanel } from "./BackupPanel";

const ATTEMPT: Attempt = {
  questionId: "q1",
  choiceIndex: 0,
  pts: 2,
  max: 2,
  answeredAt: "2026-07-20T00:00:00.000Z",
};

// 控えは書き出しの時点で保存済みの最新を読むので、テストでも localStorage に用意する
// (キーは lib/storage.ts の STORAGE_KEY / FAVORITES_STORAGE_KEY と同じ)
const ATTEMPTS_KEY = "isshi-nyukon:attempts:v1";
const FAVORITES_KEY = "isshi-nyukon:favorites:v2";
const seedStorage = (attempts: Attempt[], favorites: string[]) => {
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
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
  await waitFor(() => expect(blob).toBeDefined());
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
    seedStorage([ATTEMPT], ["q1-0"]);
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
    await waitFor(() =>
      expect(screen.getByText(/成績1件・お気に入り1肢/)).toBeInTheDocument(),
    );
  });

  it("画面が持っている一覧が古くても、書き出しの時点で保存済みの最新を控えに入れる(別タブでの変更)", async () => {
    // 画面(props)は読み込み時点の ["q1-0"]。その後、別タブで ["q1-1", "q2-0"] に変わった
    seedStorage([ATTEMPT], ["q1-1", "q2-0"]);
    render(
      <BackupPanel
        attempts={[]}
        favorites={["q1-0"]}
        favoritesError={false}
        onImported={() => {}}
      />,
    );
    const json = await clickExportAndReadJson();
    expect(json.favorites).toEqual(["q1-1", "q2-0"]);
    expect((json.attempts as unknown[]).length).toBe(1);
    await waitFor(() =>
      expect(screen.getByText(/成績1件・お気に入り2肢/)).toBeInTheDocument(),
    );
  });

  it("お気に入りの読み込みに失敗したときは、お気に入りを含めずに成績だけ書き出す", async () => {
    // 空配列を「0件」として入れると、復元で本来のお気に入りが消えてしまう
    seedStorage([ATTEMPT], ["q1-0"]);
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
    await waitFor(() =>
      expect(
        screen.getByText(/お気に入りは読み込めなかったため含まれていません/),
      ).toBeInTheDocument(),
    );
    // 説明文も、実際に書き出す中身と食い違わない
    expect(
      screen.getByText(/今回の控えには成績の履歴だけが含まれます/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/控えには成績の履歴とお気に入りが含まれます/),
    ).not.toBeInTheDocument();
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
