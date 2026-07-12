import type { Question } from "@/types";
import { nijuuJouto } from "./kenri/nijuu-jouto";
import { sagiKyouhaku } from "./kenri/sagi-kyouhaku";
import { mukenDairi } from "./kenri/muken-dairi";
import { coolingOff } from "./gyoho/cooling-off";
import { hoshu } from "./gyoho/hoshu";
import { koukokuKisei } from "./gyoho/koukoku-kisei";

/**
 * 全問題。順序はプロトタイプの QUESTIONS と一致させる
 * (q1〜q6。履歴キーやスコアリングが配列インデックスに依存するため崩さない)。
 */
export const QUESTIONS: Question[] = [
  nijuuJouto,
  sagiKyouhaku,
  mukenDairi,
  coolingOff,
  hoshu,
  koukokuKisei,
];
