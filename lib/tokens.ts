/**
 * デザイントークン(プロトタイプと同一)
 *
 * `reference/prototype/takken-zenshi-game.jsx` の定数と値を一致させる。
 * 色・フォント・角丸などはここを参照し、値をハードコードしない。
 * CSS変数版は `app/globals.css` の `:root` にミラーしている(同じ値)。
 */

/** 色 */
export const INK = "#26333B"; // 墨(テキスト)
export const PAPER = "#ECEEE9"; // 紙(背景)
export const CARD = "#FBFAF7"; // カード
export const AI_BLUE = "#33557E"; // 藍(操作・インタラクティブ)
export const SHU = "#BF3B33"; // 朱(判定・強調)
export const GREEN = "#3D7A55"; // 緑(正解)
export const MUTED = "#7C857F"; // muted
export const LINE = "#D8DAD2"; // 罫線

/** フォント */
export const SERIF =
  "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif"; // 見出し: 明朝
export const SANS =
  "'Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif"; // 本文: ゴシック

/** 角丸 */
export const RADIUS = 10;

/** まとめて参照する用のオブジェクト */
export const TOKENS = {
  color: {
    ink: INK,
    paper: PAPER,
    card: CARD,
    aiBlue: AI_BLUE,
    shu: SHU,
    green: GREEN,
    muted: MUTED,
    line: LINE,
  },
  font: {
    serif: SERIF,
    sans: SANS,
  },
  radius: RADIUS,
} as const;
