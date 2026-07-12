/**
 * 画面共通のスタイルオブジェクト(プロトタイプの page / col / card と同値)。
 * 色・角丸は lib/tokens.ts を参照し、値をハードコードしない。
 */
import type { CSSProperties } from "react";
import { PAPER, INK, CARD, LINE, SANS, RADIUS } from "./tokens";

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
