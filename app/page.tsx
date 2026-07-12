import Link from "next/link";
import { SERIF, INK, CARD, MUTED } from "@/lib/tokens";

/**
 * トップページ(暫定)。T6 で検地帳ダッシュボードに差し替える。
 * 現状はセッション画面(/play)への入口だけを置く。
 */
export default function Home() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 44, letterSpacing: 6 }}>
        一肢入魂
      </h1>
      <p style={{ color: MUTED, fontSize: 13, lineHeight: 2, margin: "8px 0 28px" }}>
        4択を当てるゲームではない。
        <br />
        全部の肢に、理由をつけて決着をつけるゲーム。
      </p>
      <Link
        href="/play"
        style={{
          display: "inline-block",
          padding: "16px 40px",
          fontSize: 17,
          fontWeight: 700,
          fontFamily: SERIF,
          letterSpacing: 5,
          color: CARD,
          background: INK,
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        開廷する
      </Link>
    </main>
  );
}
