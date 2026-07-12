/**
 * マイソク広告 その2(q11・賃貸マンション / さくら住宅サービス)。
 * q6 とは配色・レイアウトを変えた bespoke な賃貸チラシ。
 * 違反ゾーン: walk(徒歩分数)/ area(専有面積にバルコニー算入)/
 *   cost(初期費用0円の誤認)/ best(根拠なき最安値)。適法: safeRent / safeDeposit / safeAddress。
 */
import type { CSSProperties } from "react";
import { CARD, AI_BLUE, SHU, SERIF } from "@/lib/tokens";
import type { SpotAdProps } from "./types";

/** この広告の accent(賃貸チラシは青系にして q6 の朱と区別) */
const BLUE = "#1F6FB2";

export function SakuraAd({ found, pending, done, onTap }: SpotAdProps) {
  const zb = (id: string) =>
    `2px solid ${pending === id ? AI_BLUE : "transparent"}`;

  const Mark = ({
    id,
    inset,
    rot,
    badge,
  }: {
    id: string;
    inset: string;
    rot: number;
    badge: CSSProperties;
  }) =>
    found.includes(id) ? (
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
    ) : null;

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
          transform: "rotate(3deg)",
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
          transform: "rotate(-3deg)",
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
          transform: "rotate(0.5deg)",
          padding: "12px 12px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `2px solid ${BLUE}`,
            paddingBottom: 6,
          }}
        >
          <b style={{ fontSize: 13, letterSpacing: 1 }}>さくら住宅サービス</b>
          <span
            style={{
              background: BLUE,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            賃貸・マンション
          </span>
        </div>

        {/* キャッチコピー(初期費用0円 / 地域最安値) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onTap("cost")}
            style={{
              position: "relative",
              cursor: "pointer",
              padding: "4px 8px",
              minHeight: 32,
              background: BLUE,
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              border: zb("cost"),
            }}
          >
            初期費用0円!
            <Mark id="cost" inset="-5px -7px" rot={-3} badge={{ top: -13, left: -13 }} />
          </button>
          <button
            onClick={() => onTap("best")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              padding: "4px 2px",
              minHeight: 32,
              textAlign: "left",
              fontFamily: "inherit",
              border: zb("best"),
            }}
          >
            <span style={{ color: BLUE, fontSize: 14.5, fontWeight: 800 }}>
              地域最安値・掘り出し物件!
            </span>
            <Mark id="best" inset="-4px -6px" rot={-2} badge={{ top: -13, right: -10 }} />
          </button>
        </div>

        {/* 室内写真(適法な画像枠。ここは違反ではない) */}
        <div
          style={{
            height: 104,
            marginTop: 10,
            background:
              "repeating-linear-gradient(45deg,#E7EEF3 0 12px,#DCE6EC 12px 24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8FA2AE",
            fontSize: 12,
            letterSpacing: 2,
          }}
        >
          室内写真
        </div>

        {/* 家賃(適法な総額表示) */}
        <button
          onClick={() => onTap("safeRent")}
          style={{
            cursor: "pointer",
            background: "none",
            width: "100%",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginTop: 10,
            border: zb("safeRent"),
            borderBottom: "1px solid #DDD",
            padding: "2px 2px 6px",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 11, color: "#555" }}>家賃</span>
          <span style={{ color: BLUE, fontSize: 24, fontWeight: 800, letterSpacing: 0.5 }}>
            6.8<span style={{ fontSize: 13 }}>万円/月</span>
          </span>
          <span style={{ fontSize: 10, color: "#777" }}>(管理費別)</span>
        </button>

        <div style={{ fontSize: 11.5, color: "#333" }}>
          <button
            onClick={() => onTap("walk")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 40,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("walk"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>交通</span>
            <b>さくら線「さくら中央」駅 徒歩1分(約200m)</b>
            <Mark id="walk" inset="0 84px 0 46px" rot={-1} badge={{ top: -9, right: 78 }} />
          </button>
          <button
            onClick={() => onTap("area")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 40,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("area"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>専有面積</span>
            <b>28.0㎡(バルコニー含む)</b>
            <Mark id="area" inset="0 66px 0 60px" rot={-1} badge={{ top: -9, right: 60 }} />
          </button>
          <button
            onClick={() => onTap("safeDeposit")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 34,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeDeposit"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>敷金 / 礼金</span>
            <b>敷金1ヶ月 / 礼金1ヶ月</b>
          </button>
          <button
            onClick={() => onTap("safeAddress")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 34,
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
            <span style={{ color: "#888" }}>所在地</span>
            <b>みどり市さくら町2-5</b>
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
          みどり県知事(2)第67890号 / (公社)全国宅地建物取引業保証協会加入
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
