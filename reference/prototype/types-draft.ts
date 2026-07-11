/**
 * ============================================================
 * 一肢入魂 — 設計コンテキスト(Claude Design 読み込み用)
 * ============================================================
 * 宅建(宅地建物取引士試験)学習ゲームの設計情報。
 * 実装済みプロトタイプは takken-zenshi-game.jsx を参照。
 * このファイルは「これから作る画面」のデータ構造と画面仕様を定義する。
 *
 * ■ プロダクトの核
 * - 4択を当てるゲームではなく「全部の肢に理由をつけて決着をつける」ゲーム
 * - 判定(○×) → 誤り箇所タップ → 理由選択 の3段階スコアリング
 * - 利用者: 通勤中にスマホで遊ぶ社会人。1セッション5〜10分
 *
 * ■ 画面一覧
 * [実装済み]
 *   1. 出題範囲選択(カテゴリ別トピックカード・習熟度バー・弱点復習ボタン)
 *   2. プレイ画面(事案+関係図 / 30秒レッスン / 肢カード+朱印スタンプ / 用語辞書)
 *   3. 判決画面(合格・追試スタンプ / 分野別スコア / 取りこぼし肢一覧)
 * [未実装 — Claude Design で探索したい画面]
 *   4. 報酬計算エンジン画面(type: "calc")     ← 最優先
 *   5. マイソク間違い探し画面(type: "spot")
 *   6. 成績ダッシュボード(弱点・間隔反復の起点)
 */

/* ============================================================
 * 1. コアスキーマ
 * ============================================================ */

/** 試験の4科目 */
export type Category = "権利関係" | "宅建業法" | "法令上の制限" | "税・その他";

/** 問題形式。エンジンが分岐する */
export type QuestionType =
  | "zenshi" // 全肢判定(実装済み): 判定→箇所タップ→理由選択
  | "calc"   // 計算(未実装): 報酬計算・建蔽率容積率・相続分
  | "spot";  // 間違い探し(未実装): 不動産広告の違反箇所タップ

export type Question = {
  id: string;              // 例: "gyoho-hoshu-001"
  category: Category;
  topic: string;           // 例: "報酬額の制限"
  law: string;             // 例: "宅建業法46条"
  type: QuestionType;
  scenario?: string;       // 事案文(省略可)
  lesson: string[];        // 30秒レッスン(3行程度)
  diagram?: Diagram;       // 登場人物の関係図(省略可)
  choices?: Choice[];      // type="zenshi" のとき
  calc?: CalcSpec;         // type="calc" のとき
  spot?: SpotSpec;         // type="spot" のとき
};

/* ---------- zenshi: 全肢判定(実装済み・参考) ---------- */
export type Choice = {
  segments: string[];      // 誤り箇所タップ用に分割した文
  correct: boolean;
  wrongIndex?: number;     // 誤り肢のみ: segments の何番目が誤りか
  reasons: Reason[];       // ○肢=正しい根拠 / ×肢=誤りの理由(3択)
  explanation: string;
};
export type Reason = { text: string; correct: boolean };

export type Diagram = {
  nodes: { id: string; x: number; y: number; label: string; sub: string }[];
  edges: { from: string; to: string; label: string; dashed?: boolean }[];
};

/* ============================================================
 * 2. calc: 計算エンジン(画面4の対象)
 * ============================================================
 * ■ 画面要件
 * - 与件(given)がカード上部に整理されて見える(価格・取引態様・消費税課税の有無)
 * - 解答UIは数値入力 or 選択式。スマホで打ちやすいこと(テンキー的UIも検討可)
 * - 正解後、steps が途中式としてステップ表示される領域が必要
 * - distractors は「よくある計算ミスの値」。選択式にする場合の誤答肢に流用
 * - 既存の「肢カード + 朱印スタンプ」のデザイン文法から逸脱しないこと
 *
 * ■ 代表例: 売買価格3,000万円・媒介・課税業者の報酬上限
 *   速算式: 3,000万 × 3% + 6万 = 96万 → ×1.1 = 105.6万円
 */
export type CalcSpec = {
  prompt: string;                              // 問い(例: "Aが受領できる報酬の上限額は?")
  given: { label: string; value: string }[];   // 与件の整理表示
  answer: number;
  unit: string;                                // "円" "㎡" など
  tolerance?: number;                          // 許容誤差
  steps: { label: string; formula: string }[]; // 解説用の途中式
  distractors: number[];                       // よくある誤答(消費税掛け忘れ等)
};

/* ============================================================
 * 3. spot: マイソク間違い探し(画面5の対象)
 * ============================================================
 * ■ 画面要件
 * - 不動産広告(マイソク)を模したカードを表示し、広告規制違反の箇所をタップで探す
 * - 広告部分は「本物っぽさ」重視: 物件写真枠・間取り図・徒歩分数・価格・取引態様
 * - 発見済み/未発見のカウンタ表示(例: 2/4)
 * - タップ正解箇所には朱の付箋 or マーカーが付く演出
 * - デザイン課題: 広告の「それっぽさ」とゲームUIの和風世界観の共存。
 *   案ごとに解き方を変えて複数案ほしい
 *
 * ■ 違反例: 徒歩分数の切り捨て(80m=1分・端数切上げが正)、
 *   取引態様の記載漏れ、「完全」「日本一」等の禁止用語、価格の二重表示
 */
export type SpotSpec = {
  layout: AdElement[];                         // HTML/CSSで組む広告の要素ツリー
  errors: { elementId: string; reason: string; law: string }[];
  errorCount: number;                          // 「N箇所ある」と提示する数
};
export type AdElement = {
  id: string;
  kind: "photo" | "floorplan" | "price" | "access" | "spec" | "copy" | "dealType";
  content: string;
  style?: Record<string, string>;
};

/* ============================================================
 * 4. 成績・習熟(画面6の対象)
 * ============================================================
 * ■ 画面要件(成績ダッシュボード)
 * - 分野×論点のマトリクスで習熟度が一望できる
 * - 朱(完璧) / 藍(学習中) / 白(未着手) の3状態で塗り分け
 * - 「今日やるべき肢」(弱点 + 復習期限切れ)が上部に提示される
 * - 間隔反復: 満点なら間隔2倍、落としたら間隔リセット(SM-2簡易版)
 */
export type Attempt = {
  questionId: string;
  choiceIndex: number;     // 肢単位で記録
  pts: number;
  max: number;             // ○肢=2 / ×肢=3
  answeredAt: string;      // ISO日時
};

export type MasteryState = "perfect" | "learning" | "untouched";

/* ============================================================
 * 5. デザイントークン(jsxと同一。参照用)
 * ============================================================ */
export const TOKENS = {
  paper: "#ECEEE9",   // 背景(紙)
  card: "#FBFAF7",    // カード
  ink: "#26333B",     // テキスト(墨)
  aiBlue: "#33557E",  // インタラクティブ(藍)
  shu: "#BF3B33",     // 判定・強調(朱)
  green: "#3D7A55",   // 正解
  muted: "#7C857F",
  line: "#D8DAD2",
  radius: 10,
  serif: "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif",
  sans: "'Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif",
  // モチーフ: 朱印スタンプ(回転しながら押される)、「開廷」「判決」の司法用語、
  // 法律用語の青点線下線 → タップで画面下に用語辞書ポップアップ
  // 制約: モバイルファースト(max 560px)、タップ領域44px以上、Webフォント不使用
} as const;
