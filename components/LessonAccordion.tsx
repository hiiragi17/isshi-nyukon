/** 30秒レッスン(開閉式)。プロトタイプの lessonOpen ブロックと同一 */
import { INK, AI_BLUE, SANS } from "@/lib/tokens";
import { card } from "@/lib/gameStyles";
import { termify } from "./TermText";

export function LessonAccordion({
  lesson,
  open,
  onToggle,
  onTerm,
}: {
  lesson: string[];
  open: boolean;
  onToggle: () => void;
  onTerm: (word: string) => void;
}) {
  return (
    <div style={{ ...card, marginBottom: 16, padding: 0, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 700,
          color: AI_BLUE,
          display: "flex",
          justifyContent: "space-between",
        }}
        aria-expanded={open}
      >
        <span>30秒レッスン — ルールを予習してから挑む</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul
          style={{
            margin: 0,
            padding: "0 20px 14px 36px",
            fontSize: 13.5,
            lineHeight: 1.85,
            color: INK,
          }}
        >
          {lesson.map((l, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {termify(l, onTerm)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
