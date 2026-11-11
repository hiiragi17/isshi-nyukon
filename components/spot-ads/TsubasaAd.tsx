/**
 * マイソク広告 その4(q164・造成中の宅地分譲 / つばさ不動産)。
 * q6(朱・戸建売買)/ q11(青・賃貸)/ q57(深緑・分譲マンション)とは配色・レイアウトを変えた
 * bespoke な宅地分譲チラシ(土色)。
 * 違反ゾーン: kyori(駅までの距離の誇大表示・32条)/ kaihatsuB(開発許可の申請中に広告・33条)/
 *   torihiki(物件概要に取引態様の記載がない・34条1項)。
 * 適法: kaihatsuA(開発許可の取得後の広告)/ safeAddress / safePrice。
 */
import { AI_BLUE, SHU, SERIF } from "@/lib/tokens";
import { Mark } from "./Mark";
import type { SpotAdProps } from "./types";

/** この広告の accent(造成中の宅地分譲は土色にして q6 の朱・q11 の青・q57 の深緑と区別) */
const EARTH = "#9A5B1F";

export function TsubasaAd({ found, pending, done, onTap }: SpotAdProps) {
  const zb = (id: string) =>
    `2px solid ${pending === id ? AI_BLUE : "transparent"}`;
  /** 区画カードの枠: 通常は左に土色の帯、申立て確認中は青枠 */
  const edge = (id: string) =>
    pending === id
      ? { border: `2px solid ${AI_BLUE}` }
      : { border: "2px solid transparent", borderLeft: `4px solid ${EARTH}` };

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
          transform: "rotate(-2deg)",
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
          transform: "rotate(4deg)",
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
          transform: "rotate(0.4deg)",
          padding: "12px 12px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `2px solid ${EARTH}`,
            paddingBottom: 6,
          }}
        >
          <b style={{ fontSize: 13, letterSpacing: 1 }}>つばさ不動産</b>
          <span
            style={{
              background: EARTH,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
            }}
          >
            宅地分譲・造成中
          </span>
        </div>

        {/* 分譲地名 */}
        <div
          style={{
            marginTop: 8,
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          つばさ台 全2区画
        </div>

        {/* キャッチコピー(駅までの距離) */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => onTap("kyori")}
            style={{
              position: "relative",
              cursor: "pointer",
              padding: "4px 10px",
              minHeight: 44,
              background: EARTH,
              color: "#fff",
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 1,
              border: zb("kyori"),
            }}
          >
            駅まで1kmの好立地!
            <Mark id="kyori" inset="-5px -7px" rot={-2} badge={{ top: -13, left: -13 }} found={found} />
          </button>
        </div>

        {/* 区画図(適法な画像枠。ここは違反ではない) */}
        <div
          style={{
            height: 76,
            marginTop: 10,
            background:
              "repeating-linear-gradient(45deg,#F1E9DC 0 12px,#E8DECC 12px 24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A89678",
            fontSize: 12,
            letterSpacing: 2,
          }}
        >
          区画図(イメージ)
        </div>

        {/* A区画(開発許可の取得後の広告 → 適法) */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => onTap("kaihatsuA")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              textAlign: "left",
              padding: "6px 8px",
              fontFamily: "inherit",
              ...edge("kaihatsuA"),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <b style={{ fontFamily: SERIF, fontSize: 14 }}>A区画</b>
              <span style={{ fontSize: 11.5, color: "#555" }}>128.4㎡</span>
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
              開発許可取得済(みどり県指令都第123号)・造成工事中
            </div>
          </button>
        </div>

        {/* B区画(開発許可の申請中に広告 → 33条違反) */}
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => onTap("kaihatsuB")}
            style={{
              position: "relative",
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              textAlign: "left",
              padding: "6px 8px",
              fontFamily: "inherit",
              ...edge("kaihatsuB"),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <b style={{ fontFamily: SERIF, fontSize: 14 }}>B区画</b>
              <span style={{ fontSize: 11.5, color: "#555" }}>135.0㎡</span>
            </div>
            <div style={{ fontSize: 11, color: EARTH, fontWeight: 700, marginTop: 2 }}>
              開発許可申請中・ただいま申込受付中!
            </div>
            <Mark id="kaihatsuB" inset="-2px -4px" rot={-1} badge={{ top: -11, right: -9 }} found={found} />
          </button>
        </div>

        {/* 価格・所在地(適法な事実の記載) */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => onTap("safePrice")}
            style={{
              cursor: "pointer",
              background: "none",
              width: "100%",
              minHeight: 44,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 2px",
              border: zb("safePrice"),
              borderBottom: "1px dotted #DDD",
              fontFamily: "inherit",
              fontSize: 11.5,
              color: "#333",
              textAlign: "left",
            }}
          >
            <span style={{ color: "#888" }}>価格(税込)</span>
            <b>A区画 1,980万円 / B区画 2,180万円</b>
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
            <span style={{ color: "#888" }}>所在地</span>
            <b>みどり市つばさ台2-5(第一種低層住居専用地域)</b>
          </button>
        </div>

        {/* 物件概要(取引態様の記載がない → 34条1項違反) */}
        <button
          onClick={() => onTap("torihiki")}
          style={{
            position: "relative",
            cursor: "pointer",
            background: "#FBF8F2",
            width: "100%",
            marginTop: 6,
            textAlign: "left",
            padding: "8px 10px",
            fontFamily: "inherit",
            fontSize: 11,
            color: "#333",
            lineHeight: 1.7,
            border: zb("torihiki"),
          }}
        >
          <b style={{ fontFamily: SERIF, fontSize: 12, color: EARTH }}>物件概要</b>
          <div>設備: 上下水道・都市ガス</div>
          <div>引渡し: 造成工事完了後(令和9年3月予定)</div>
          <div>問合せ: 0120-000-000(担当・山田)</div>
          <Mark id="torihiki" inset="-2px -4px" rot={1} badge={{ top: -11, right: -9 }} found={found} />
        </button>

        <div
          style={{
            fontSize: 9,
            color: "#999",
            marginTop: 6,
            borderTop: "1px solid #EEE",
            paddingTop: 4,
          }}
        >
          つばさ不動産株式会社 / みどり県知事(1)第90123号
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
