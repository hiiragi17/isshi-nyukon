/**
 * 用語辞書ポップアップ(画面下部に固定表示)。プロトタイプの activeTerm 表示と同一。
 * タップされた表記(word / alias)を lib/terms の termDef で定義に引き直す。
 */
import { INK, CARD, SERIF } from "@/lib/tokens";
import { termDef } from "@/lib/terms";

export function TermPopup({
  term,
  onClose,
}: {
  term: string | null;
  onClose: () => void;
}) {
  if (!term) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px 16px",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        className="fade-up"
        style={{
          width: "100%",
          maxWidth: 560,
          background: INK,
          color: CARD,
          borderRadius: 12,
          padding: "14px 18px 16px",
          boxShadow: "0 10px 28px rgba(38,51,59,0.35)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <b style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: 1 }}>{term}</b>
          <button
            onClick={onClose}
            aria-label="用語の説明を閉じる"
            style={{
              background: "none",
              border: "none",
              color: CARD,
              fontSize: 16,
              cursor: "pointer",
              padding: "0 2px",
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: "#E4E2DB" }}>
          {termDef(term)}
        </p>
      </div>
    </div>
  );
}
