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
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/data/questions";
import { storage, latestByItem, itemKey } from "@/lib/storage";
import { itemCountOf } from "@/lib/items";
import { maxOf } from "@/lib/scoring";
import { topicProgress, summarizeProgress } from "@/lib/progress";
import {
  buildQuickSession,
  shuffleInPlace,
  type QuickState,
} from "@/lib/quickPick";
import { INK, CARD, AI_BLUE, SHU, GREEN, MUTED, LINE, SERIF, SANS, RADIUS } from "@/lib/tokens";
import { page, col, card, outlineButton } from "@/lib/gameStyles";
import { Eyebrow } from "@/components/Eyebrow";
import { TermPopup } from "@/components/TermPopup";
import { ResultScreen, type ItemRecord } from "@/components/ResultScreen";
import { ZenshiEngine } from "@/components/engine/ZenshiEngine";
import { CalcEngine } from "@/components/engine/CalcEngine";
import { SpotEngine } from "@/components/engine/SpotEngine";

type Item = { qi: number; ci: number };
type Hist = { pts: number; max: number };

const allItems: Item[] = QUESTIONS.flatMap((q, i) =>
  Array.from({ length: itemCountOf(q) }, (_, j) => ({ qi: i, ci: j })),
);

/** questionId → QUESTIONS の添字。ダッシュボードから渡る itemKey の解決に使う */
const idToIndex = new Map(QUESTIONS.map((q, i) => [q.id, i] as const));

/** 表示順を保った分野(カテゴリ)一覧 */
const CATEGORIES = [...new Set(QUESTIONS.map((q) => q.category))];

/** 分野 → その分野に属する論点の添字。全選択/全解除トグルで使う(レンダリング毎の再計算を避ける) */
const CATEGORY_INDICES = new Map<string, number[]>(
  CATEGORIES.map((cat) => [
    cat,
    QUESTIONS.reduce<number[]>((acc, q, i) => {
      if (q.category === cat) acc.push(i);
      return acc;
    }, []),
  ]),
);

/**
 * ダッシュボードから ?items= で渡される itemKey 列(`${questionId}-${ci}`)を
 * セッションの Item[] に解決する。未知の id / 範囲外の ci は捨てる。
 */
const parseItemKeys = (raw: string): Item[] => {
  const items: Item[] = [];
  for (const key of raw.split(",")) {
    const cut = key.lastIndexOf("-");
    if (cut < 0) continue;
    const qi = idToIndex.get(key.slice(0, cut));
    const ci = Number(key.slice(cut + 1));
    if (qi === undefined || !Number.isInteger(ci)) continue;
    if (ci < 0 || ci >= itemCountOf(QUESTIONS[qi])) continue;
    items.push({ qi, ci });
  }
  return items;
};

/**
 * 論点(問題 qi)の全肢が「最新で満点」か。未着手(記録ゼロ)は false。
 * get は肢ごとの最新結果を返す(履歴 state 由来 / 全件履歴由来のどちらでもよい)。
 */
const isAllPerfect = (
  qi: number,
  get: (qi: number, ci: number) => Hist | undefined,
): boolean => topicProgress(QUESTIONS[qi], (ci) => get(qi, ci)).level === 2;

