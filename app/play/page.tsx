"use client";

/**
 * セッション画面(範囲選択 → 出題 → 判決)。
 * プロトタイプ takken-zenshi-game.jsx の App(start / play / result の3スクリーン)を
 * 移植したもの。出題本体は 3 エンジン(zenshi / calc / spot)に委譲する。
 *
 * 成績は StorageAdapter(lib/storage)経由で全件履歴に保存し、
 * マウント時に「肢ごとの最新結果」を復元する(弱点判定・成績表示に使用)。
 */
import { useEffect, useState } from "react";
import { QUESTIONS } from "@/data/questions";
import type { Question } from "@/types";
import { storage, latestByItem, itemKey } from "@/lib/storage";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, SANS } from "@/lib/tokens";
import { page, col, card } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { Stamp } from "@/components/Stamp";
import { TermPopup } from "@/components/TermPopup";
import { ZenshiEngine } from "@/components/engine/ZenshiEngine";
import { CalcEngine } from "@/components/engine/CalcEngine";
import { SpotEngine } from "@/components/engine/SpotEngine";

type Item = { qi: number; ci: number };
type Record = { qi: number; ci: number; pts: number; max: number };
type Hist = { pts: number; max: number };

const itemCountOf = (q: Question) =>
  q.type === "calc" || q.type === "spot" ? 1 : q.choices!.length;

const maxOf = (it: Item) => {
  const q = QUESTIONS[it.qi];
  if (q.type === "calc") return 2;
  if (q.type === "spot") return q.spot!.errorCount;
  return q.choices![it.ci].correct ? 2 : 3;
};

const allItems: Item[] = QUESTIONS.flatMap((q, i) =>
  Array.from({ length: itemCountOf(q) }, (_, j) => ({ qi: i, ci: j })),
);

