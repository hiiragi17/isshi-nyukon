/**
 * 事案カード。見出し(科目 — 論点(条文))+ 事案文 + 関係図。
 * calc の問い・与件表・スタンプなどは children として同じカード内に描画する。
 * プロトタイプの play 画面「事案」ブロックと同一。
 */
import type { ReactNode } from "react";
import type { Question } from "@/types";
import { SERIF } from "@/lib/tokens";
import { card } from "@/lib/gameStyles";
import { Eyebrow } from "./Eyebrow";
import { Diagram } from "./Diagram";
import { termify } from "./TermText";

export function SceneCard({
  question,
  onTerm,
  children,
}: {
  question: Question;
  onTerm: (word: string) => void;
  children?: ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "16px 20px", marginBottom: 8, position: "relative" }}>
      <Eyebrow>
        {question.category} — {question.topic}({question.law})
      </Eyebrow>
      {question.scenario && (
        <p style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.9, margin: "8px 0 4px" }}>
          {termify(question.scenario, onTerm)}
        </p>
      )}
      {question.diagram && <Diagram data={question.diagram} />}
      {children}
    </div>
  );
}
