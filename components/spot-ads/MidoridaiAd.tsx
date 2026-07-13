/**
 * マイソク広告 その1(q6・戸建売買 / みどり台不動産販売)。
 * もとの SpotAd の内容をそのまま移設したもの(見た目・挙動は不変)。
 * レイアウトは意図的にハードコード(既決事項: 広告ごとに bespoke)。
 */
import type { CSSProperties } from "react";
import { CARD, AI_BLUE, SHU, SERIF } from "@/lib/tokens";
import type { SpotAdProps } from "./types";

export function MidoridaiAd({ found, pending, done, onTap }: SpotAdProps) {
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
          left: 38,
          width: 64,
          height: 18,
          background: "rgba(203,192,158,0.55)",
          transform: "rotate(-4deg)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 2,
          right: 38,
          width: 64,
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
          transform: "rotate(-0.6deg)",
          padding: "12px 12px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #C7000B",
            paddingBottom: 6,
          }}
        >
          <b style={{ fontSize: 13, letterSpacing: 1 }}>みどり台不動産販売</b>
          <span
            style={{
              background: "#C7000B",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            売買・戸建
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onTap("A")}
            style={{
              position: "relative",
              cursor: "pointer",
              padding: "4px 8px",
              minHeight: 32,
              background: "#C7000B",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1,
              border: zb("A"),
            }}
          >
            新築
            <Mark id="A" inset="-5px -7px" rot={-3} badge={{ top: -13, left: -13 }} />
          </button>
          <button
            onClick={() => onTap("B")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              padding: "4px 2px",
              minHeight: 32,
              textAlign: "left",
              fontFamily: "inherit",
              border: zb("B"),
            }}
          >
            <span style={{ color: "#C7000B", fontSize: 14.5, fontWeight: 800 }}>
              日本一の眺望!陽当り良好
            </span>
            <Mark id="B" inset="-4px -6px" rot={-2} badge={{ top: -13, right: -10 }} />
          </button>
        </div>

        <button
          onClick={() => onTap("D")}
          style={{
            position: "relative",
            cursor: "pointer",
            padding: 0,
            width: "100%",
            marginTop: 10,
            display: "block",
            background: "none",
            fontFamily: "inherit",
            border: zb("D"),
          }}
        >
          <div
            style={{
              height: 110,
              background:
                "repeating-linear-gradient(45deg,#E8E6E0 0 12px,#DEDCD4 12px 24px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9AA09A",
              fontSize: 12,
              letterSpacing: 2,
            }}
          >
            外観写真
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 6,
              fontSize: 9,
              color: "#666",
              background: "rgba(255,255,255,0.85)",
              padding: "1px 4px",
            }}
          >
            ※写真はイメージです(当社施工例)
          </div>
          <Mark id="D" inset="6px 20px" rot={-2} badge={{ top: -8, right: 8 }} />
        </button>

        <button
          onClick={() => onTap("safePrice")}
          style={{
            cursor: "pointer",
            background: "none",
            width: "100%",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            marginTop: 10,
            border: zb("safePrice"),
            borderBottom: "1px solid #DDD",
            padding: "2px 2px 6px",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 11, color: "#555" }}>販売価格</span>
          <span style={{ color: "#C7000B", fontSize: 24, fontWeight: 800, letterSpacing: 0.5 }}>
            3,480<span style={{ fontSize: 13 }}>万円</span>
          </span>
          <span style={{ fontSize: 10, color: "#777" }}>(税込)</span>
        </button>

        <div style={{ fontSize: 11.5, color: "#333" }}>
          <button
            onClick={() => onTap("C")}
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
              border: zb("C"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>交通</span>
            <b>みどり線「みどり台」駅 徒歩3分(約650m)</b>
            <Mark id="C" inset="0 90px 0 46px" rot={-1} badge={{ top: -9, right: 84 }} />
          </button>
          <button
            onClick={() => onTap("safeMadori")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 34,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeMadori"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>間取り</span>
            <b>3LDK(土地120.5㎡ / 建物98.2㎡)</b>
          </button>
          <button
            onClick={() => onTap("safeChiku")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 34,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safeChiku"),
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>築年月</span>
            <b>2023年4月(築3年)</b>
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
          みどり県知事(1)第12345号 / (公社)全国宅地建物取引業保証協会加入
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