export default function PlayPage() {
  const [screen, setScreen] = useState<"start" | "play" | "result">("start");
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(QUESTIONS.map((_, i) => i)),
  );
  const [sessionItems, setSessionItems] = useState<Item[]>([]);
  const [sessionSeq, setSessionSeq] = useState(0);
  const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<Record[]>([]);
  const [history, setHistory] = useState<{ [key: string]: Hist }>({});
  const [lessonOpen, setLessonOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  // 保存済みの全件履歴から「肢ごとの最新結果」を復元する
  useEffect(() => {
    let alive = true;
    storage.getAttempts().then((attempts) => {
      if (!alive) return;
      const latest = latestByItem(attempts);
      const h: { [key: string]: Hist } = {};
      QUESTIONS.forEach((q, qi) => {
        const n = itemCountOf(q);
        for (let ci = 0; ci < n; ci++) {
          const a = latest.get(itemKey(q.id, ci));
          if (a) h[`${qi}-${ci}`] = { pts: a.pts, max: a.max };
        }
      });
      setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  const item = sessionItems[idx];
  const qi = item?.qi ?? 0;
  const ci = item?.ci ?? 0;
  const q = QUESTIONS[qi];
  const isCalc = q?.type === "calc";
  const isSpot = q?.type === "spot";
  const isZenshi = !isCalc && !isSpot;

  const score = records.reduce((s, r) => s + r.pts, 0);
  const sessionMax = sessionItems.reduce((s, it) => s + maxOf(it), 0);

  const weakItems = allItems.filter((it) => {
    const h = history[`${it.qi}-${it.ci}`];
    return h && h.pts < h.max;
  });

  const topicStats = (i: number) => {
    const qq = QUESTIONS[i];
    const n = itemCountOf(qq);
    const items = Array.from({ length: n }, (_, j) => history[`${i}-${j}`]);
    const tried = items.filter(Boolean) as Hist[];
    if (tried.length === 0) return null;
    return {
      pts: tried.reduce((s, h) => s + h.pts, 0),
      max: Array.from({ length: n }, (_, j) => maxOf({ qi: i, ci: j })).reduce(
        (s, m) => s + m,
        0,
      ),
      perfect: items.filter((h) => h && h.pts === h.max).length,
      total: n,
    };
  };

  const openTerm = (w: string) => setActiveTerm((cur) => (cur === w ? null : w));

  // item を1件解き終えたときの記録(セッション成績 + 全件履歴への保存)
  const recordItem = (qi: number, ci: number, pts: number, max: number) => {
    setRecords((r) => [...r, { qi, ci, pts, max }]);
    setHistory((h) => ({ ...h, [`${qi}-${ci}`]: { pts, max } }));
    void storage.saveAttempt({
      questionId: QUESTIONS[qi].id,
      choiceIndex: ci,
      pts,
      max,
      answeredAt: new Date().toISOString(),
    });
  };

  const startSession = (items: Item[]) => {
    setSessionItems(items);
    setSessionSeq((n) => n + 1);
    setIdx(0);
    setRecords([]);
    setLessonOpen(false);
    setActiveTerm(null);
    setScreen("play");
  };

  const startNormal = () => {
    const items = allItems.filter((it) => selected.has(it.qi));
    if (items.length) startSession(items);
  };

  const startWeak = () => {
    if (weakItems.length) startSession(weakItems);
  };

  const startSessionMisses = () => {
    const misses = records
      .filter((r) => r.pts < r.max)
      .map((r) => ({ qi: r.qi, ci: r.ci }));
    if (misses.length) startSession(misses);
  };

  const next = () => {
    setActiveTerm(null);
    if (idx + 1 < sessionItems.length) {
      if (sessionItems[idx + 1].qi !== qi) setLessonOpen(false);
      setIdx(idx + 1);
    } else {
      setScreen("result");
    }
  };

  const toTop = () => {
    setScreen("start");
    setLessonOpen(false);
    setActiveTerm(null);
  };

  const toggleTopic = (i: number) => {
    setSelected((s) => {
      const nextSet = new Set(s);
      if (nextSet.has(i)) nextSet.delete(i);
      else nextSet.add(i);
      return nextSet;
    });
  };

  /* ================= START ================= */
  if (screen === "start") {
    const totalItems = [...selected].reduce(
      (s, i) => s + itemCountOf(QUESTIONS[i]),
      0,
    );
    return (
      <div style={page}>
        <div style={col}>
          <div style={{ textAlign: "center", margin: "40px 0 32px" }}>
            <Eyebrow>宅建・権利関係(民法)</Eyebrow>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 44,
                fontWeight: 800,
                margin: "12px 0 8px",
                letterSpacing: 6,
              }}
            >
              一肢入魂
            </h1>
            <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 2, letterSpacing: 0.3 }}>
              4択を当てるゲームではない。
              <br />
              全部の肢に、理由をつけて決着をつけるゲーム。
            </p>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <Eyebrow>遊び方</Eyebrow>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 12px" }}>
              三段で決着をつける
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
              <li>
                肢(選択肢の文)を1つずつ読み、<b>正しい / 誤り</b> を判定する{" "}
                <span style={{ color: SHU }}>… 1点</span>
              </li>
              <li>
                「誤り」なら、文中の<b>誤っている箇所</b>をタップし{" "}
                <span style={{ color: SHU }}>… 1点</span>、<b>なぜ誤りか</b>を選ぶ{" "}
                <span style={{ color: SHU }}>… 1点</span>
              </li>
              <li>
                「正しい」なら、<b>なぜ正しいと言えるのか根拠</b>を選ぶ{" "}
                <span style={{ color: SHU }}>… 1点</span>
              </li>
            </ol>
            <p
              style={{
                fontSize: 13,
                color: MUTED,
                margin: "14px 0 0",
                paddingTop: 12,
                borderTop: `1px solid ${LINE}`,
                lineHeight: 1.9,
              }}
            >
              勘で当たっても、根拠と理由が答えられなければ点は伸びません。本試験の「個数問題」対策と同じ頭の使い方です。
            </p>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <Eyebrow>出題範囲</Eyebrow>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 4px" }}>
              審理する論点を選ぶ
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.8 }}>
              タップで選択 / 解除。挑戦済みの分野には成績が表示されます。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...new Set(QUESTIONS.map((qq) => qq.category))].map((cat) => (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 11,
                      letterSpacing: 2,
                      color: MUTED,
                      marginTop: 6,
                    }}
                  >
                    {cat}
                  </div>
                  {QUESTIONS.map((qq, i) => {
                    if (qq.category !== cat) return null;
                    const on = selected.has(i);
                    const st = topicStats(i);
                    return (
                      <button
                        key={qq.id}
                        onClick={() => toggleTopic(i)}
                        aria-pressed={on}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: 10,
                          cursor: "pointer",
                          background: on ? "rgba(51,85,126,0.07)" : CARD,
                          border: `2px solid ${on ? AI_BLUE : LINE}`,
                          fontFamily: SANS,
                          color: INK,
                          opacity: on ? 1 : 0.75,
                          transition: "border-color .15s, background .15s, opacity .15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              border: `2px solid ${on ? AI_BLUE : "#B9BEB6"}`,
                              background: on ? AI_BLUE : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background .15s, border-color .15s",
                            }}
                          >
                            {on && (
                              <svg viewBox="0 0 12 12" width="12" height="12">
                                <path
                                  d="M2 6.5 L5 9.2 L10 2.8"
                                  fill="none"
                                  stroke={CARD}
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, display: "block" }}>
                              {qq.topic}
                            </span>
                            <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>
                              {qq.law}
                            </span>
                          </span>
                          {st ? (
                            <span
                              style={{
                                fontFamily: SERIF,
                                fontSize: 13,
                                fontWeight: 700,
                                color:
                                  st.perfect === st.total
                                    ? GREEN
                                    : st.pts >= st.max * 0.6
                                      ? INK
                                      : SHU,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.pts}/{st.max}点・完璧 {st.perfect}/{st.total}肢
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
                              未挑戦
                            </span>
                          )}
                        </div>
                        {st && (
                          <div
                            style={{ height: 4, background: LINE, borderRadius: 2, marginTop: 10 }}
                          >
                            <div
                              style={{
                                height: 4,
                                width: `${Math.round((st.pts / st.max) * 100)}%`,
                                background: st.perfect === st.total ? GREEN : SHU,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <span style={{ color: MUTED }}>
                知識ゼロでも大丈夫。
                <span style={{ borderBottom: `2px dotted ${AI_BLUE}`, color: INK }}>
                  点線のついた法律用語
                </span>
                はタップすると意味が表示されます。ルールを先に予習したいときは、各問の「30秒レッスン」をどうぞ。
              </span>
            </div>
          </div>

          <button
            onClick={startNormal}
            disabled={selected.size === 0}
            style={{
              width: "100%",
              padding: "16px 0",
              fontSize: 17,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 5,
              color: CARD,
              background: selected.size === 0 ? MUTED : INK,
              border: "none",
              borderRadius: 10,
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            開廷する{selected.size > 0 && `(${totalItems}肢)`}
          </button>

          {weakItems.length > 0 && (
            <button
              onClick={startWeak}
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 700,
                marginTop: 10,
                fontFamily: SERIF,
                letterSpacing: 3,
                color: SHU,
                background: CARD,
                border: `2px solid ${SHU}`,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              弱点だけ復習する({weakItems.length}肢)
            </button>
          )}
          <p style={{ fontSize: 11.5, color: MUTED, textAlign: "center", marginTop: 14 }}>
            ※ 成績はこの端末(ブラウザ)に保存されます
          </p>
        </div>
      </div>
    );
  }

  /* ================= RESULT ================= */
  if (screen === "result") {
    const pct = sessionMax > 0 ? Math.round((score / sessionMax) * 100) : 0;
    const passed = pct >= 70;
    const misses = records.filter((r) => r.pts < r.max);
    const topicsInSession = [...new Set(records.map((r) => r.qi))];
    return (
      <div style={page}>
        <div style={col}>
          <div style={{ textAlign: "center", margin: "36px 0 20px" }}>
            <Eyebrow>判決</Eyebrow>
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 16px" }}>
              <Stamp text={passed ? "合格" : "追試"} color={passed ? SHU : AI_BLUE} />
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 800, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 12.5, color: MUTED, marginTop: 6 }}>
              {sessionMax}点満点中({pct}%)
            </div>
            <p style={{ color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 1.8 }}>
              本試験の合格ラインもおおむね7割。
              {passed ? "この調子です。" : "落とした肢を潰していきましょう。"}
            </p>
          </div>

          <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
            {topicsInSession.map((i, n) => {
              const rs = records.filter((r) => r.qi === i);
              const pts = rs.reduce((s, r) => s + r.pts, 0);
              const max = rs.reduce((s, r) => s + r.max, 0);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "12px 0",
                    borderBottom:
                      n < topicsInSession.length - 1 ? `1px solid ${LINE}` : "none",
                    fontSize: 14.5,
                  }}
                >
                  <div>
                    <b>{QUESTIONS[i].topic}</b>
                    <span style={{ color: MUTED, marginLeft: 8, fontSize: 11.5 }}>
                      {QUESTIONS[i].law}({rs.length}肢)
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: SERIF,
                      fontWeight: 700,
                      fontSize: 15,
                      fontVariantNumeric: "tabular-nums",
                      color: pts === max ? GREEN : pts >= max * 0.6 ? INK : SHU,
                    }}
                  >
                    {pts} / {max}
                  </div>
                </div>
              );
            })}
          </div>

          {misses.length > 0 && (
            <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${SHU}` }}>
              <Eyebrow>要再審理</Eyebrow>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 8px" }}>
                取りこぼした肢({misses.length}肢)
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 13,
                  lineHeight: 1.9,
                  color: MUTED,
                }}
              >
                {misses.map((r, i) => (
                  <li key={i}>
                    <span style={{ color: INK }}>
                      {QUESTIONS[r.qi].topic} —{" "}
                      {QUESTIONS[r.qi].type === "calc"
                        ? "計算"
                        : QUESTIONS[r.qi].type === "spot"
                          ? "広告"
                          : `肢${r.ci + 1}`}
                    </span>
                    <span style={{ fontFamily: SERIF, marginLeft: 8, color: SHU }}>
                      {r.pts}/{r.max}点
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {misses.length > 0 && (
            <button
              onClick={startSessionMisses}
              style={{
                width: "100%",
                padding: "15px 0",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: SERIF,
                letterSpacing: 4,
                color: CARD,
                background: SHU,
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              落とした{misses.length}肢だけ、すぐ再戦
            </button>
          )}
          <button
            onClick={toTop}
            style={{
              width: "100%",
              padding: "15px 0",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 3,
              color: misses.length > 0 ? INK : CARD,
              background: misses.length > 0 ? CARD : INK,
              border: misses.length > 0 ? `2px solid ${INK}` : "none",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            出題範囲を選び直す
          </button>
        </div>
      </div>
    );
  }

  /* ================= PLAY ================= */
  const nextLabel =
    idx + 1 < sessionItems.length
      ? sessionItems[idx + 1].qi === qi
        ? "次の肢へ"
        : "次の問題へ"
      : "判決を聞く";
  const engineKey = `${sessionSeq}-${idx}`;

  return (
    <div style={page}>
      <div style={col}>
        {/* 進捗 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div style={{ fontFamily: SERIF, fontSize: 15 }}>
            <b>第{idx + 1}肢</b>
            <span style={{ color: MUTED }}> / 全{sessionItems.length}肢</span>
            <span style={{ margin: "0 8px", color: LINE }}>|</span>
            <span style={{ fontSize: 13 }}>
              {q.topic}・{isCalc ? "計算" : isSpot ? "広告" : `肢${ci + 1}`}
            </span>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15 }}>
            <span style={{ color: MUTED, fontSize: 12 }}>通算 </span>
            <b>
              {score}
              <span style={{ fontSize: 12, color: MUTED }}>/{sessionMax}点</span>
            </b>
          </div>
        </div>
        <div style={{ height: 4, background: LINE, borderRadius: 2, marginBottom: 24 }}>
          <div
            style={{
              height: 4,
              width: `${sessionItems.length ? (idx / sessionItems.length) * 100 : 0}%`,
              background: SHU,
              borderRadius: 2,
              transition: "width .3s",
            }}
          />
        </div>

        {isZenshi && (
          <ZenshiEngine
            key={engineKey}
            question={q}
            ci={ci}
            onTerm={openTerm}
            lessonOpen={lessonOpen}
            onToggleLesson={() => setLessonOpen((v) => !v)}
            onComplete={(r) => recordItem(qi, ci, r.pts, r.max)}
            nextLabel={nextLabel}
            onNext={next}
          />
        )}
        {isCalc && (
          <CalcEngine
            key={engineKey}
            question={q}
            onTerm={openTerm}
            lessonOpen={lessonOpen}
            onToggleLesson={() => setLessonOpen((v) => !v)}
            onComplete={(r) => recordItem(qi, ci, r.pts, r.max)}
            nextLabel={nextLabel}
            onNext={next}
          />
        )}
        {isSpot && (
          <SpotEngine
            key={engineKey}
            question={q}
            onTerm={openTerm}
            lessonOpen={lessonOpen}
            onToggleLesson={() => setLessonOpen((v) => !v)}
            onComplete={(r) => recordItem(qi, ci, r.pts, r.max)}
            nextLabel={nextLabel}
            onNext={next}
          />
        )}

        <TermPopup term={activeTerm} onClose={() => setActiveTerm(null)} />
      </div>
    </div>
  );
}
