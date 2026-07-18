/**
 * マイソク広告 その3(q57・新築分譲マンション / ひばり不動産販売)。
 * q6(朱・戸建売買)/ q11(青・賃貸)とは配色・レイアウトを変えた bespoke な分譲チラシ。
 * 違反ゾーン: nikaku(二重価格表示)/ shineki(構想段階の新駅)/
 *   loan(返済例のみで融資条件なし)/ school(距離・分数のない施設表示)。
 * 適法: safeWalk / safeArea / safeAddress。
 */
import type { CSSProperties } from "react";
import { CARD, AI_BLUE, SHU, SERIF } from "@/lib/tokens";
import type { SpotAdProps } from "./types";

/** この広告の accent(分譲チラシは深緑にして q6 の朱・q11 の青と区別) */
const DEEP_GREEN = "#2E6B4F";

/** 認容済みゾーンの丸印+番号バッジ。モジュールスコープに置き、再レンダー時の
 *  再マウント(fade-up アニメーション再発火)を避ける */
function Mark({
  id,
  inset,
  rot,
  badge,
  found,
}: {
  id: string;
  inset: string;
  rot: number;
  badge: CSSProperties;
  found: string[];
}) {
  if (!found.includes(id)) return null;
  return (
    <>
      <span
        className="fade-up"
        style={{
          position: "absolute",
          inset,
          border: "2.5px solid rgba(191,59,51,0.85)",
          borderRadius: "50%",
          transform: `rotate(${rot}deg)`,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          ...badge,
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
        {found.indexOf(id) + 1}
      </span>
    </>
  );
}

export function HibariAd({ found, pending, done, onTap }: SpotAdProps) {
  const zb = (id: string) =>
    `2px solid ${pending === id ? AI_BLUE : "transparent"}`;

  return (
    <div style={{ position: "relative", padding: "14px 10px 10px" }}>
      {/* 台紙のテープ */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: 44,
          width: 60,
          height: 18,
          background: "rgba(203,192,158,0.55)",
          transform: "rotate(-3deg)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          right: 44,
          width: 60,
          height: 18,
          background: "rgba(203,192,158,0.55)",
          transform: "rotate(3deg)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          border: "1px solid #C9C7BE",
          boxShadow: "0 2px 8px rgba(38,51,59,0.12)",
          transform: "rotate(-0.5deg)",
          padding: "12px 12px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `2px solid ${DEEP_GREEN}`,
            paddingBottom: 6,
          }}
        >
          <b style={{ fontSize: 13, letterSpacing: 1 }}>ひばり不動産販売</b>
          <span
            style={{
              background: DEEP_GREEN,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            新築分譲マンション
          </span>
        </div>

        {/* 物件名 */}
        <div
          style={{
            marginTop: 8,
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          ひばりヶ丘グランレジデンス
        </div>

        {/* 価格(二重価格表示)とローン訴求 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onTap("nikaku")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              padding: "4px 2px",
              minHeight: 44,
              textAlign: "left",
              fontFamily: "inherit",
              border: zb("nikaku"),
            }}
          >
            <span style={{ fontSize: 12, color: "#777", textDecoration: "line-through" }}>
              通常価格3,480万円
            </span>
            <span style={{ color: SHU, fontSize: 12, fontWeight: 800 }}> → </span>
            <span style={{ color: DEEP_GREEN, fontSize: 22, fontWeight: 800 }}>
              2,980<span style={{ fontSize: 12 }}>万円!</span>
            </span>
            <Mark id="nikaku" inset="-3px -5px" rot={-2} badge={{ top: -11, left: -11 }} found={found} />
          </button>
          <button
            onClick={() => onTap("loan")}
            style={{
              position: "relative",
              cursor: "pointer",
              padding: "4px 8px",
              minHeight: 44,
              background: DEEP_GREEN,
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: 0.5,
              border: zb("loan"),
            }}
          >
            頭金0円・月々わずか5.2万円!
            <Mark id="loan" inset="-5px -7px" rot={3} badge={{ top: -13, right: -11 }} found={found} />
          </button>
        </div>

        {/* 外観完成予想図(適法な画像枠。ここは違反ではない) */}
        <div
          style={{
            height: 96,
            marginTop: 10,
            background:
              "repeating-linear-gradient(45deg,#E8F0EA 0 12px,#DEE9E1 12px 24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8FA89A",
            fontSize: 12,
            letterSpacing: 2,
          }}
        >
          外観完成予想図
        </div>

        <div style={{ fontSize: 11.5, color: "#333", marginTop: 8 }}>
          <button
            onClick={() => onTap("safeWalk")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeWalk"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>交通</span>
            <b>ひばり線「ひばりヶ丘」駅 徒歩5分(約400m)</b>
          </button>
          <button
            onClick={() => onTap("shineki")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("shineki"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>新駅</span>
            <b>(仮称)ひばり新線新駅 徒歩3分 ※2028年開業構想</b>
            <Mark id="shineki" inset="0 40px 0 44px" rot={-1} badge={{ top: -9, right: 34 }} found={found} />
          </button>
          <button
            onClick={() => onTap("school")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("school"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>周辺環境</span>
            <b>ひばり小学校 すぐそば!</b>
            <Mark id="school" inset="0 6px 0 66px" rot={-1} badge={{ top: -9, right: 0 }} found={found} />
          </button>
          <button
            onClick={() => onTap("safeArea")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeArea"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>専有面積</span>
            <b>70.2㎡(壁芯・バルコニー面積を含まない)</b>
          </button>
          <button
            onClick={() => onTap("safeAddress")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeAddress"),
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>所在地 / 総戸数</span>
            <b>みどり市ひばりヶ丘1-3 / 48戸</b>
          </button>
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#999",
            marginTop: 6,
            borderTop: "1px solid #EEE",
            paddingTop: 4,
          }}
        >
          みどり県知事(3)第45678号 / (公社)不動産公正取引協議会加盟
        </div>

        {done && (
          <div
            className="stamp-in"
            style={{
              position: "absolute",
              top: "34%",
              left: "50%",
              marginLeft: -44,
              width: 88,
              height: 88,
              borderRadius: "50%",
              border: `3px solid ${SHU}`,
              color: SHU,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SERIF,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: 4,
              transform: "rotate(-12deg)",
              background: "rgba(255,255,255,0.82)",
              zIndex: 3,
            }}
          >
            摘発
          </div>
        )}
      </div>
    </div>
  );
}
