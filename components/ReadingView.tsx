"use client";

/**
 * 参考書モード: 論点の読み物ページ本体(プロトタイプ・Issue #178)。
 * 30秒レッスンより深掘りした読み物+条文原文を表示する。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Reading } from "@/types";
import { INK, AI_BLUE, MUTED, SERIF, SANS } from "@/lib/tokens";
import { page, col, card, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { TermPopup } from "@/components/TermPopup";
import { termify } from "@/components/TermText";

export function ReadingView({ reading }: { reading: Reading }) {
  const router = useRouter();
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const openTerm = (word: string) => setActiveTerm(word);

  return (
    <div style={page}>
      <div style={col}>
        <button
          onClick={() => router.push("/")}
          style={{
            ...outlineButton,
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
              fontSize: 26,
              fontWeight: 800,
              margin: "8px 0 4px",
              letterSpacing: 2,
            }}
          >
            {reading.title}
          </h1>
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{reading.law}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {reading.sections.map((section, i) => (
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
                {section.heading}
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
                    {termify(p, openTerm)}
                  </p>
                ))}
              </div>
              {section.quote && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    background: "rgba(51,85,126,0.06)",
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
            </div>
          ))}
        </div>

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
      </div>
    </div>
  );
}
