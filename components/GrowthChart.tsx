/**
 * 成長グラフ(v1.5)。全件履歴(Attempt)から導いた「集印の歩み」を描く。
 *
 * - 主役の折れ線 : 審理日ごとの集印(完璧論点)累積。全論点数を天井にスケール
 * - 淡い棒 : 日別の審理数(継続の量感)。折れ線の背後に薄く敷く
 * - サマリ : 総審理・審理日数・平均得点率・集印
 *
 * 実データ(lib/growth の buildGrowth)だけで駆動し、色・書体・角丸は
 * lib/tokens を参照する(値をハードコードしない)。SVG 生成で外部依存なし。
 */
import { useMemo } from "react";
import type { Attempt, Question } from "@/types";
import { buildGrowth } from "@/lib/growth";
import { INK, CARD, SHU, MUTED, LINE, SERIF, RADIUS, AI_BLUE } from "@/lib/tokens";
import { Eyebrow } from "./Eyebrow";

/** SVG のビューボックス寸法と余白(px)。実描画は幅100%で伸縮する */
const VB_W = 320;
const VB_H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 22;
const INNER_W = VB_W - PAD_L - PAD_R;
const INNER_H = VB_H - PAD_T - PAD_B;
/** 直近この日数だけを描く(古い審理日は畳んで横幅を保つ) */
const MAX_POINTS = 24;

export function GrowthChart({
  attempts,
  questions,
}: {
  attempts: Attempt[];
  questions: Question[];
}) {
  const g = useMemo(() => buildGrowth(attempts, questions), [attempts, questions]);

  const shown = g.points.slice(-MAX_POINTS);
  const n = shown.length;
  // 天井は全論点数(最低1)。集印は「全論点完璧」へ向かう歩みとして読む
  const ceil = Math.max(g.totalTopics, 1);
  const maxDayAttempts = shown.reduce((m, p) => Math.max(m, p.attempts), 0);

  /** i 番目の点の x 座標。点が1つなら中央に置く */
  const xAt = (i: number) =>
    PAD_L + (n <= 1 ? INNER_W / 2 : (INNER_W * i) / (n - 1));
  /** 集印値 v の y 座標(上が高得点) */
  const yAt = (v: number) => PAD_T + INNER_H * (1 - v / ceil);

  const linePath = shown
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.sealCount).toFixed(1)}`)
    .join(" ");
  // 折れ線の下を淡く塗って「集印が積もる」感じを出す(1点のときは塗らない)
  const areaPath =
    n > 1
      ? `${linePath} L ${xAt(n - 1).toFixed(1)} ${(PAD_T + INNER_H).toFixed(1)} ` +
        `L ${xAt(0).toFixed(1)} ${(PAD_T + INNER_H).toFixed(1)} Z`
      : "";

  const last = shown[n - 1];

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${LINE}`,
        borderRadius: RADIUS,
        padding: "16px 18px",
        marginBottom: 12,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <Eyebrow>成長の記録</Eyebrow>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 1,
            marginTop: 3,
          }}
        >
          集印の歩み
        </div>
      </div>

      {n === 0 ? (
        <div
          style={{
            color: MUTED,
            fontSize: 12.5,
            textAlign: "center",
            padding: "22px 0",
            lineHeight: 1.9,
          }}
        >
          まだ審理の記録がありません。
          <br />
          召喚状から一肢を決着させると、ここに歩みが刻まれます。
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            width="100%"
            role="img"
            aria-label={`集印の歩み。審理日数 ${g.activeDays} 日、現在の集印 ${g.currentSeal} / ${g.totalTopics} 論点。`}
            style={{ display: "block" }}
          >
            {/* 天井(全論点完璧)ライン */}
            <line
              x1={PAD_L}
              y1={yAt(ceil)}
              x2={VB_W - PAD_R}
              y2={yAt(ceil)}
              stroke={LINE}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            {/* 基準(0)ライン */}
            <line
              x1={PAD_L}
              y1={PAD_T + INNER_H}
              x2={VB_W - PAD_R}
              y2={PAD_T + INNER_H}
              stroke={LINE}
              strokeWidth={1}
            />

            {/* 日別審理数(淡い棒。折れ線の背後の量感) */}
            {maxDayAttempts > 0 &&
              shown.map((p, i) => {
                const h = (INNER_H * 0.5 * p.attempts) / maxDayAttempts;
                const bw = n <= 1 ? 10 : Math.min(10, (INNER_W / n) * 0.5);
                return (
                  <rect
                    key={`bar-${p.day}`}
                    x={xAt(i) - bw / 2}
                    y={PAD_T + INNER_H - h}
                    width={bw}
                    height={h}
                    fill={AI_BLUE}
                    opacity={0.1}
                  />
                );
              })}

            {/* 集印の累積(主役の折れ線+塗り) */}
            {areaPath && <path d={areaPath} fill={SHU} opacity={0.08} />}
            <path
              d={linePath}
              fill="none"
              stroke={SHU}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {shown.map((p, i) => (
              <circle
                key={`dot-${p.day}`}
                cx={xAt(i)}
                cy={yAt(p.sealCount)}
                r={i === n - 1 ? 3.5 : 2}
                fill={i === n - 1 ? SHU : CARD}
                stroke={SHU}
                strokeWidth={1.5}
              />
            ))}

            {/* 最新点の集印値 */}
            {last && (
              <text
                x={Math.min(xAt(n - 1), VB_W - PAD_R - 2)}
                y={Math.max(yAt(last.sealCount) - 6, PAD_T + 8)}
                textAnchor="end"
                fontFamily={SERIF}
                fontSize={11}
                fontWeight={700}
                fill={SHU}
              >
                {last.sealCount}
              </text>
            )}

            {/* 期間ラベル(最初と最新の審理日) */}
            <text
              x={PAD_L}
              y={VB_H - 6}
              fontSize={9}
              fill={MUTED}
              textAnchor="start"
            >
              {shown[0].label}
            </text>
            {n > 1 && (
              <text
                x={VB_W - PAD_R}
                y={VB_H - 6}
                fontSize={9}
                fill={MUTED}
                textAnchor="end"
              >
                {shown[n - 1].label}
              </text>
            )}
          </svg>

          {/* サマリ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              gap: 8,
            }}
          >
            <SummaryStat label="集印" value={`${g.currentSeal}/${g.totalTopics}`} accent />
            <SummaryStat label="審理日数" value={`${g.activeDays}日`} />
            <SummaryStat label="総審理" value={`${g.totalAttempts}肢`} />
            <SummaryStat
              label="平均得点率"
              value={`${Math.round(g.avgScoreRate * 100)}%`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** サマリ1項目(明朝の数字+muted ラベル)。accent は集印だけ朱で強調 */
function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 16,
          fontWeight: 800,
          color: accent ? SHU : INK,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{label}</div>
    </div>
  );
}
