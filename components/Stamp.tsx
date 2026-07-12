/** 朱印スタンプ演出(judge の正/誤、判決の合格/追試など)。プロトタイプの Stamp と同一 */
import { SERIF, CARD } from "@/lib/tokens";

export function Stamp({
  text,
  color,
  small,
}: {
  text: string;
  color: string;
  small?: boolean;
}) {
  const size = small ? 52 : 92;
  return (
    <div
      className="stamp-in"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${small ? 2.5 : 4}px solid ${color}`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SERIF,
        fontWeight: 800,
        fontSize: small ? 20 : 34,
        transform: "rotate(-12deg)",
        letterSpacing: text.length > 1 ? 1 : 0,
        background: "rgba(251,250,247,0.85)",
        boxShadow: `0 0 0 1px rgba(191,59,51,0.06)`,
      }}
    >
      {text}
    </div>
  );
}
