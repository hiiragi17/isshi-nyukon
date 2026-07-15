/**
 * 画面共通のスタイルオブジェクト(プロトタイプの page / col / card と同値)。
 * 色・角丸は lib/tokens.ts を参照し、値をハードコードしない。
 */
import type { CSSProperties } from "react";
import { PAPER, INK, CARD, LINE, SANS, SERIF, AI_BLUE, RADIUS } from "./tokens";

/** ページ全体(紙色背景・中央寄せ・モバイル余白) */
export const page: CSSProperties = {
  minHeight: "100vh",
  background: PAPER,
  color: INK,
  fontFamily: SANS,
  display: "flex",
  justifyContent: "center",
  padding: "24px 16px 64px",
};

/** コンテンツ列(最大560px) */
export const col: CSSProperties = { width: "100%", maxWidth: 560 };

/** カード(1枚) */
export const card: CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  borderRadius: RADIUS,
  padding: "20px",
};

/**
 * 藍色アウトラインのボタン(共通ベース)。
 * 各所でサイズ・字間だけ上書きして使う(範囲選択導線・少量モードのチップ等)。
 */
export const outlineButton: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 700,
  color: AI_BLUE,
  background: CARD,
  border: `2px solid ${AI_BLUE}`,
  borderRadius: RADIUS,
  cursor: "pointer",
};
