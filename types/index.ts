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
  /**
   * 論点のグルーピングキー。同じ論点の「2周目」(別シナリオの2問目)は、
   * 1周目と同じ topicId を持たせる。省略時は自分の id が既定値になる
   * (読み込み境界 `data/questions/index.ts` の `normalizeQuestion` で正規化)。
   * ミニ模試の抽出・成長グラフの分母・検地帳マトリクスは、この値でユニークに数える。
   */
  topicId?: string;
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
  /**
   * 照合に使ったソースの強さ。`verified` が「裏取りしたか」を記録するのに対し、
   * こちらは「**何で**裏取りしたか」を記録する。省略時は `unverified` に
   * 正規化される(fail-closed)。
   */
  source?: SourceRef;
  /**
   * 照合に用いた法令の版と、試験の法令基準日との関係。省略時は
   * `driftChecked: "unchecked"` の既定値に正規化される(fail-closed)。
   */
  lawVersion?: LawVersion;
  lesson: string[]; // 30秒レッスン(3行程度)
  diagram?: Diagram; // 登場人物の関係図(省略可)
  choices?: Choice[]; // type 未指定(zenshi)のとき
  calc?: CalcSpec; // type="calc" のとき
  spot?: SpotSpec; // type="spot" のとき
};

/* ---------- 照合の証跡(source / lawVersion) ---------- */

/**
 * 照合に使ったソースの強さ。強い順に並べている。
 *
 * - `primary`     — 条文・告示・官公庁の公式発出文書の**原文**に当てた
 * - `mirrored`    — 原文を直接取得できず、独立した複数の公開法令DBの
 *                   文言一致で代用した(法令は著作権の対象外なので、
 *                   複数ソースの一致は原文の強い裏取りになる)
 * - `secondary`   — 解説サイト・用語集など二次資料のみ
 * - `unverified`  — 記録が無い。**省略時の既定値**
 *
 * 横断ルール F8: **数値そのものが答えになる肢を含む問題は `primary` を必須**とする。
 */
export type SourceLevel = "primary" | "mirrored" | "secondary" | "unverified";

export type SourceRef = {
  /**
   * 問題**全体**(肢・理由・解説に加えて lesson も含む)の中で、
   * **最も弱い**根拠の水準。「記録が無い / 弱い記録がある」を埋もれさせないため、
   * 混在する場合は弱い側に倒す。#125 の網羅状況はこの値で集計する。
   */
  level: SourceLevel;
  /**
   * **肢の正誤を決める根拠**の水準。lesson の補足だけが弱いケースで、
   * `level` を弱い側に倒すと答えの根拠の強さまで見えなくなるため分けて持つ。
   *
   * 横断ルール **F8(数値そのものが答えになる肢を含む問題は `primary` 必須)は
   * こちらで判定する**。省略時は `level` と同じとみなす。
   */
  answerLevel?: SourceLevel;
  /** 様式など、法令本体とは別にファイル単位で管理されるものの識別子 */
  fileId?: string;
  /** 補足(どの資料に当てたか。照合シートの該当節を指す短い記述) */
  note?: string;
};

/** 強い順の序列。比較に使う(大きいほど強い) */
export const SOURCE_LEVEL_RANK: Record<SourceLevel, number> = {
  primary: 3,
  mirrored: 2,
  secondary: 1,
  unverified: 0,
};

/**
 * `driftChecked` の値。
 *
 * 施行日が試験の法令基準日より前であることは「基準日**までに**効力を生じた」
 * ことしか示さず、「基準日**時点でも**その内容のまま」であることは示さない。
 * 両者を取り違えないよう、確認の状態を明示的に持つ。
 *
 * - `not_required` — 照合に使った版の施行日が基準日と**一致**しており、
 *                    差分が生じ得ない
 * - `checked`      — 基準日時点の版と突き合わせ、差分が無いことを確認した
 * - `analysed`     — 差分はあるが、本問に影響しないと判断した(理由を note に)
 * - `unchecked`    — 未確認。**省略時の既定値**
 */
export type DriftChecked = "not_required" | "checked" | "analysed" | "unchecked";

export type LawVersion = {
  /** 照合に用いた版(e-Gov の Law RevisionID など) */
  revisionId?: string;
  /** 照合に用いた版の施行日(YYYY-MM-DD) */
  verifiedAgainst?: string;
  /** その年度の試験の法令基準日(YYYY-MM-DD) */
  examBasisDate?: string;
  driftChecked?: DriftChecked;
  /** `analysed` の判断理由、未確認なら何を確認すべきか */
  note?: string;
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

/* ---------- 参考書モード: 論点ごとの読み物 ---------- */
/**
 * 条文原文の引用1行(号・イロハニホ単位)。CLAUDE.md の照合の書き方に合わせ、
 * `text` は条文文言そのまま(委任先を推測して書かない・省略は(略)で明示)を
 * 入れる。項・号ごとに分けて表示することで、長文の条文を読みやすくする
 * (壁のような1段落の引用は読みにくいというフィードバックへの対応)。
 */
export type ReadingQuoteLine = {
  label?: string; // 見出し(例: "1項", "一号", "ロ")
  text: string;
  indent?: boolean; // イ〜ホ等、号の下位区分は字下げして表示する
};

/** 条文原文の引用ブロック。`cite` は条番号(施行日を併記する場合はそこに含める) */
export type ReadingQuote = { lines: ReadingQuoteLine[]; cite: string };

/** 読み物1論点ぶんのセクション(見出し+段落+条文原文の引用は任意) */
export type ReadingSection = {
  heading: string;
  body: string[]; // 段落(termify で用語ポップアップ対応)
  quote?: ReadingQuote;
};

/**
 * 論点(`topicId`)単位の読み物。`lesson`(30秒レッスン・3行程度)が
 * 「解答に必要な最小限」なのに対し、こちらは分野を深掘りする読み物。
 * 精度担保の枠組みは `Question` と同じものを再利用する(fail-closed:
 * 未指定は読み込み境界 `data/readings/index.ts` の `normalizeReading` で
 * `verified: false` / `source: unverified` / `lawVersion.driftChecked: unchecked`
 * に正規化)。
 */
export type Reading = {
  topicId: string; // 対応する Question.topicId(または id)
  category: Category;
  title: string; // 論点名(見出し)
  law: string; // 根拠条文(表示用。例: "宅建業法37条の2・施行規則16条の5・16条の6")
  verified?: boolean;
  source?: SourceRef;
  lawVersion?: LawVersion;
  sections: ReadingSection[];
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
