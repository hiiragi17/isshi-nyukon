"use client";

/**
 * トップページ = 検地帳ダッシュボード(T6)。
 * reference/design/dashboard-final.html の 2a「検地帳×集印」を移植したもの。
 *
 * 構成:
 *  - 本日の召喚状 : lib/srs の buildSummonQueue(全件履歴から SRS キュー)で駆動。
 *    「開廷する」で、その肢だけを /play?items=... に渡してセッションを自動開始する。
 *  - 検地帳マトリクス : 分野(カテゴリ)×論点(問題)を 6 列固定で一望する。
 *    セルの色は論点の習熟(完璧=朱 / 学習中=藍 / 未着手=白)。
 *  - 集印カウンタ : 完璧に到達した論点の数 / 全論点。
 *  - 選択セル詳細 : 実データ(正答肢数・最終審理日・弱点肢数)を表示し、再審理を始める。
 *  - 朱印スタンプ演出 : 完璧論点の詳細で「完」印を押す。直前のセッションで新たに
 *    完璧到達した論点(/play から ?stamped= で受け取る)はマトリクス上でも印が押される。
 *
 * データは StorageAdapter(lib/storage)経由の全件履歴のみで駆動する(モックなし)。
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/data/questions";
import type { Attempt } from "@/types";
import { storage, latestByItem, itemKey } from "@/lib/storage";
import { itemCountOf } from "@/lib/items";
import { topicProgress, type TopicProgress } from "@/lib/progress";
import { buildSummonQueue, type SrsItemState } from "@/lib/srs";
import { byCategoryPriority } from "@/lib/categories";
import {
  INK,
  CARD,
  AI_BLUE,
  SHU,
  MUTED,
  LINE,
  SERIF,
  SANS,
  RADIUS,
  INK_SUB,
  INK_DOTTED,
  DUE_URGENT,
} from "@/lib/tokens";
import { page, col, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { GrowthChart } from "@/components/GrowthChart";
import { BackupPanel } from "@/components/BackupPanel";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

/** SRS キューの対象 = 全問題の全肢 */
const ALL_TARGETS = QUESTIONS.flatMap((q) =>
  Array.from({ length: itemCountOf(q) }, (_, ci) => ({
    questionId: q.id,
    choiceIndex: ci,
  })),
);

/** questionId → QUESTIONS の添字 */
const ID_TO_INDEX = new Map(QUESTIONS.map((q, i) => [q.id, i] as const));

