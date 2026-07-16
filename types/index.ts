/**
 * 一肢入魂 — 型定義
 *
 * 出発点: `reference/prototype/types-draft.ts`。
 * ただし calc / spot / terms は、正である
 * `reference/prototype/takken-zenshi-game.jsx` の QUESTIONS / TERMS の
 * 実データ構造に合わせて整備している(移植であって作り直しではない)。
 */

/** 試験の科目。プロトタイプの QUESTIONS が使う文字列に一致させる */
export type Category =
  | "権利関係(民法)"
  | "宅建業法"
  | "法令上の制限"
  | "税・その他";

/** 問題形式。エンジンが分岐する */
export type QuestionType =
  | "zenshi" // 全肢判定: 判定→箇所タップ→理由選択
  | "calc" // 計算: 報酬計算・建蔽率容積率・相続分
  | "spot"; // 間違い探し: 不動産広告の違反箇所タップ

export type Question = {
  id: string; // 例: "q1"
  category: Category;
  topic: string; // 例: "二重譲渡"
  law: string; // 例: "民法177条"
  /** 省略時は zenshi 扱い(プロトタイプの q1〜q4 は type を持たない) */
  type?: QuestionType;
  scenario?: string; // 事案文(省略可)
  /**
   * 一次ソース(e-Gov条文 or 公式過去問)で裏取り済みかどうかの記録。
   * 省略時は未検証として扱う(読み込み境界 `data/questions/index.ts` の
   * `normalizeQuestion` で false に正規化)。照合シート(`docs/verification/`)
   * と対応する精度の証跡で、現状は出題フィルタには使っていない。
   */
  verified?: boolean;
  lesson: string[]; // 30秒レッスン(3行程度)
  diagram?: Diagram; // 登場人物の関係図(省略可)
  choices?: Choice[]; // type 未指定(zenshi)のとき
  calc?: CalcSpec; // type="calc" のとき
  spot?: SpotSpec; // type="spot" のとき
};

/* ---------- zenshi: 全肢判定 ---------- */
export type Choice = {
  segments: string[]; // 誤り箇所タップ用に分割した文
  correct: boolean;
  wrongIndex?: number; // 誤り肢のみ: segments の何番目が誤りか
  reasons: Reason[]; // ○肢=正しい根拠 / ×肢=誤りの理由(3択)
  explanation: string;
};
export type Reason = { text: string; correct: boolean };

/* ---------- 関係図 ---------- */
export type DiagramNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
};
export type DiagramEdge = {
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
};
export type Diagram = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

/* ---------- calc: 計算エンジン ---------- */
/** 与件の整理表示(価格・取引態様・消費税課税の有無 など) */
export type CalcGiven = { label: string; value: string };
/** 汎用 calc の第二式が第一式の値(%)から結果を導く演算(容積率など) */
export type CalcDeriveOp = "mul" | "div" | "identity";
/** 途中式ビルダーの選択肢。correct 以外は「よくある計算ミス」を trap で説明 */
export type CalcBuildOption = {
  formula: string;
  value?: number; // 数式が確定値を出す段のみ
  kind?: string; // 消費税の扱いなど、値以外の分岐識別子
  /**
   * 汎用 calc の第二式で、第一式の値 p(%)から結果を導く演算。
   * mul: operand × p/100 / div: operand ÷ (p/100) / identity: p。
   * 誤った第一式を選んだときも、その値を反映した結果を表示するために使う。
   */
  op?: CalcDeriveOp;
  operand?: number; // op が mul / div のときの定数(容積率なら敷地面積)
  correct: boolean;
  trap: string; // 誤答肢の落とし穴の説明(正答肢は空文字)
};
export type CalcBuildStep = { label: string; options: CalcBuildOption[] };
/** 正答確定後に見せる模範の途中式 */
export type CalcCanonicalStep = { label: string; formula: string };
export type CalcSpec = {
  prompt: string; // 問い
  given: CalcGiven[]; // 与件の整理表示
  build: CalcBuildStep[]; // 途中式ビルダー(段ごとの選択)
  canonical: CalcCanonicalStep[]; // 解説用の模範途中式
  answer: number;
  unit: string; // "万円" など
};

/* ---------- spot: マイソク間違い探し ---------- */
/** 広告上のゾーン。violation=true は reason(違反根拠)、false は note(適法の理由) */
export type SpotZone = {
  id: string;
  violation: boolean;
  name: string;
  reason?: string; // 違反ゾーン
  note?: string; // 適法ゾーン
};
export type SpotSpec = {
  errorCount: number; // 「N箇所ある」と提示する数
  zones: SpotZone[];
};

/* ---------- 用語辞書 ---------- */
/** 配列+エイリアス方式・最長一致マッチ(既決事項) */
export type Term = {
  word: string;
  def: string;
  aliases?: string[];
  category?: Category;
};

/* ---------- 成績・習熟 ---------- */
export type Attempt = {
  questionId: string;
  choiceIndex: number; // 肢単位で記録
  pts: number;
  max: number; // ○肢=2 / ×肢=3 / calc=2 / spot=errorCount
  answeredAt: string; // ISO日時
};

export type MasteryState = "perfect" | "learning" | "untouched";
