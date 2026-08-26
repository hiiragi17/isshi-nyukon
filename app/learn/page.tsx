"use client";

/**
 * 参考書モードの一覧ページ(Issue #178)。
 * 検地帳の論点詳細を経由しなくても、分野別に読み物を一覧・直接閲覧できる入口。
 *
 * 分野ごとに開閉できる(初期状態は全開)。分野が増えても一覧性を保てるよう、
 * `/play` の論点選択画面(app/play/page.tsx の toggleCatOpen)と同じ
 * 開閉パターンを使う。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { READINGS } from "@/data/readings";
import { byCategoryPriority } from "@/lib/categories";
import { INK, CARD, AI_BLUE, MUTED, LINE, SERIF, SANS, RADIUS } from "@/lib/tokens";
import { page, col, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";

export default function LearnIndexPage() {
  const router = useRouter();
  const readings = [...READINGS.values()];
  const categories = [...new Set(readings.map((r) => r.category))].sort(
    byCategoryPriority,
  );
  // 初期状態は全分野を開いておく(現状は分野が少なく、たたむと何も見えなくなるため)。
  // 分野が増えたときにたたむ操作自体は使えるようにしておく
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(categories),
  );

  const toggleCatOpen = (cat: string) => {
    setOpenCats((s) => {
      const next = new Set(s);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
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
          <Eyebrow>参考書モード</Eyebrow>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: 15,
              fontWeight: 700,
              margin: "4px 0 4px",
            }}
          >
            論点を読む
          </h1>
          <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.8 }}>
            30秒レッスンより深掘りした読み物。宅建業法から順に拡充予定。
          </p>
        </div>

        {readings.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13, textAlign: "center" }}>
            まだ読み物がありません。
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {categories.map((cat, catIdx) => {
              const catReadings = readings.filter((r) => r.category === cat);
              const catOpen = openCats.has(cat);
              const listId = `reading-list-${catIdx}`;
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => toggleCatOpen(cat)}
                    aria-expanded={catOpen}
                    aria-controls={listId}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px 0",
                      minHeight: 44,
                      color: INK,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        width: 16,
                        textAlign: "center",
                        fontFamily: SANS,
                        fontSize: 14,
                        fontWeight: 700,
                        color: AI_BLUE,
                      }}
                    >
                      {catOpen ? "−" : "+"}
                    </span>
                    <span
                      style={{
                        fontFamily: SERIF,
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {cat}
                    </span>
                    <span
                      style={{
                        fontFamily: SANS,
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      {catReadings.length}論点
                    </span>
                  </button>
                  {catOpen && (
                    <div
                      id={listId}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {catReadings.map((r) => (
                        <button
                          key={r.topicId}
                          onClick={() => router.push(`/learn/${r.topicId}`)}
                          style={{
                            textAlign: "left",
                            width: "100%",
                            background: CARD,
                            border: `1px solid ${LINE}`,
                            borderRadius: RADIUS,
                            padding: "12px 16px",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: SERIF,
                              fontSize: 14.5,
                              fontWeight: 700,
                              color: INK,
                            }}
                          >
                            {r.title}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: MUTED,
                              marginTop: 2,
                            }}
                          >
                            {r.law}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
