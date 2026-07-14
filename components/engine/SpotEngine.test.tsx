// @vitest-environment jsdom
/**
 * SpotEngine の採点フローを UI 経由で固定する(Phase 3)。
 * マイソク広告の違反ゾーンを申し立てて摘発し、得点 = errorCount − 誤指摘数(下限0)が
 * onComplete に渡ることを検証する。
 *
 * 広告レイアウトは question.id で振り分く bespoke コンポーネントのため、
 * 実データ q6(みどり台広告・違反4箇所)を使う。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { koukokuKisei } from "@/data/questions/gyoho/koukoku-kisei";
import { SpotEngine } from "./SpotEngine";

function setup() {
  const onComplete = vi.fn();
  render(
    <SpotEngine
      question={koukokuKisei}
      onTerm={() => {}}
      lessonOpen={false}
      onToggleLesson={() => {}}
      onComplete={onComplete}
      nextLabel="判決を聞く"
      onNext={() => {}}
    />,
  );
  return { onComplete };
}

/** ゾーンをタップ → 疑義申立てを確定する */
function accuse(zone: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: zone }));
  fireEvent.click(screen.getByRole("button", { name: "申し立てる" }));
}

// q6 の違反4ゾーン(A 新築 / B 日本一の眺望 / C 徒歩3分 / D 外観写真)
const VIOLATIONS: RegExp[] = [/新築/, /日本一の眺望/, /徒歩3分/, /外観写真/];

describe("SpotEngine — 間違い探しの採点(得点=errorCount−誤指摘)", () => {
  it("違反4箇所を誤指摘なしで摘発すると満点4/4", () => {
    const { onComplete } = setup();
    VIOLATIONS.forEach(accuse);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ pts: 4, max: 4 });
  });

  it("適法ゾーンの誤指摘は1件につき1点減点(4−1=3)", () => {
    const { onComplete } = setup();
    accuse(/販売価格/); // safePrice: 適法 → 申立て棄却・誤指摘+1
    expect(onComplete).not.toHaveBeenCalled();
    VIOLATIONS.forEach(accuse);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ pts: 3, max: 4 });
  });

  it("違反を全部摘発するまで onComplete は呼ばれない", () => {
    const { onComplete } = setup();
    accuse(/新築/);
    accuse(/日本一の眺望/);
    accuse(/徒歩3分/);
    expect(onComplete).not.toHaveBeenCalled();
    accuse(/外観写真/);
    expect(onComplete).toHaveBeenCalledWith({ pts: 4, max: 4 });
  });

  it("取り下げると誤指摘にならない(申立てをキャンセル)", () => {
    const { onComplete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /販売価格/ }));
    fireEvent.click(screen.getByRole("button", { name: "取り下げる" }));
    VIOLATIONS.forEach(accuse);
    expect(onComplete).toHaveBeenCalledWith({ pts: 4, max: 4 });
  });
});
