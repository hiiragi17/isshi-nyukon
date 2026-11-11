/**
 * マイソク広告の認容済みゾーンに付く、丸印+番号バッジ(広告ごとの bespoke コンポーネント共通)。
 * もとは HibariAd / MidoridaiAd / SakuraAd にそれぞれ同一の実装があった(描画は変えていない)。
 */
import type { CSSProperties } from "react";
import { CARD, SHU, SERIF } from "@/lib/tokens";

/** 認容済みゾーンの丸印+番号バッジ。モジュールスコープに置き、再レンダー時の
 *  再マウント(fade-up アニメーション再発火)を避ける */
export function Mark({
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
