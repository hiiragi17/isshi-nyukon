// @vitest-environment jsdom
/**
 * ZenshiEngine の採点フローを UI 経由で固定する(Phase 3)。
 * 判定(○×) → 誤り箇所タップ → 理由選択 の三段で、得点が
 * lib/scoring の配点(○肢=最大2点 / ×肢=最大3点)と一致することを検証する。
 *
 * 理由の並びは shuffle されるため、index ではなく text でボタンを特定する。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Question } from "@/types";
import { ZenshiEngine } from "./ZenshiEngine";

/** 肢0=○肢 / 肢1=×肢(wrongIndex=1)を持つテスト問題 */
const question: Question = {
  id: "t-zenshi",
  category: "権利関係(民法)",
  topic: "テスト論点",
  law: "民法1条",
  lesson: ["レッスン行"],
  choices: [
    {
      segments: ["これは結論として妥当な記述である。"],
      correct: true,
      reasons: [
        { text: "正しい根拠アルファ", correct: true },
        { text: "誤った根拠ベータ", correct: false },
        { text: "誤った根拠ガンマ", correct: false },
      ],
      explanation: "肢0の解説。",
    },
    {
      segments: ["前半は妥当だが", "この中間部分が誤り", "で締めくくる。"],
      correct: false,
      wrongIndex: 1,
      reasons: [
        { text: "正しい理由エックス", correct: true },
        { text: "誤った理由ワイ", correct: false },
        { text: "誤った理由ゼット", correct: false },
      ],
      explanation: "肢1の解説。",
    },
  ],
};

/** 共通 props を組み立てる(onComplete はスパイ) */
function setup(ci: number) {
  const onComplete = vi.fn();
  const onNext = vi.fn();
  render(
    <ZenshiEngine
      question={question}
      ci={ci}
      onTerm={() => {}}
      lessonOpen={false}
      onToggleLesson={() => {}}
      onComplete={onComplete}
      nextLabel="次へ"
      onNext={onNext}
    />,
  );
  return { onComplete, onNext };
}

const clickJudge = (label: "◯ 正しい" | "✕ 誤り") =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("ZenshiEngine — ○肢(最大2点)", () => {
  it("判定◯ → 正しい根拠 で満点2/2", () => {
    const { onComplete } = setup(0);
    clickJudge("◯ 正しい");
    fireEvent.click(screen.getByRole("button", { name: "正しい根拠アルファ" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ pts: 2, max: 2 });
  });

  it("判定◯ → 誤った根拠 は判定分の1/2どまり(根拠違いは伸びない)", () => {
    const { onComplete } = setup(0);
    clickJudge("◯ 正しい");
    fireEvent.click(screen.getByRole("button", { name: "誤った根拠ベータ" }));
    expect(onComplete).toHaveBeenCalledWith({ pts: 1, max: 2 });
  });

  it("判定ミス(◯肢を✕と誤答)は0/2で即確定", () => {
    const { onComplete } = setup(0);
    clickJudge("✕ 誤り");
    expect(onComplete).toHaveBeenCalledWith({ pts: 0, max: 2 });
  });
});

describe("ZenshiEngine — ×肢(最大3点)", () => {
  it("判定✕ → 誤り箇所 → 正しい理由 で満点3/3", () => {
    const { onComplete } = setup(1);
    clickJudge("✕ 誤り");
    // locate フェーズ: wrongIndex=1 の segment をタップ
    fireEvent.click(screen.getByRole("button", { name: "この中間部分が誤り" }));
    fireEvent.click(screen.getByRole("button", { name: "正しい理由エックス" }));
    expect(onComplete).toHaveBeenCalledWith({ pts: 3, max: 3 });
  });

  it("箇所ハズレでも理由正解なら判定+理由の2/3", () => {
    const { onComplete } = setup(1);
    clickJudge("✕ 誤り");
    fireEvent.click(screen.getByRole("button", { name: "前半は妥当だが" }));
    fireEvent.click(screen.getByRole("button", { name: "正しい理由エックス" }));
    expect(onComplete).toHaveBeenCalledWith({ pts: 2, max: 3 });
  });

  it("箇所正解でも理由ハズレなら判定+箇所の2/3", () => {
    const { onComplete } = setup(1);
    clickJudge("✕ 誤り");
    fireEvent.click(screen.getByRole("button", { name: "この中間部分が誤り" }));
    fireEvent.click(screen.getByRole("button", { name: "誤った理由ワイ" }));
    expect(onComplete).toHaveBeenCalledWith({ pts: 2, max: 3 });
  });

  it("判定ミス(×肢を◯と誤答)は0/3で即確定", () => {
    const { onComplete } = setup(1);
    clickJudge("◯ 正しい");
    expect(onComplete).toHaveBeenCalledWith({ pts: 0, max: 3 });
  });
});

describe("ZenshiEngine — 誤り箇所タップの見た目(#469)", () => {
  it("locate フェーズの各区切りに点線の下線が付く(border の一括指定で消えない)", () => {
    setup(1);
    clickJudge("✕ 誤り");
    const segs = ["前半は妥当だが", "この中間部分が誤り", "で締めくくる。"].map((name) =>
      screen.getByRole("button", { name }),
    );
    for (const seg of segs) {
      expect(seg.style.borderBottomStyle).toBe("dotted");
    }
  });
});

describe("ZenshiEngine — フォーカス移動と読み上げ(#474)", () => {
  it("×肢: 判定→箇所→理由→解説と進むたびに、次に操作する要素へフォーカスが移る", () => {
    setup(1);
    clickJudge("✕ 誤り");
    // locate: 最初の区切りへ
    expect(screen.getByRole("button", { name: "前半は妥当だが" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("誤っている箇所を選んでください");

    fireEvent.click(screen.getByRole("button", { name: "この中間部分が誤り" }));
    // reason: 理由の先頭(並びはシャッフルされるので、理由一覧の最初のボタン)へ
    const reasonNames = ["正しい理由エックス", "誤った理由ワイ", "誤った理由ゼット"];
    const focused = document.activeElement as HTMLElement;
    expect(reasonNames).toContain(focused.textContent);
    expect(screen.getByRole("status")).toHaveTextContent("箇所も正解。なぜ誤りなのか");

    fireEvent.click(screen.getByRole("button", { name: "正しい理由エックス" }));
    // explain: 「次へ」へ。結果と得点を読み上げる
    expect(screen.getByRole("button", { name: "次へ" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("理由まで正解。完璧です。 3点(3点満点)");
  });

  it("判定ミスで解説に直行したときも「次へ」へフォーカスが移る", () => {
    setup(0);
    clickJudge("✕ 誤り");
    expect(screen.getByRole("button", { name: "次へ" })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("判定ミス。この肢は「正しい」でした。 0点(2点満点)");
  });

  it("判定前は読み上げもフォーカス移動もしない", () => {
    setup(0);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(document.body);
  });
});
