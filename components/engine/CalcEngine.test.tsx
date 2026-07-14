// @vitest-environment jsdom
/**
 * CalcEngine の採点フローを UI 経由で固定する(Phase 3)。
 * 途中式ビルダーで第一式・第二式を選び、得点(第一式1点 + 第二式1点 = 最大2点)が
 * lib/calc の evaluateCalc と一致して onComplete に渡ることを検証する。
 *
 * 汎用 calc(容積率型)を使う。第二式に kind を持たせないことで税 calc 判定を避ける。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Question } from "@/types";
import { CalcEngine } from "./CalcEngine";

const question: Question = {
  id: "t-calc",
  category: "法令上の制限",
  topic: "容積率",
  law: "建築基準法52条",
  type: "calc",
  lesson: ["レッスン行"],
  calc: {
    prompt: "この土地の容積率の上限を求めよ。",
    given: [{ label: "敷地面積", value: "100" }],
    build: [
      {
        label: "第一式",
        options: [
          { formula: "前面道路4×0.4=160", value: 160, correct: true, trap: "" },
          { formula: "前面道路4×0.6=240", value: 240, correct: false, trap: "係数の取り違え" },
        ],
      },
      {
        label: "第二式",
        options: [
          { formula: "指定容積率と比較して小を採る", op: "identity", correct: true, trap: "" },
          { formula: "そのまま大を採る", op: "identity", correct: false, trap: "小さい方が上限" },
        ],
      },
    ],
    canonical: [{ label: "手順", formula: "min(前面道路×0.4, 指定容積率)" }],
    answer: 160,
    unit: "%",
  },
};

function setup() {
  const onComplete = vi.fn();
  render(
    <CalcEngine
      question={question}
      onTerm={() => {}}
      lessonOpen={false}
      onToggleLesson={() => {}}
      onComplete={onComplete}
      nextLabel="次へ"
      onNext={() => {}}
    />,
  );
  return { onComplete };
}

const pick = (name: RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("CalcEngine — 途中式ビルダーの採点(最大2点)", () => {
  it("第一式・第二式ともに正解で2/2", () => {
    const { onComplete } = setup();
    pick(/前面道路4×0.4=160/);
    pick(/指定容積率と比較して小を採る/);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ pts: 2, max: 2 });
  });

  it("第一式のみ正解(distractor の第二式)で1/2", () => {
    const { onComplete } = setup();
    pick(/前面道路4×0.4=160/);
    pick(/そのまま大を採る/);
    expect(onComplete).toHaveBeenCalledWith({ pts: 1, max: 2 });
  });

  it("第二式のみ正解(distractor の第一式)で1/2", () => {
    const { onComplete } = setup();
    pick(/前面道路4×0.6=240/);
    pick(/指定容積率と比較して小を採る/);
    expect(onComplete).toHaveBeenCalledWith({ pts: 1, max: 2 });
  });

  it("両式とも distractor で0/2", () => {
    const { onComplete } = setup();
    pick(/前面道路4×0.6=240/);
    pick(/そのまま大を採る/);
    expect(onComplete).toHaveBeenCalledWith({ pts: 0, max: 2 });
  });

  it("第一式を選ぶまで第二式は出ない(段階表示)", () => {
    setup();
    expect(screen.queryByRole("button", { name: /指定容積率と比較して小を採る/ })).toBeNull();
    pick(/前面道路4×0.4=160/);
    expect(screen.getByRole("button", { name: /指定容積率と比較して小を採る/ })).toBeInTheDocument();
  });
});
