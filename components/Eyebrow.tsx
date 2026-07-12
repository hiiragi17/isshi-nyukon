/** 見出しの上に置く小さなラベル(11px・字間2.5・muted)。プロトタイプの Eyebrow と同一 */
import type { ReactNode } from "react";
import { SANS, MUTED } from "@/lib/tokens";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: 11,
        letterSpacing: 2.5,
        color: MUTED,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