/** カテゴリ(分野)の優先度順。マトリクスの行順に使う(QUESTIONS の添字順とは独立) */
const FIELDS = [...new Set(QUESTIONS.map((q) => q.category))]
  .sort(byCategoryPriority)
  .map((name) => ({
  name,
  questions: QUESTIONS.map((q, qi) => ({ q, qi })).filter(
    (x) => x.q.category === name,
  ),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

/** 宅建試験(10月第3日曜)までの残日数。過ぎていれば翌年ぶんを見る */
function daysUntilExam(now: Date): number {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirdSunOfOct = (year: number) => {
    const oct1 = new Date(year, 9, 1);
    const firstSun = 1 + ((7 - oct1.getDay()) % 7);
    return new Date(year, 9, firstSun + 14);
  };
  let exam = thirdSunOfOct(now.getFullYear());
  if (exam.getTime() < startOfDay.getTime())
    exam = thirdSunOfOct(now.getFullYear() + 1);
  return Math.round((exam.getTime() - startOfDay.getTime()) / DAY_MS);
}

/** ISO 日時から「本日 / 1日前 / N日前」の相対表記を作る */
function agoLabel(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "本日";
  if (days === 1) return "1日前";
  return `${days}日前`;
}

export default function Home() {
  const router = useRouter();
  // null = 未ロード(SSR / 初回)。ロード後に配列が入る(時刻依存の表示はロード後だけ)
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [stampedIds, setStampedIds] = useState<Set<string>>(new Set());

  // 全件履歴をロード
  useEffect(() => {
    let alive = true;
    storage
      .getAttempts()
      .then((a) => {
        if (alive) setAttempts(a);
      })
      .catch((e) => {
        console.error("[storage] getAttempts に失敗しました", e);
        if (alive) setAttempts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 控えからの復元後に全件履歴を読み直して画面へ反映する
  const reloadAttempts = () => {
    storage
      .getAttempts()
      .then(setAttempts)
      .catch((e) => {
        console.error("[storage] getAttempts に失敗しました", e);
      });
  };

  // 直前のセッションで新たに完璧到達した論点(/play → ?stamped=)を受け取り、印を押す
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("stamped");
    if (!raw) return;
    setStampedIds(new Set(raw.split(",").filter(Boolean)));
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const now = useMemo(() => new Date(), []);
  const latest = useMemo(
    () => latestByItem(attempts ?? []),
    [attempts],
  );

  /** 論点(問題)1件の習熟統計を実データから導く(集計本体は lib/progress) */
  const topicStat = (qi: number): TopicProgress =>
    topicProgress(QUESTIONS[qi], (ci) =>
      latest.get(itemKey(QUESTIONS[qi].id, ci)),
    );

  /** 論点の再審理で出題する肢(itemKey)。弱点優先 → 未着手 → 全肢 */
  const topicSessionKeys = (qi: number): string[] => {
    const q = QUESTIONS[qi];
    const n = itemCountOf(q);
    const st = topicStat(qi);
    const pick: number[] = [];
    for (let ci = 0; ci < n; ci++) {
      const a = latest.get(itemKey(q.id, ci));
      const isWeak = a ? a.pts < a.max : false;
      const isUntried = !a;
      if (st.level === 1 && st.weak > 0) {
        if (isWeak) pick.push(ci);
      } else if (st.level === 1) {
        if (isUntried) pick.push(ci);
      } else {
        pick.push(ci); // 未着手・完璧はすべて
      }
    }
    return pick.map((ci) => itemKey(q.id, ci));
  };

  const goPlay = (keys: string[]) => {
    if (keys.length) router.push(`/play?items=${keys.join(",")}`);
  };

  /* ---------- 本日の召喚状(SRS キュー) ---------- */
  const queue = useMemo(
    () => buildSummonQueue(ALL_TARGETS, attempts ?? [], now),
    [attempts, now],
  );
  // 本日やるべき肢 = later(まだ期限前の完璧)以外。無ければ全キューにフォールバック
  const summonList = useMemo(() => {
    const actionable = queue.filter((s) => s.bucket !== "later");
    return actionable.length ? actionable : queue;
  }, [queue]);
  const summonKeys = summonList.map((s) => itemKey(s.questionId, s.choiceIndex));
  // 論点ごとにまとめる(キュー順=切迫順を保つ)
  const summonGroups = useMemo(() => {
    const seen = new Map<string, { head: SrsItemState; count: number }>();
    const order: string[] = [];
    for (const s of summonList) {
      const g = seen.get(s.questionId);
      if (g) g.count++;
      else {
        seen.set(s.questionId, { head: s, count: 1 });
        order.push(s.questionId);
      }
    }
    return order.map((qid) => ({ qid, ...seen.get(qid)! }));
  }, [summonList]);

  const dueLabel = (s: SrsItemState): { text: string; color: string } => {
    if (s.bucket === "weak") return { text: "要復習", color: DUE_URGENT };
    if (s.bucket === "due") return { text: "本日中", color: DUE_URGENT };
    if (s.bucket === "new") return { text: "未着手", color: INK_SUB };
    const days = s.dueAt
      ? Math.max(0, Math.ceil((new Date(s.dueAt).getTime() - now.getTime()) / DAY_MS))
      : 0;
    return { text: `あと${days}日`, color: INK_SUB };
  };

  /* ---------- 集印カウンタ ---------- */
  const sealCount = QUESTIONS.reduce(
    (n, _, qi) => n + (topicStat(qi).level === 2 ? 1 : 0),
    0,
  );

  const loaded = attempts !== null;

  return (
    <div style={page}>
      <div style={col}>
        {/* ブランド */}
        <div style={{ textAlign: "center", margin: "24px 0 20px" }}>
          <Eyebrow>宅建・全肢一問一答</Eyebrow>
          <h1
            style={{
              fontFamily: SERIF,
              fontSize: 38,
              fontWeight: 800,
              margin: "10px 0 6px",
              letterSpacing: 6,
            }}
          >
            一肢入魂
          </h1>
          <p style={{ color: MUTED, fontSize: 12.5, margin: 0, lineHeight: 1.9 }}>
            全部の肢に、理由をつけて決着をつける。
          </p>
        </div>

        {/* 成績ヘッダー(集印・試験まで) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            成績
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 12,
              color: MUTED,
              alignItems: "baseline",
            }}
          >
            <span>
              集印{" "}
              <b style={{ fontFamily: SERIF, color: SHU, fontSize: 15 }}>
                {loaded ? sealCount : "—"}
              </b>
              /{QUESTIONS.length}
            </span>
            <span>
              試験まで{" "}
              <b style={{ fontFamily: SERIF, color: SHU, fontSize: 15 }}>
                {daysUntilExam(now)}
              </b>{" "}
              日
            </span>
          </div>
        </div>

        {!loaded ? (
          <div
            style={{
              color: MUTED,
              fontSize: 13,
              textAlign: "center",
              padding: "40px 0",
            }}
          >
            成績を読み込んでいます…
          </div>
        ) : (
          <>
            {/* 本日の召喚状 */}
            {summonGroups.length > 0 && (
              <div
                style={{
                  background: INK,
                  color: CARD,
                  borderRadius: RADIUS,
                  padding: "16px 18px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div
                    style={{ fontSize: 11, letterSpacing: 2.5, color: INK_SUB }}
                  >
                    本日の召喚状
                  </div>
                  <div style={{ fontSize: 11, color: INK_SUB }}>
                    忘却期限の近い順
                  </div>
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 11.5,
                    color: INK_SUB,
                    lineHeight: 1.8,
                  }}
                >
                  前回失点した肢・忘れかけの肢・未着手の肢から、今日やるべき順に選んでいます。
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {summonGroups.slice(0, 3).map((g) => {
                    const qi = ID_TO_INDEX.get(g.qid)!;
                    const label = dueLabel(g.head);
                    return (
                      <div
                        key={g.qid}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 8,
                          borderBottom: `1px dotted ${INK_DOTTED}`,
                          paddingBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: SERIF,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          {QUESTIONS[qi].topic} — {g.count}肢
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: label.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => goPlay(summonKeys)}
                  style={{
                    width: "100%",
                    minHeight: 48,
                    marginTop: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: SERIF,
                    letterSpacing: 4,
                    color: INK,
                    background: CARD,
                    border: "none",
                    borderRadius: RADIUS,
                    cursor: "pointer",
                  }}
                >
                  開廷する — {summonKeys.length}肢
                </button>
              </div>
            )}

            {/* 範囲を選んで始める(分野・論点選択 / 少量モードの入口) */}
            <button
              onClick={() => router.push("/play")}
              style={{
                ...outlineButton,
                width: "100%",
                minHeight: 48,
                marginBottom: 12,
                fontSize: 14,
                letterSpacing: 3,
              }}
            >
              範囲を選んで始める(少量モードも)
            </button>

            {/* 検地帳マトリクス(6列) */}
            <div
              style={{
                background: CARD,
                border: `1px solid ${LINE}`,
                borderRadius: RADIUS,
                padding: "16px 18px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED }}
                >
                  検地帳 — 分野×論点
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 10.5,
                    color: MUTED,
                    alignItems: "center",
                  }}
                >
                  <LegendDot shape="circle" color={SHU} label="完璧" />
                  <LegendDot shape="square" color={AI_BLUE} label="学習中" />
                  <LegendDot
                    shape="square"
                    color={CARD}
                    border={LINE}
                    label="未着手"
                  />
                </div>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {FIELDS.map((fd) => {
                  const stats = fd.questions.map((x) => topicStat(x.qi));
                  const done = stats.filter((s) => s.level === 2).length;
                  const learning = stats.filter((s) => s.level === 1).length;
                  return (
                    <div key={fd.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: SERIF,
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          {fd.name}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED }}>
                          朱 {done} · 藍 {learning} / {fd.questions.length}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6,1fr)",
                          gap: 6,
                        }}
                      >
                        {fd.questions.map(({ q, qi }) => {
                          const st = topicStat(qi);
                          const isSel = sel === q.id;
                          const stamped = stampedIds.has(q.id);
                          const bg =
                            st.level === 2
                              ? SHU
                              : st.level === 1
                                ? AI_BLUE
                                : CARD;
                          return (
                            <button
                              key={q.id}
                              title={q.topic}
                              aria-label={`${q.topic}(${
                                st.level === 2
                                  ? "完璧"
                                  : st.level === 1
                                    ? "学習中"
                                    : "未着手"
                              })`}
                              onClick={() =>
                                setSel((cur) => (cur === q.id ? null : q.id))
                              }
                              style={{
                                aspectRatio: "1",
                                minWidth: 0,
                                width: "100%",
                                borderRadius: st.level === 2 ? "50%" : 3,
                                background: bg,
                                border: isSel
                                  ? `2px solid ${INK}`
                                  : st.level === 0
                                    ? `1px solid ${LINE}`
                                    : "1px solid transparent",
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {stamped ? (
                                <span
                                  className="stamp-in"
                                  style={{
                                    fontFamily: SERIF,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: CARD,
                                    transform: "rotate(-12deg)",
                                  }}
                                >
                                  完
                                </span>
                              ) : isSel ? (
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: st.level === 0 ? MUTED : CARD,
                                  }}
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 選択セル詳細 */}
            {sel !== null &&
              (() => {
                const qi = ID_TO_INDEX.get(sel)!;
                const q = QUESTIONS[qi];
                const st = topicStat(qi);
                const ago = agoLabel(st.lastAt, now);
                let detail: string;
                let action: string;
                if (st.level === 0) {
                  detail = "未着手 — まだ一度も審理していません。";
                  action = `初審理する(${st.n}肢)`;
                } else if (st.level === 2) {
                  detail = `完璧 — 全${st.n}肢を最新で正解。最終審理 ${ago}。`;
                  action = `確認審理する(${st.n}肢)`;
                } else {
                  detail = `学習中 — 完璧 ${st.perfect}/${st.n}肢・最終審理 ${ago}。`;
                  action =
                    st.weak > 0
                      ? `弱点 ${st.weak}肢を再審理`
                      : `残り ${st.untried}肢を審理`;
                }
                return (
                  <div
                    className="fade-up"
                    style={{
                      background: INK,
                      color: CARD,
                      borderRadius: RADIUS,
                      padding: "14px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            letterSpacing: 2.5,
                            color: INK_SUB,
                          }}
                        >
                          {q.category} · {q.law}
                        </div>
                        <div
                          style={{
                            fontFamily: SERIF,
                            fontSize: 16,
                            fontWeight: 800,
                            marginTop: 2,
                          }}
                        >
                          {q.topic}
                        </div>
                        <div
                          style={{ fontSize: 12, color: INK_SUB, marginTop: 4 }}
                        >
                          {detail}
                        </div>
                      </div>
                      {st.level === 2 && (
                        <div
                          key={sel}
                          className="stamp-in"
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            border: `2.5px solid ${SHU}`,
                            color: SHU,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: SERIF,
                            fontWeight: 800,
                            fontSize: 16,
                            transform: "rotate(-12deg)",
                            background: "rgba(251,250,247,0.92)",
                          }}
                        >
                          完
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => goPlay(topicSessionKeys(qi))}
                      style={{
                        width: "100%",
                        minHeight: 44,
                        marginTop: 10,
                        fontSize: 13.5,
                        fontWeight: 700,
                        fontFamily: SERIF,
                        letterSpacing: 3,
                        color: CARD,
                        background: SHU,
                        border: "none",
                        borderRadius: RADIUS,
                        cursor: "pointer",
                      }}
                    >
                      {action}
                    </button>
                  </div>
                );
              })()}

            {/* 成長グラフ(集印の歩み) — 全件履歴で駆動 */}
            <GrowthChart attempts={attempts ?? []} questions={QUESTIONS} />

            <p
              style={{
                fontSize: 11.5,
                color: MUTED,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              ※ 成績はこの端末(ブラウザ)に保存されます
            </p>

            {/* 記録の控え(書き出し・復元) — 端末依存のデータ消失に備える */}
            <BackupPanel attempts={attempts ?? []} onImported={reloadAttempts} />
          </>
        )}

        {/* 免責(非公式・個人利用の明示) */}
        <DisclaimerFooter />
      </div>
    </div>
  );
}

/** マトリクス凡例の見本(完璧=丸 / 学習中・未着手=角) */
function LegendDot({
  shape,
  color,
  border,
  label,
}: {
  shape: "circle" | "square";
  color: string;
  border?: string;
  label: string;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: SANS }}>
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          borderRadius: shape === "circle" ? "50%" : 2,
          background: color,
          border: border ? `1px solid ${border}` : undefined,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
