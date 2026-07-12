/**
 * 全肢判定エンジン(zenshi)。
 * 判定(○×) → 誤り箇所タップ → 理由選択 の三段。プロトタイプの play 画面(zenshi)と同一挙動。
 * 得点: ○肢=最大2点 / ×肢=最大3点(判定1 + 箇所1 + 理由1)。
 */
import { useState } from "react";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, SANS } from "@/lib/tokens";
import { card } from "@/lib/gameStyles";
import { SceneCard } from "../SceneCard";
import { LessonAccordion } from "../LessonAccordion";
import { Stamp } from "../Stamp";
import { termify } from "../TermText";
import type { EngineCommonProps } from "./types";

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "judge" | "locate" | "reason" | "explain";

export function ZenshiEngine({
  question,
  ci,
  onTerm,
  lessonOpen,
  onToggleLesson,
  onComplete,
  nextLabel,
  onNext,
}: EngineCommonProps & { ci: number }) {
  const choice = question.choices![ci];

  const [phase, setPhase] = useState<Phase>("judge");
  const [judgePick, setJudgePick] = useState<boolean | null>(null);
  const [locatePick, setLocatePick] = useState<number | null>(null);
  const [reasonPick, setReasonPick] = useState<number | null>(null);
  // 理由の並びは item ごとに固定(remount で切り替わる)
  const [shuffledReasons] = useState(() => shuffle(choice.reasons));

  const judged = judgePick !== null;
  const judgeCorrect = judgePick === choice.correct;

  const finishChoice = (pts: number) => {
    onComplete({ pts, max: choice.correct ? 2 : 3 });
  };

  const currentPts = () => {
    let pts = 0;
    if (judgePick === choice.correct) pts += 1;
    if (
      judgePick === choice.correct &&
      reasonPick !== null &&
      shuffledReasons[reasonPick]?.correct
    )
      pts += 1;
    if (!choice.correct && judgePick === false && locatePick === choice.wrongIndex) pts += 1;
    return pts;
  };

  const handleJudge = (pick: boolean) => {
    setJudgePick(pick);
    if (pick !== choice.correct) {
      finishChoice(0);
      setPhase("explain");
    } else if (choice.correct) {
      setPhase("reason");
    } else {
      setPhase("locate");
    }
  };

  const handleLocate = (i: number) => {
    setLocatePick(i);
    setPhase("reason");
  };

  const handleReason = (i: number) => {
    setReasonPick(i);
    let pts = 1; // 判定は正解済み
    if (!choice.correct && locatePick === choice.wrongIndex) pts += 1;
    if (shuffledReasons[i].correct) pts += 1;
    finishChoice(pts);
    setPhase("explain");
  };

  return (
    <>
      <SceneCard question={question} onTerm={onTerm} />
      <LessonAccordion
        lesson={question.lesson}
        open={lessonOpen}
        onToggle={onToggleLesson}
        onTerm={onTerm}
      />

      {/* 肢カード */}
      <div
        className="fade-up"
        key={`${question.id}-${ci}`}
        style={{ ...card, padding: "20px 22px", position: "relative", marginBottom: 16 }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            letterSpacing: 2.5,
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          肢 {ci + 1}
        </div>
        <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 2.05, margin: "10px 0 4px" }}>
          {choice.segments.map((seg, i) => {
            const tappable = phase === "locate";
            const revealed = phase === "reason" || phase === "explain";
            const isWrongSeg = !choice.correct && i === choice.wrongIndex;
            const picked = locatePick === i;
            let styleSeg: React.CSSProperties = {};
            if (tappable) {
              styleSeg = {
                borderBottom: `2px dotted ${AI_BLUE}`,
                cursor: "pointer",
                padding: "1px 1px",
              };
            }
            if (revealed && judgePick === false && !choice.correct) {
              if (isWrongSeg)
                styleSeg = {
                  background: "rgba(191,59,51,0.14)",
                  borderBottom: `2px solid ${SHU}`,
                  padding: "1px 1px",
                };
              else if (picked)
                styleSeg = { background: "rgba(51,85,126,0.12)", padding: "1px 1px" };
            }
            return tappable ? (
              <button
                key={i}
                className="seg-btn"
                onClick={() => handleLocate(i)}
                style={{
                  ...styleSeg,
                  font: "inherit",
                  color: "inherit",
                  background: "transparent",
                  border: "none",
                  borderBottom: styleSeg.borderBottom,
                  textAlign: "left",
                  lineHeight: "inherit",
                }}
              >
                {seg}
              </button>
            ) : (
              <span key={i} style={styleSeg}>
                {termify(seg, onTerm)}
              </span>
            );
          })}
        </p>

        {judged && (
          <div style={{ position: "absolute", top: 8, right: 14 }}>
            <Stamp text={judgePick ? "正" : "誤"} color={judgeCorrect ? SHU : MUTED} small />
          </div>
        )}
      </div>

      {/* フェーズ別 UI */}
      {phase === "judge" && (
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => handleJudge(true)}
            style={{
              flex: 1,
              padding: "18px 0",
              fontSize: 18,
              letterSpacing: 2,
              fontFamily: SERIF,
              fontWeight: 700,
              background: CARD,
              color: INK,
              border: `2px solid ${INK}`,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            ◯ 正しい
          </button>
          <button
            onClick={() => handleJudge(false)}
            style={{
              flex: 1,
              padding: "18px 0",
              fontSize: 18,
              letterSpacing: 2,
              fontFamily: SERIF,
              fontWeight: 700,
              background: CARD,
              color: SHU,
              border: `2px solid ${SHU}`,
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            ✕ 誤り
          </button>
        </div>
      )}

      {phase === "locate" && (
        <div className="fade-up" style={{ ...card, borderLeft: `4px solid ${SHU}` }}>
          <b style={{ fontSize: 14 }}>お見事、この肢は誤りです。</b>
          <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
            では、<b style={{ color: INK }}>どこが誤っているか</b>
            、上の文の該当箇所をタップしてください。(+1点)
          </p>
        </div>
      )}

      {phase === "reason" && (
        <div className="fade-up">
          {choice.correct ? (
            <div style={{ ...card, borderLeft: `4px solid ${GREEN}`, marginBottom: 12 }}>
              <b style={{ fontSize: 14, color: GREEN }}>判定正解。この肢は「正しい」。</b>
              <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
                では、<b style={{ color: INK }}>なぜ正しいと言えるのか</b>、根拠を選んでください。(+1点)
                <br />
                <span style={{ fontSize: 12 }}>
                  ※ 結論が合っていても根拠が違うと、少しひねられた瞬間に落ちます。
                </span>
              </p>
            </div>
          ) : (
            <div
              style={{
                ...card,
                borderLeft: `4px solid ${locatePick === choice.wrongIndex ? GREEN : SHU}`,
                marginBottom: 12,
              }}
            >
              <b style={{ fontSize: 14, color: locatePick === choice.wrongIndex ? GREEN : SHU }}>
                {locatePick === choice.wrongIndex
                  ? "箇所も正解。(+1点)"
                  : "箇所は不正解。赤線部が誤りでした。"}
              </b>
              <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
                仕上げです。<b style={{ color: INK }}>なぜ誤りなのか</b>、理由を選んでください。(+1点)
              </p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shuffledReasons.map((r, i) => (
              <button
                key={i}
                className="opt-btn"
                onClick={() => handleReason(i)}
                style={{
                  textAlign: "left",
                  padding: "13px 16px",
                  fontSize: 14,
                  lineHeight: 1.7,
                  background: CARD,
                  border: `1.5px solid ${LINE}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: INK,
                  fontFamily: SANS,
                }}
              >
                {r.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "explain" && (
        <div className="fade-up">
          <div
            style={{
              ...card,
              borderLeft: `4px solid ${judgeCorrect ? GREEN : SHU}`,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <b style={{ fontSize: 15, color: judgeCorrect ? GREEN : SHU }}>
                {!judgeCorrect
                  ? `判定ミス。この肢は「${choice.correct ? "正しい" : "誤り"}」でした。`
                  : reasonPick !== null && shuffledReasons[reasonPick]?.correct
                    ? choice.correct
                      ? "根拠まで正解。完璧です。"
                      : "理由まで正解。完璧です。"
                    : choice.correct
                      ? "判定は正解。ただし根拠が違いました。"
                      : "判定は正解。ただし理由が違いました。"}
              </b>
              <span
                style={{
                  fontFamily: SERIF,
                  fontWeight: 800,
                  fontSize: 18,
                  color: INK,
                  whiteSpace: "nowrap",
                }}
              >
                +{currentPts()}
                <span style={{ fontSize: 12, color: MUTED }}>/{choice.correct ? 2 : 3}点</span>
              </span>
            </div>
            {reasonPick !== null && !shuffledReasons[reasonPick]?.correct && (
              <p style={{ fontSize: 13, margin: "0 0 8px", color: MUTED }}>
                正しい{choice.correct ? "根拠" : "理由"}:{" "}
                <span style={{ color: INK }}>
                  {termify(choice.reasons.find((r) => r.correct)!.text, onTerm)}
                </span>
              </p>
            )}
            <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>
              {termify(choice.explanation, onTerm)}
            </p>
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
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            {nextLabel}
          </button>
        </div>
      )}
    </>
  );
}
