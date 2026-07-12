/**
 * 一肢入魂 — calc(途中式ビルダー)の判定ロジック
 *
 * CalcEngine から表示・採点ロジックを切り出した純粋関数。
 * calc には2系統ある:
 *  - 税 calc(報酬計算): 第一式が値を出し、第二式が消費税で変換する。
 *    第二式の options が `kind`("taxAll" 等)を持つことで識別する。
 *    → 既存の報酬問題(q5)の挙動・文言・得点を一字も変えない。
 *  - 汎用 calc(容積率など): 第一式・第二式とも自己完結した式を選ぶ。
 *    第二式の value を最終結果として示す(単位は calc.unit)。
 *
 * 得点はどちらも「第一式1点 + 第二式1点 = 最大2点」。
 */
import type { CalcSpec } from "@/types";

/** 第二式が消費税変換(kind 付き)の税 calc かどうか */
export function isTaxCalc(calc: CalcSpec): boolean {
  return calc.build[1].options.some((o) => o.kind !== undefined);
}

/** 小数は必要なときだけ1桁で表示(プロトタイプの calcFmt と同一) */
export function calcFmt(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r % 1 ? r.toFixed(1) : String(r);
}

export type CalcVerdict = {
  /** 得点(0〜2) */
  pts: number;
  /** 第一式が正解か */
  fOk: boolean;
  /** 第二式が正解か */
  tOk: boolean;
  /** 「あなたの組み立てた式」1行目 */
  line1: string;
  /** 同2行目(= 結果) */
  line2: string;
  /** 判定メッセージ */
  message: string;
};

/**
 * 第一式 fIdx・第二式 tIdx を選んだときの得点・表示行・判定文を返す。
 * 税 calc は従来どおりの計算・文言(単位は calc.unit=万円 で従来と同一)。
 */
export function evaluateCalc(
  calc: CalcSpec,
  fIdx: number,
  tIdx: number,
): CalcVerdict {
  const f = calc.build[0].options[fIdx];
  const t = calc.build[1].options[tIdx];
  const fOk = f.correct;
  const tOk = t.correct;
  const pts = (fOk ? 1 : 0) + (tOk ? 1 : 0);

  if (isTaxCalc(calc)) {
    // 税 calc(報酬): 第一式の値を第二式(消費税)で変換する。
    const base = f.value!;
    const line1 = `${f.formula} = ${calcFmt(base)}${calc.unit}`;
    let line2: string;
    if (t.kind === "taxAll") {
      line2 = `${calcFmt(base)}${calc.unit} × 1.10 = ${calcFmt(base * 1.1)}${calc.unit}`;
    } else if (t.kind === "taxNone") {
      line2 = `消費税なし → ${calcFmt(base)}${calc.unit}`;
    } else {
      line2 = `(${calcFmt(base)}${calc.unit} − 6万円) × 1.10 + 6万円 = ${calcFmt((base - 6) * 1.1 + 6)}${calc.unit}`;
    }
    const message =
      pts === 2
        ? "式も税も正解。決着。"
        : pts === 0
          ? "式も税も誤り。"
          : !fOk
            ? "税は正解。速算式が誤り。"
            : "式は正解。消費税の扱いが誤り。";
    return { pts, fOk, tOk, line1, line2, message };
  }

  // 汎用 calc: 選んだ式をそのまま並べ、第二式の value を答えとして示す。
  const line1 = f.formula;
  const line2 = `${t.formula} = ${calcFmt(t.value ?? 0)}${calc.unit}`;
  const message =
    pts === 2
      ? "第一式・第二式ともに正解。決着。"
      : pts === 0
        ? "第一式・第二式ともに誤り。"
        : !fOk
          ? "第二式は正解。第一式が誤り。"
          : "第一式は正解。第二式が誤り。";
  return { pts, fOk, tOk, line1, line2, message };
}
