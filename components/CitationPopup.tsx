/**
 * 条文参照ポップアップ(画面下部に固定表示)。`components/TermPopup.tsx` と同一の
 * 見た目・操作感で、タップされた条文参照(項/号1つぶん)の原文を表示する(Issue #215)。
 * 用語ポップアップと同時には開かない(呼び出し側で排他制御する)。
 *
 * `TermPopup` と異なり、条文の原文は用語辞書の定義文よりずっと長くなりうる
 * (報酬告示 第2 等、400字を超える引用がある)。低い画面高・拡大表示で
 * パネルが画面をはみ出すと閉じるボタンごと操作不能になるため、パネルに
 * 最大高さとスクロールを持たせ、閉じるボタンを含むヘッダーを sticky にして
 * 常に手が届くようにしている
 */
import type { ReactNode } from "react";
import { INK, CARD, INK_SUB, SERIF, SANS } from "@/lib/tokens";
import type { CitationEntry } from "@/lib/citations";
import type { ReadingTable } from "@/types";

export function CitationPopup({
  entry,
  onClose,
  renderTable,
}: {
  entry: CitationEntry | null;
  onClose: () => void;
  /**
   * 引用行に表(`line.tableAfter`)が付いている場合、その表を描画する。
   * `ReadingView` 側のテーブル描画(スタイル・用語/条文参照リンク処理込み)を
   * そのまま再利用するため、呼び出し元から渡してもらう(Codexレビュー指摘・PR #234:
   * 本文の条文参照からポップアップを開いたとき、条文中の表が読めないと引用が不完全)
   */
  renderTable: (t: ReadingTable, idPrefix: string, fallbackLabel: string) => ReactNode;
}) {
  if (!entry) return null;
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
          maxHeight: "80vh",
          overflowY: "auto",
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
            position: "sticky",
            top: 0,
            background: INK,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <b style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: 1 }}>
            {entry.line.label ?? entry.key}
          </b>
          <button
            onClick={onClose}
            aria-label="条文の原文を閉じる"
            style={{
              background: "none",
              border: "none",
              color: CARD,
              fontSize: 16,
              cursor: "pointer",
              minWidth: 44,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "-12px -12px -12px 0",
            }}
          >
            ✕
          </button>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: SANS,
            fontSize: 13.5,
            lineHeight: 1.8,
            color: "#E4E2DB",
          }}
        >
          {entry.line.text}
        </p>
        {entry.line.tableAfter &&
          renderTable(entry.line.tableAfter, "citation-table", entry.line.label ?? entry.key)}
        <p style={{ margin: "8px 0 0", fontSize: 11, color: INK_SUB, textAlign: "right" }}>
          — {entry.cite}
        </p>
      </div>
    </div>
  );
}
