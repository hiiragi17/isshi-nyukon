/**
 * 計算エンジン(calc)。報酬計算などを「途中式ビルダー」で段ごとに選ぶ。
 * プロトタイプの calc エンジンと同一挙動。得点: 第一式1点 + 第二式1点 = 最大2点。
 */
import { useState } from "react";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, SANS, RADIUS } from "@/lib/tokens";
import { card } from "@/lib/gameStyles";
import { SceneCard } from "../SceneCard";
import { LessonAccordion } from "../LessonAccordion";
import { Eyebrow } from "../Eyebrow";
import { Stamp } from "../Stamp";
import { termify } from "../TermText";
import { evaluateCalc } from "@/lib/calc";
import type { EngineCommonProps } from "./types";

export function CalcEngine({
  question,
  onTerm,
  lessonOpen,
  onToggleLesson,
  onComplete,
  nextLabel,
  onNext,
}: EngineCommonProps) {
  const calc = question.calc!;
  const [calcF, setCalcF] = useState<number | null>(null);
  const [calcT, setCalcT] = useState<number | null>(null);
  const calcDone = calcT !== null;

  const handleCalcF = (i: number) => {
    if (calcF !== null) return;
    setCalcF(i);
  };
  const handleCalcT = (i: number) => {
    if (calcT !== null || calcF === null) return;
    setCalcT(i);
    const { pts } = evaluateCalc(calc, calcF, i);
    onComplete({ pts, max: 2 });
  };

  // 判定結果(得点・表示行・メッセージ)は lib/calc に一元化。
  // 税 calc(報酬)は従来どおり、汎用 calc(容積率など)は単位付きで表示する。
  const verdict = calcDone ? evaluateCalc(calc, calcF!, calcT!) : null;
  const donePts = verdict ? verdict.pts : 0;

  return (
    <>
      <SceneCard question={question} onTerm={onTerm}>
        <p
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.9,
            margin: "8px 0 10px",
          }}
        >
          {termify(calc.prompt, onTerm)}
        </p>
        <div style={{ borderTop: `1px solid ${LINE}` }}>
          {calc.given.map((g, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: i < calc.given.length - 1 ? `1px solid ${LINE}` : "none",
                fontSize: 13,
              }}
            >
              <span style={{ color: MUTED }}>{g.label}</span>
              <b style={{ fontFamily: SERIF }}>{termify(g.value, onTerm)}</b>
            </div>
          ))}
        </div>
        {calcDone && (
          <div style={{ position: "absolute", top: 10, right: 14 }}>
            <Stamp
              text={donePts === 2 ? "正" : "誤"}
              color={donePts === 2 ? SHU : MUTED}
              small
            />
          </div>
        )}
      </SceneCard>

      <LessonAccordion
        lesson={question.lesson}
        open={lessonOpen}
        onToggle={onToggleLesson}
        onTerm={onTerm}
      />

      {[0, 1].map((stepIdx) => {
        const step = calc.build[stepIdx];
        const picked = stepIdx === 0 ? calcF : calcT;
        const visible = stepIdx === 0 || calcF !== null;
        if (!visible) return null;
        return (
          <div key={stepIdx} className="fade-up" style={{ ...card, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <Eyebrow>{step.label}</Eyebrow>
              <span style={{ fontSize: 12, color: SHU }}>+1点</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {step.options.map((o, i) => {
                let border = LINE,
                  bg = CARD,
                  mark = "",
                  markColor = MUTED;
                if (calcDone) {
                  if (o.correct) {
                    border = GREEN;
                    bg = "rgba(61,122,85,0.08)";
                    mark = i === picked ? "正解" : "正解はこちら";
                    markColor = GREEN;
                  } else if (i === picked) {
                    border = SHU;
                    bg = "rgba(191,59,51,0.08)";
                    mark = "あなたの選択";
                    markColor = SHU;
                  }
                } else if (i === picked) {
                  border = AI_BLUE;
                  bg = "rgba(51,85,126,0.07)";
                  mark = "選択中";
                  markColor = AI_BLUE;
                }
                const trapShown = calcDone && !o.correct && o.trap;
                return (
                  <button
                    key={i}
                    className="opt-btn"
                    onClick={() => (stepIdx === 0 ? handleCalcF(i) : handleCalcT(i))}
                    style={{
                      textAlign: "left",
                      minHeight: 48,
                      padding: "11px 14px",
                      borderRadius: RADIUS,
                      cursor: "pointer",
                      background: bg,
                      border: `2px solid ${border}`,
                      color: INK,
                      fontFamily: SANS,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 700 }}>
                        {o.formula}
                      </span>
                      <span style={{ fontSize: 11, color: markColor, whiteSpace: "nowrap" }}>
                        {mark}
                      </span>
                    </div>
                    {trapShown && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: MUTED,
                          marginTop: 4,
                          paddingTop: 4,
                          borderTop: `1px dotted ${LINE}`,
                        }}
                      >
                        罠: {o.trap}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {verdict &&
        (() => {
          const { pts, line1, line2, message: msg } = verdict;
          const accent = pts === 2 ? GREEN : pts === 1 ? AI_BLUE : SHU;
          return (
            <div className="fade-up">
              <div style={{ ...card, borderLeft: `4px solid ${accent}`, marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <b style={{ fontSize: 14, color: accent }}>{msg}</b>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontWeight: 800,
                      fontSize: 18,
                      color: INK,
                      whiteSpace: "nowrap",
                    }}
                  >
                    +{pts}
                    <span style={{ fontSize: 12, color: MUTED }}>/2点</span>
                  </span>
                </div>
                <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                  <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>
                    あなたの組み立てた式
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.9 }}>
                    {line1}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.9 }}>
                    {line2}
                  </div>
                </div>
              </div>
              <div style={{ ...card, marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>
                  正解の道筋
                </div>
                {calc.canonical.map((st, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "9px 0",
                      borderBottom:
                        i < calc.canonical.length - 1 ? `1px dotted ${LINE}` : "none",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 2 }}>{st.label}</div>
                    <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700 }}>
                      {st.formula}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={onNext}
                style={{
                  width: "100%",
                  padding: "15px 0",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: SERIF,
                  letterSpacing: 3,
                  color: CARD,
                  background: INK,
                  border: "none",
                  borderRadius: RADIUS,
                  cursor: "pointer",
                }}
              >
                {nextLabel}
              </button>
            </div>
          );
        })()}
    </>
  );
}
