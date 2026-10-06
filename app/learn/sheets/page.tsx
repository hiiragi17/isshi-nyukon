/**
 * 暗記シート(コラム)。横断で見るほうが覚えやすい数字を1ページにまとめる。
 * 静的データだけで描画するためサーバーコンポーネント(状態・遷移は Link とアンカーのみ)。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SHEETS } from "@/data/sheets";
import type { ReadingTable } from "@/types";
import { INK, CARD, AI_BLUE, MUTED, LINE, SERIF, SANS, RADIUS } from "@/lib/tokens";
import { page, col, card, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

export const metadata: Metadata = { title: "暗記シート | 一肢入魂" };

/** 列数ごとの列幅(固定レイアウト。狭い画面でも横スクロールさせず折り返す) */
const COL_WIDTHS: Record<number, string[]> = {
  2: ["32%", "68%"],
  3: ["26%", "40%", "34%"],
};

function SheetTable({ t, label }: { t: ReadingTable; label: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      {t.caption && (
        <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 4 }}>
          {t.caption}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table
          aria-label={t.caption ?? label}
          style={{
            width: "100%",
            tableLayout: "fixed" as const,
            overflowWrap: "anywhere" as const,
            borderCollapse: "collapse",
            fontFamily: SANS,
            fontSize: 12.5,
            lineHeight: 1.7,
          }}
        >
          <colgroup>
            {t.headers.map((h, i) => (
              <col key={h} style={{ width: COL_WIDTHS[t.headers.length]?.[i] ?? "auto" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {t.headers.map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: `2px solid ${AI_BLUE}`,
                    color: AI_BLUE,
                    fontWeight: 700,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, ci) => {
                  const style = {
                    padding: "6px 8px",
                    borderBottom: `1px solid ${LINE}`,
                    color: INK,
                    verticalAlign: "top" as const,
                  };
                  return ci === 0 ? (
                    <th key={ci} scope="row" style={{ ...style, textAlign: "left", fontWeight: 700 }}>
                      {cell}
                    </th>
                  ) : (
                    <td key={ci} style={style}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SheetsPage() {
  return (
    <div style={page}>
      <div style={col}>
        <Link
          href="/learn"
          style={{
            ...outlineButton,
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            padding: "8px 16px",
            fontSize: 12.5,
            marginBottom: 16,
            textDecoration: "none",
          }}
        >
          ← 参考書に戻る
        </Link>

        {SHEETS.map((sheet) => (
          <article key={sheet.id}>
            <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
              <Eyebrow>暗記シート</Eyebrow>
              <h1 style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, margin: "4px 0 4px" }}>
                {sheet.title}
              </h1>
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{sheet.law}</p>
            </div>

            <p
              style={{
                fontSize: 13,
                lineHeight: 1.9,
                fontWeight: 700,
                margin: "0 0 8px",
              }}
            >
              {sheet.description}
            </p>

            {sheet.intro.map((p) => (
              <p key={p} style={{ fontSize: 13, lineHeight: 1.9, margin: "0 0 8px" }}>
                {p}
              </p>
            ))}

            {!sheet.verified && (
              <p
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.8,
                  color: MUTED,
                  border: `1px dashed ${LINE}`,
                  borderRadius: RADIUS,
                  padding: "8px 12px",
                  margin: "12px 0",
                }}
              >
                このシートは一次ソースとの照合前です。試験前に条文・公式資料で確認してください。
              </p>
            )}

            <nav
              aria-label="節の目次"
              style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 20px" }}
            >
              {sheet.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                    padding: "0 14px",
                    background: CARD,
                    border: `1px solid ${LINE}`,
                    borderRadius: RADIUS,
                    color: AI_BLUE,
                    fontFamily: SERIF,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {s.heading}
                </a>
              ))}
            </nav>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {sheet.sections.map((s) => (
                <section key={s.id} id={s.id} style={{ ...card, scrollMarginTop: 16 }}>
                  <h2 style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, margin: 0 }}>
                    {s.heading}
                  </h2>
                  {s.lead && (
                    <p style={{ fontSize: 13, lineHeight: 1.9, margin: "6px 0 0" }}>{s.lead}</p>
                  )}
                  {s.tables.map((t, i) => (
                    <SheetTable key={i} t={t} label={s.heading} />
                  ))}
                  {s.notes?.map((n) => (
                    <p key={n} style={{ fontSize: 12.5, lineHeight: 1.9, margin: "12px 0 0" }}>
                      {n}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </article>
        ))}

        <DisclaimerFooter />
      </div>
    </div>
  );
}
