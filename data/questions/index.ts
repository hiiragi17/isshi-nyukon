import type { Question } from "@/types";
import { nijuuJouto } from "./kenri/nijuu-jouto";
import { sagiKyouhaku } from "./kenri/sagi-kyouhaku";
import { mukenDairi } from "./kenri/muken-dairi";
import { coolingOff } from "./gyoho/cooling-off";
import { hoshu } from "./gyoho/hoshu";
import { koukokuKisei } from "./gyoho/koukoku-kisei";
import { chintaiKoukoku } from "./gyoho/chintai-koukoku";
import { juuyouJikou } from "./gyoho/juuyou-jikou";
import { sanjunanaJou } from "./gyoho/sanjunana-jou";
import { baikaiKeiyaku } from "./gyoho/baikai-keiyaku";
import { menkyo } from "./gyoho/menkyo";
import { takkenshi } from "./gyoho/takkenshi";
import { hachishuSeigen } from "./gyoho/hachishu-seigen";
import { youtoChiiki } from "./horei/youto-chiiki";
import { kaihatsuKyoka } from "./horei/kaihatsu-kyoka";
import { kenpeiYoseki } from "./horei/kenpei-yoseki";
import { yosekiCalc } from "./horei/yoseki-calc";

/**
 * 全問題。既存の順序(q1〜q6)は履歴キーやスコアリングが配列インデックスに
 * 依存するため崩さない。新規問題は末尾に追記する(既存インデックスを動かさない)。
 */
export const QUESTIONS: Question[] = [
  nijuuJouto,
  sagiKyouhaku,
  mukenDairi,
  coolingOff,
  hoshu,
  koukokuKisei,
  youtoChiiki,
  kaihatsuKyoka,
  kenpeiYoseki,
  yosekiCalc,
  chintaiKoukoku,
  juuyouJikou,
  sanjunanaJou,
  baikaiKeiyaku,
  menkyo,
  takkenshi,
  hachishuSeigen,
];
