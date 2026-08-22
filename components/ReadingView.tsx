"use client";

/**
 * 参考書モード: 論点の読み物ページ本体(プロトタイプ・Issue #178)。
 * 30秒レッスンより深掘りした読み物+条文原文を表示する。
 *
 * 条文原文セクションは既定で畳む・本文の条文参照はタップでポップアップ(Issue #215)。
 */
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Reading } from "@/types";
import { QUESTIONS } from "@/data/questions";
import { itemKeysForTopic } from "@/lib/items";
import { INK, CARD, AI_BLUE, AI_BLUE_BG, MUTED, SERIF, SANS, RADIUS } from "@/lib/tokens";
import { page, col, card, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { TermPopup } from "@/components/TermPopup";
import { termify } from "@/components/TermText";
import { citify } from "@/components/CitationText";
import { CitationPopup } from "@/components/CitationPopup";
import { buildCitationIndex, citationPattern, resolveCitation, type CitationEntry } from "@/lib/citations";

/** セクション見出しから「原文を読む — 」の接頭辞を外す(畳みボタン側にラベルを寄せるため) */
const QUOTE_HEADING_PREFIX = "原文を読む — ";
function stripQuoteHeadingPrefix(heading: string): string {
  return heading.startsWith(QUOTE_HEADING_PREFIX)
    ? heading.slice(QUOTE_HEADING_PREFIX.length)
    : heading;
}

function QuoteToggle({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      style={{
        width: "100%",
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 12,
        padding: "10px 14px",
        background: AI_BLUE_BG,
        border: "none",
        borderLeft: `3px solid ${AI_BLUE}`,
        borderRadius: 4,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: SANS,
        fontSize: 12.5,
        fontWeight: 700,
        color: AI_BLUE,
      }}
    >
      <span>条文を読む — {label}</span>
      <span aria-hidden style={{ flexShrink: 0 }}>
        {open ? "▲" : "▼"}
      </span>
    </button>
  );
}

export function ReadingView({ reading }: { reading: Reading }) {
  const router = useRouter();
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationEntry | null>(null);
  const [openQuotes, setOpenQuotes] = useState<Record<number, boolean>>({});

  const citationIndex = useMemo(() => buildCitationIndex(reading), [reading]);
  const pattern = useMemo(() => citationPattern(citationIndex), [citationIndex]);
  const solveKeys = useMemo(
    () => itemKeysForTopic(reading.topicId, QUESTIONS),
    [reading],
  );

  const openTerm = (word: string) => {
    setActiveCitation(null);
    setActiveTerm(word);
  };
  const openCitation = (surface: string) => {
    const entry = resolveCitation(citationIndex, surface);
    if (!entry) return;
    setActiveTerm(null);
    setActiveCitation(entry);
  };
  const toggleQuote = (i: number) =>
    setOpenQuotes((prev) => ({ ...prev, [i]: !prev[i] }));

  const renderBody = (text: string): ReactNode => {
    const parts = citify(text, citationIndex, pattern, openCitation);
    if (typeof parts === "string") return termify(parts, openTerm);
    return (parts as ReactNode[]).map((part, i) =>
      typeof part === "string" ? (
        <span key={i}>{termify(part, openTerm)}</span>
      ) : (
        part
      ),
    );
  };

  return (
    <div style={page}>
      <div style={col}>
        <button
          onClick={() => router.push("/")}
          style={{
            ...outlineButton,
            minHeight: 44,
            padding: "8px 16px",
            fontSize: 12.5,
            marginBottom: 16,
          }}
        >
          ← 検地帳に戻る
        </button>

        <div style={{ textAlign: "center", margin: "8px 0 20px" }}>
          <Eyebrow>参考書モード ・ {reading.category}</Eyebrow>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: 15,
              fontWeight: 700,
              margin: "4px 0 4px",
            }}
          >
            {reading.title}
          </h1>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{reading.law}</p>
        </div>

        {reading.summary && reading.summary.length > 0 && (
          <div
            style={{
              ...card,
              background: AI_BLUE_BG,
              borderColor: AI_BLUE,
              marginBottom: 14,
            }}
          >
            <Eyebrow>この論点の要点</Eyebrow>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
                fontSize: 13.5,
                lineHeight: 1.85,
                color: INK,
              }}
            >
              {reading.summary.map((line, i) => (
                <p key={i} style={{ margin: 0 }}>
                  {renderBody(line)}
                </p>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {reading.sections.map((section, i) => {
            const quoteOpen = !!openQuotes[i];
            const heading = section.quote
              ? stripQuoteHeadingPrefix(section.heading)
              : section.heading;
            return (
              <div key={i} style={card}>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 15,
                    fontWeight: 800,
                    color: AI_BLUE,
                    marginBottom: 8,
                  }}
                >
                  {heading}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 13.5,
                    lineHeight: 1.85,
                    color: INK,
                  }}
                >
                  {section.body.map((p, j) => (
                    <p key={j} style={{ margin: 0 }}>
                      {renderBody(p)}
                    </p>
                  ))}
                </div>
                {section.quote && (
                  <>
                    <QuoteToggle
                      label={heading}
                      open={quoteOpen}
                      onToggle={() => toggleQuote(i)}
                    />
                    {quoteOpen && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "12px 14px",
                          background: AI_BLUE_BG,
                          borderLeft: `3px solid ${AI_BLUE}`,
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {section.quote.lines.map((line, k) => (
                            <div
                              key={k}
                              style={{
                                display: "flex",
                                gap: 8,
                                paddingLeft: line.indent ? 16 : 0,
                              }}
                            >
                              {line.label && (
                                <span
                                  style={{
                                    flexShrink: 0,
                                    fontFamily: SANS,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: AI_BLUE,
                                    minWidth: line.indent ? 16 : 40,
                                  }}
                                >
                                  {line.label}
                                </span>
                              )}
                              <p
                                style={{
                                  margin: 0,
                                  fontFamily: SANS,
                                  fontSize: 12.5,
                                  lineHeight: 1.9,
                                  color: INK,
                                }}
                              >
                                {line.text}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 11,
                            color: MUTED,
                            textAlign: "right",
                          }}
                        >
                          — {section.quote.cite}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {solveKeys.length > 0 && (
          <button
            onClick={() => router.push(`/play?items=${solveKeys.join(",")}`)}
            style={{
              width: "100%",
              minHeight: 48,
              marginTop: 16,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 3,
              color: CARD,
              background: AI_BLUE,
              border: "none",
              borderRadius: RADIUS,
              cursor: "pointer",
            }}
          >
            この論点を解く — {solveKeys.length}肢
          </button>
        )}

        <p
          style={{
            fontSize: 11,
            color: MUTED,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.8,
          }}
        >
          {reading.verified
            ? "一次ソースで裏取り済みの読み物です。"
            : "この読み物は下書き段階です(一次ソースの原文照合は未確認)。誤りに気づいたら差分を報告してください。"}
        </p>

        <TermPopup term={activeTerm} onClose={() => setActiveTerm(null)} />
        <CitationPopup entry={activeCitation} onClose={() => setActiveCitation(null)} />
      </div>
    </div>
  );
}
