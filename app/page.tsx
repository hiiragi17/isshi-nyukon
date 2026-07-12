import { SERIF } from "@/lib/tokens";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <h1 style={{ fontFamily: SERIF, fontWeight: 700 }}>一肢入魂</h1>
    </main>
  );
}