export default function PlayPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<"start" | "play" | "result">("start");
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(QUESTIONS.map((_, i) => i)),
  );
  const [sessionItems, setSessionItems] = useState<Item[]>([]);
  const [sessionSeq, setSessionSeq] = useState(0);
  const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<ItemRecord[]>([]);
  const [history, setHistory] = useState<{ [key: string]: Hist }>({});
  const [lessonOpen, setLessonOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  // セッション開始時点で「完璧」だった論点。判決後に新規完璧到達を検出するのに使う
  const [perfectAtStart, setPerfectAtStart] = useState<Set<number>>(new Set());

  // 保存済みの全件履歴から「肢ごとの最新結果」を復元する
  useEffect(() => {
    let alive = true;
    storage
      .getAttempts()
      .then((attempts) => {
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
      })
      .catch((e) => console.error("[storage] getAttempts に失敗しました", e));
    return () => {
      alive = false;
    };
  }, []);

  // ダッシュボードから ?items= で来たら、その肢だけでセッションを自動開始する。
  // 判決後の新規完璧判定のため、開始時点の完璧論点を全件履歴から取り込む。
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("items");
    if (!raw) return;
    const items = parseItemKeys(raw);
    if (!items.length) return;
    // 履歴の成否にかかわらずセッションは開始する。
    // 履歴が読めた場合のみ perfectAtStart を埋め、失敗時は空集合で始める
    // (ダッシュボードも同じストレージ失敗で空履歴に縮退するため挙動を揃える)。
    const begin = (perfect: Set<number>) => {
      setPerfectAtStart(perfect);
      setSessionItems(items);
      setSessionSeq((n) => n + 1);
      setIdx(0);
      setRecords([]);
      setLessonOpen(false);
      setActiveTerm(null);
      setScreen("play");
    };
    storage
      .getAttempts()
      .then((attempts) => {
        const latest = latestByItem(attempts);
        const getLatest = (qi: number, ci: number): Hist | undefined => {
          const a = latest.get(itemKey(QUESTIONS[qi].id, ci));
          return a ? { pts: a.pts, max: a.max } : undefined;
        };
        const perfect = new Set<number>();
        QUESTIONS.forEach((_, qi) => {
          if (isAllPerfect(qi, getLatest)) perfect.add(qi);
        });
        begin(perfect);
      })
      .catch((e) => {
        console.error("[storage] getAttempts に失敗しました", e);
        begin(new Set());
      });
    // マウント時に一度だけ。参照する QUESTIONS / 関数はモジュール定数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = sessionItems[idx];
  const qi = item?.qi ?? 0;
  const ci = item?.ci ?? 0;
  const q = QUESTIONS[qi];
  const isCalc = q?.type === "calc";
  const isSpot = q?.type === "spot";
  const isZenshi = !isCalc && !isSpot;

  const score = records.reduce((s, r) => s + r.pts, 0);
  const sessionMax = sessionItems.reduce(
    (s, it) => s + maxOf(QUESTIONS[it.qi], it.ci),
    0,
  );

  const weakItems = allItems.filter((it) => {
    const h = history[`${it.qi}-${it.ci}`];
    return h && h.pts < h.max;
  });

  /** 論点1件の習熟統計(集計本体は lib/progress)。history=肢ごとの最新結果から導く */
  const topicStats = (i: number) =>
    topicProgress(QUESTIONS[i], (ci) => history[`${i}-${ci}`]);

  const openTerm = (w: string) => setActiveTerm((cur) => (cur === w ? null : w));

  // item を1件解き終えたときの記録(セッション成績 + 全件履歴への保存)
  const recordItem = (qi: number, ci: number, pts: number, max: number) => {
    setRecords((r) => [...r, { qi, ci, pts, max }]);
    setHistory((h) => ({ ...h, [`${qi}-${ci}`]: { pts, max } }));
    storage
      .saveAttempt({
        questionId: QUESTIONS[qi].id,
        choiceIndex: ci,
        pts,
        max,
        answeredAt: new Date().toISOString(),
      })
      .catch((e) => console.error("[storage] saveAttempt に失敗しました", e));
  };

  const startSession = (items: Item[]) => {
    // 開始時点で完璧だった論点を控える(判決後に新規完璧到達を見分けるため)
    const getHist = (qi: number, ci: number) => history[`${qi}-${ci}`];
    const perfect = new Set<number>();
    QUESTIONS.forEach((_, qi) => {
      if (isAllPerfect(qi, getHist)) perfect.add(qi);
    });
    setPerfectAtStart(perfect);
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

  /**
   * 少量モード: 選択中の範囲から n 肢だけ出題する。
   * 並び順(弱点 → 未着手 → その他)の組み立ては lib/quickPick に切り出し、
   * ここでは選択範囲の絞り込みと肢の分類だけを渡す。
   */
  const startQuick = (n: number) => {
    const pool = allItems.filter((it) => selected.has(it.qi));
    const classify = (it: Item): QuickState => {
      const h = history[`${it.qi}-${it.ci}`];
      if (!h) return "untried";
      return h.pts < h.max ? "weak" : "other";
    };
    const ordered = buildQuickSession(pool, classify, n, shuffleInPlace);
    if (ordered.length) startSession(ordered);
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

  // 全論点の一括選択 / 解除
  const selectAll = () => setSelected(new Set(QUESTIONS.map((_, i) => i)));
  const clearAll = () => setSelected(new Set());

  // 分野ごとの一括トグル: その分野が全選択済みなら全解除、そうでなければ全選択
  const toggleCategory = (cat: string) => {
    setSelected((s) => {
      const idx = CATEGORY_INDICES.get(cat) ?? [];
      const allOn = idx.every((i) => s.has(i));
      const nextSet = new Set(s);
      idx.forEach((i) => (allOn ? nextSet.delete(i) : nextSet.add(i)));
      return nextSet;
    });
  };

  /* ================= START ================= */
  if (screen === "start") {
    const totalItems = [...selected].reduce(
      (s, i) => s + itemCountOf(QUESTIONS[i]),
      0,
    );
    const allSelected = selected.size === QUESTIONS.length;
    // 進捗サマリ: 全論点の統計を1回だけ計算し、全体・分野の集計に使い回す
    const allStats = QUESTIONS.map((_, i) => topicStats(i));
    const overall = summarizeProgress(allStats);
    return (
      <div style={page}>
        <div style={col}>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "6px 0",
              marginTop: 8,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: SERIF,
              letterSpacing: 2,
              color: AI_BLUE,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← 検地帳
          </button>
          <div style={{ textAlign: "center", margin: "24px 0 32px" }}>
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
            <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 10px", lineHeight: 1.8 }}>
              タップで選択 / 解除。挑戦済みの分野には成績が表示されます。
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                padding: "10px 12px",
                marginBottom: 12,
                background: "rgba(51,85,126,0.07)",
                borderRadius: RADIUS,
              }}
            >
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  letterSpacing: 2,
                  color: MUTED,
                  whiteSpace: "nowrap",
                }}
              >
                全体の進捗
              </span>
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    overall.perfectTopics === overall.topics ? GREEN : INK,
                }}
              >
                完璧 {overall.perfectTopics}/{overall.topics}論点・獲得{" "}
                {overall.pts}/{overall.max}点
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontFamily: SANS, fontSize: 12, color: MUTED }}>
                {selected.size}/{QUESTIONS.length} 論点を選択中
              </span>
              <button
                type="button"
                onClick={allSelected ? clearAll : selectAll}
                aria-pressed={allSelected}
                style={{
                  ...outlineButton,
                  minHeight: 44,
                  padding: "10px 16px",
                  fontSize: 13,
                  letterSpacing: 1.5,
                }}
              >
                {allSelected ? "全解除" : "全選択"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const catIndices = CATEGORY_INDICES.get(cat) ?? [];
                const catAllOn = catIndices.every((i) => selected.has(i));
                const catSummary = summarizeProgress(
                  catIndices.map((i) => allStats[i]),
                );
                return (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: SANS,
                          fontSize: 11,
                          letterSpacing: 2,
                          color: MUTED,
                        }}
                      >
                        {cat}
                      </span>
                      <span
                        style={{
                          fontFamily: SANS,
                          fontSize: 11,
                          color:
                            catSummary.perfectTopics === catSummary.topics
                              ? GREEN
                              : MUTED,
                        }}
                      >
                        完璧 {catSummary.perfectTopics}/{catSummary.topics}
                        論点・{catSummary.pts}/{catSummary.max}点
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      aria-pressed={catAllOn}
                      style={{
                        fontFamily: SANS,
                        fontSize: 11,
                        letterSpacing: 1,
                        fontWeight: 700,
                        color: AI_BLUE,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "10px 4px",
                        minHeight: 44,
                      }}
                    >
                      {catAllOn ? "この分野を全解除" : "この分野を全選択"}
                    </button>
                  </div>
                  {QUESTIONS.map((qq, i) => {
                    if (qq.category !== cat) return null;
                    const on = selected.has(i);
                    const st = allStats[i];
                    return (
                      <button
                        key={qq.id}
                        onClick={() => toggleTopic(i)}
                        aria-pressed={on}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: RADIUS,
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
                          {st.tried > 0 ? (
                            <span
                              style={{
                                fontFamily: SERIF,
                                fontSize: 13,
                                fontWeight: 700,
                                color:
                                  st.perfect === st.n
                                    ? GREEN
                                    : st.pts >= st.max * 0.6
                                      ? INK
                                      : SHU,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.pts}/{st.max}点・完璧 {st.perfect}/{st.n}肢
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>
                              未挑戦
                            </span>
                          )}
                        </div>
                        {st.tried > 0 && (
                          <div
                            style={{ height: 4, background: LINE, borderRadius: 2, marginTop: 10 }}
                          >
                            <div
                              style={{
                                height: 4,
                                width: `${Math.round((st.pts / st.max) * 100)}%`,
                                background: st.perfect === st.n ? GREEN : SHU,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                );
              })}
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

          {totalItems >= 5 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <Eyebrow>少量で始める</Eyebrow>
              <div
                style={{
                  fontFamily: SERIF,
                  fontWeight: 700,
                  fontSize: 15,
                  margin: "4px 0 4px",
                }}
              >
                通勤のスキマに、数肢だけ
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: MUTED,
                  margin: "0 0 12px",
                  lineHeight: 1.8,
                }}
              >
                選択中の範囲から、弱点・未着手を優先して出題します。
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 20]
                  .filter((s) => s <= totalItems)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => startQuick(s)}
                      style={{
                        ...outlineButton,
                        flex: 1,
                        minHeight: 44,
                        padding: "12px 0",
                        fontSize: 15,
                        letterSpacing: 2,
                      }}
                    >
                      {s}肢
                    </button>
                  ))}
              </div>
            </div>
          )}

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
              borderRadius: RADIUS,
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            開廷する{selected.size > 0 && `(全${totalItems}肢)`}
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
                borderRadius: RADIUS,
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
    // このセッションで新たに完璧到達した論点(検地帳で朱印を押させる)
    const getHist = (qi: number, ci: number) => history[`${qi}-${ci}`];
    const newlyPerfectIds = [...new Set(records.map((r) => r.qi))]
      .filter((i) => !perfectAtStart.has(i) && isAllPerfect(i, getHist))
      .map((i) => QUESTIONS[i].id);
    return (
      <ResultScreen
        records={records}
        score={score}
        sessionMax={sessionMax}
        newlyPerfectIds={newlyPerfectIds}
        onRetryMisses={startSessionMisses}
        onToTop={toTop}
      />
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
