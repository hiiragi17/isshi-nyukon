/**
 * 間違い探しエンジン(spot)。マイソク広告の違反箇所を根拠付きで申し立てる。
 * プロトタイプの spot エンジンと同一挙動。得点: errorCount − 誤指摘数(下限0)。
 */
import { useState } from "react";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, RADIUS } from "@/lib/tokens";
import { card } from "@/lib/gameStyles";
import { SceneCard } from "../SceneCard";
import { LessonAccordion } from "../LessonAccordion";
import { SpotAd } from "../SpotAd";
import type { EngineCommonProps } from "./types";

type SpotMsg = { accent: string; title: string; body?: string };

export function SpotEngine({
  question,
  onTerm,
  lessonOpen,
  onToggleLesson,
  onComplete,
  nextLabel,
  onNext,
}: EngineCommonProps) {
  const spot = question.spot!;
  const [spotFound, setSpotFound] = useState<string[]>([]);
  const [spotWrong, setSpotWrong] = useState(0);
  const [spotPending, setSpotPending] = useState<string | null>(null);
  const [spotMsg, setSpotMsg] = useState<SpotMsg | null>(null);

  const spotDone = spotFound.length === spot.errorCount;

  const handleSpotZone = (id: string) => {
    if (spotDone || spotFound.includes(id) || spotPending === id) return;
    setSpotPending(id);
    setSpotMsg(null);
  };

  const handleSpotAccuse = () => {
    const id = spotPending;
    if (!id) return;
    const z = spot.zones.find((zz) => zz.id === id)!;
    setSpotPending(null);
    if (z.violation) {
      const nf = [...spotFound, id];
      setSpotFound(nf);
      setSpotMsg({ accent: GREEN, title: `申立て認容 — ${z.name}`, body: z.reason });
      if (nf.length === spot.errorCount) {
        const pts = Math.max(0, spot.errorCount - spotWrong);
        onComplete({ pts, max: spot.errorCount });
      }
    } else {
      setSpotWrong((w) => w + 1);
      setSpotMsg({ accent: SHU, title: `申立て棄却 — ${z.name}`, body: z.note });
    }
  };

  const handleSpotWithdraw = () => setSpotPending(null);

  const pendingZone = spotPending ? spot.zones.find((z) => z.id === spotPending) : null;

  return (
    <>
      <SceneCard question={question} onTerm={onTerm} />
      <LessonAccordion
        lesson={question.lesson}
        open={lessonOpen}
        onToggle={onToggleLesson}
        onTerm={onTerm}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          margin: "2px 4px 0",
        }}
      >
        <span style={{ fontFamily: SERIF, fontSize: 14 }}>
          <b>証拠品</b>
        </span>
        <span style={{ fontFamily: SERIF, fontSize: 14 }}>
          <span style={{ color: MUTED, fontSize: 12 }}>疑義 </span>
          <b style={{ color: SHU }}>{spotFound.length}</b>
          <span style={{ color: MUTED }}>/{spot.errorCount}</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: spotWrong > 0 ? SHU : MUTED }}>
            誤指摘 {spotWrong}
          </span>
        </span>
      </div>

      <SpotAd
        questionId={question.id}
        found={spotFound}
        pending={spotPending}
        done={spotDone}
        onTap={handleSpotZone}
      />

      {spotPending && (
        <div
          className="fade-up"
          style={{ background: INK, color: CARD, borderRadius: RADIUS, padding: "16px 18px", marginBottom: 12 }}
        >
          <div style={{ fontSize: 11, letterSpacing: 2.5, color: "#9FB0BC", marginBottom: 6 }}>
            疑義申立て
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.8 }}>
            「{pendingZone?.name}」を広告規制違反として申し立てますか。
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={handleSpotAccuse}
              style={{
                flex: 1,
                minHeight: 46,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: SERIF,
                letterSpacing: 2,
                color: CARD,
                background: SHU,
                border: "none",
                borderRadius: RADIUS,
                cursor: "pointer",
              }}
            >
              申し立てる
            </button>
            <button
              onClick={handleSpotWithdraw}
              style={{
                flex: 1,
                minHeight: 46,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: SERIF,
                letterSpacing: 2,
                color: CARD,
                background: "transparent",
                border: "1px solid #5A6B77",
                borderRadius: RADIUS,
                cursor: "pointer",
              }}
            >
              取り下げる
            </button>
          </div>
        </div>
      )}

      {spotMsg && !spotPending && (
        <div
          className="fade-up"
          style={{ ...card, borderLeft: `4px solid ${spotMsg.accent}`, marginBottom: 12, padding: "12px 16px" }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: spotMsg.accent }}>{spotMsg.title}</div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, marginTop: 2 }}>{spotMsg.body}</div>
        </div>
      )}

      {spotFound.length > 0 && (
        <div
          className="fade-up"
          style={{ ...card, borderLeft: `4px solid ${SHU}`, marginBottom: 12 }}
        >
          <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>
            調書 — 指摘事項
          </div>
          {spotFound.map((id, i) => {
            const z = spot.zones.find((zz) => zz.id === id)!;
            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: i < spotFound.length - 1 ? `1px dotted ${LINE}` : "none",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: SHU,
                    color: CARD,
                    fontSize: 11,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: SERIF,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 13.5, fontWeight: 700 }}>{z.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, marginTop: 2 }}>
                    {z.reason}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {spotDone && (
        <div className="fade-up">
          <div
            style={{
              ...card,
              borderLeft: `4px solid ${spotWrong === 0 ? GREEN : AI_BLUE}`,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 14, color: spotWrong === 0 ? GREEN : AI_BLUE }}>
                {spotWrong === 0
                  ? "全違反を摘発。誤指摘なし。完璧。"
                  : `全違反を摘発。ただし誤指摘 ${spotWrong} 件。`}
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
                +{Math.max(0, spot.errorCount - spotWrong)}
                <span style={{ fontSize: 12, color: MUTED }}>/{spot.errorCount}点</span>
              </span>
            </div>
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
      )}
    </>
  );
}
