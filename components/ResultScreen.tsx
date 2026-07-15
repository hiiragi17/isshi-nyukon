"use client";

/**
 * 判決(result)画面。プロトタイプ takken-zenshi-game.jsx の result 分岐を
 * play/page.tsx から切り出したもの(見た目・挙動・得点は不変)。
 *
 * 純粋な描画コンポーネントに寄せ、セッション状態を書き換える操作
 * (取りこぼし再戦 / 範囲選び直し)は親から onRetryMisses / onToTop で受け取る。
 * 検地帳への遷移は新規完璧到達論点(newlyPerfectIds)にのみ依存するため内部で完結させる。
 */
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/data/questions";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, RADIUS } from "@/lib/tokens";
import { page, col, card } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { Stamp } from "@/components/Stamp";

/** 判決画面が扱うセッション成績1件(qi=問題添字 / ci=肢番号) */
export type ItemRecord = { qi: number; ci: number; pts: number; max: number };

export function ResultScreen({
  records,
  score,
  sessionMax,
  newlyPerfectIds,
  onRetryMisses,
  onToTop,
}: {
  records: ItemRecord[];
  score: number;
  sessionMax: number;
  /** このセッションで新たに完璧到達した論点の questionId(検地帳で朱印を押させる) */
  newlyPerfectIds: string[];
  onRetryMisses: () => void;
  onToTop: () => void;
}) {
  const router = useRouter();
  const pct = sessionMax > 0 ? Math.round((score / sessionMax) * 100) : 0;
  const passed = pct >= 70;
  const misses = records.filter((r) => r.pts < r.max);
  const topicsInSession = [...new Set(records.map((r) => r.qi))];
  const toDashboard = () =>
    router.push(newlyPerfectIds.length ? `/?stamped=${newlyPerfectIds.join(",")}` : "/");

  return (
    <div style={page}>
      <div style={col}>
        <div style={{ textAlign: "center", margin: "36px 0 20px" }}>
          <Eyebrow>判決</Eyebrow>
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 16px" }}>
            <Stamp text={passed ? "合格" : "追試"} color={passed ? SHU : AI_BLUE} />
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 800, lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 12.5, color: MUTED, marginTop: 6 }}>
            {sessionMax}点満点中({pct}%)
          </div>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 1.8 }}>
            本試験の合格ラインもおおむね7割。
            {passed ? "この調子です。" : "落とした肢を潰していきましょう。"}
          </p>
        </div>

        <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
          {topicsInSession.map((i, n) => {
            const rs = records.filter((r) => r.qi === i);
            const pts = rs.reduce((s, r) => s + r.pts, 0);
            const max = rs.reduce((s, r) => s + r.max, 0);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "12px 0",
                  borderBottom:
                    n < topicsInSession.length - 1 ? `1px solid ${LINE}` : "none",
                  fontSize: 14.5,
                }}
              >
                <div>
                  <b>{QUESTIONS[i].topic}</b>
                  <span style={{ color: MUTED, marginLeft: 8, fontSize: 11.5 }}>
                    {QUESTIONS[i].law}({rs.length}肢)
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 700,
                    fontSize: 15,
                    fontVariantNumeric: "tabular-nums",
                    color: pts === max ? GREEN : pts >= max * 0.6 ? INK : SHU,
                  }}
                >
                  {pts} / {max}
                </div>
              </div>
            );
          })}
        </div>

        {misses.length > 0 && (
          <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${SHU}` }}>
            <Eyebrow>要再審理</Eyebrow>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 8px" }}>
              取りこぼした肢({misses.length}肢)
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                lineHeight: 1.9,
                color: MUTED,
              }}
            >
              {misses.map((r, i) => (
                <li key={i}>
                  <span style={{ color: INK }}>
                    {QUESTIONS[r.qi].topic} —{" "}
                    {QUESTIONS[r.qi].type === "calc"
                      ? "計算"
                      : QUESTIONS[r.qi].type === "spot"
                        ? "広告"
                        : `肢${r.ci + 1}`}
                  </span>
                  <span style={{ fontFamily: SERIF, marginLeft: 8, color: SHU }}>
                    {r.pts}/{r.max}点
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {misses.length > 0 && (
          <button
            onClick={onRetryMisses}
            style={{
              width: "100%",
              padding: "15px 0",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 4,
              color: CARD,
              background: SHU,
              border: "none",
              borderRadius: RADIUS,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            落とした{misses.length}肢だけ、すぐ再戦
          </button>
        )}
        <button
          onClick={onToTop}
          style={{
            width: "100%",
            padding: "15px 0",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: SERIF,
            letterSpacing: 3,
            color: misses.length > 0 ? INK : CARD,
            background: misses.length > 0 ? CARD : INK,
            border: misses.length > 0 ? `2px solid ${INK}` : "none",
            borderRadius: RADIUS,
            cursor: "pointer",
          }}
        >
          出題範囲を選び直す
        </button>
        <button
          onClick={toDashboard}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 10,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: SERIF,
            letterSpacing: 3,
            color: AI_BLUE,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          検地帳へ戻る
        </button>
      </div>
    </div>
  );
}
