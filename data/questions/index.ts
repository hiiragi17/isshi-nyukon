import type { Question } from "@/types";
import { normalizeQuestion } from "@/lib/questions";
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
import { ishiHyouji } from "./kenri/ishi-hyouji";
import { shakuchiShakka } from "./kenri/shakuchi-shakka";
import { teitouken } from "./kenri/teitouken";
import { bukkenHendo } from "./kenri/bukken-hendo";
import { souzokuTouki } from "./kenri/souzoku-touki";
import { souzokubun } from "./kenri/souzokubun";
import { nochiHou } from "./horei/nochi-hou";
import { kokudoTodokede } from "./horei/kokudo-todokede";
import { moridoKisei } from "./horei/morido-kisei";
import { youtoChiiki } from "./horei/youto-chiiki";
import { kaihatsuKyoka } from "./horei/kaihatsu-kyoka";
import { kenpeiYoseki } from "./horei/kenpei-yoseki";
import { yosekiCalc } from "./horei/yoseki-calc";
import { fudousanShutokuzei } from "./zei/fudousan-shutokuzei";
import { koteiShisanzei } from "./zei/kotei-shisanzei";
import { inshizei } from "./zei/inshizei";
import { chikaKoji } from "./zei/chika-koji";
import { eigyouHoshoukin } from "./gyoho/eigyou-hoshoukin";
import { hoshouKyoukai } from "./gyoho/hoshou-kyoukai";
import { jimushoAnnaijo } from "./gyoho/jimusho-annaijo";
import { kantokuShobun } from "./gyoho/kantoku-shobun";
import { kashiTanpoRikou } from "./gyoho/kashi-tanpo-rikou";
import { hachishuSonota } from "./gyoho/hachishu-sonota";
import { kyoutakushoSetsumei } from "./gyoho/kyoutakusho-setsumei";
import { juugyoushaHyoushiki } from "./gyoho/juugyousha-hyoushiki";
import { seigenKoui } from "./kenri/seigen-koui";
import { keiyakuFutekigou } from "./kenri/keiyaku-futekigou";
import { saimuFurikou } from "./kenri/saimu-furikou";
import { hoshouRentai } from "./kenri/hoshou-rentai";
import { chintaishaku } from "./kenri/chintaishaku";
import { shoumetsuJikou } from "./kenri/shoumetsu-jikou";
import { kyouyuu } from "./kenri/kyouyuu";
import { fudousanTouki } from "./kenri/fudousan-touki";

/**
 * 全問題(生データ)。既存の順序(q1〜q6)は履歴キーやスコアリングが配列
 * インデックスに依存するため崩さない。新規問題は末尾に追記する
 * (既存インデックスを動かさない)。
 */
const RAW_QUESTIONS: Question[] = [
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
  ishiHyouji,
  shakuchiShakka,
  teitouken,
  bukkenHendo,
  souzokuTouki,
  souzokubun,
  nochiHou,
  kokudoTodokede,
  moridoKisei,
  fudousanShutokuzei,
  koteiShisanzei,
  inshizei,
  chikaKoji,
  eigyouHoshoukin,
  hoshouKyoukai,
  jimushoAnnaijo,
  kantokuShobun,
  kashiTanpoRikou,
  hachishuSonota,
  kyoutakushoSetsumei,
  juugyoushaHyoushiki,
  seigenKoui,
  keiyakuFutekigou,
  saimuFurikou,
  hoshouRentai,
  chintaishaku,
  shoumetsuJikou,
  kyouyuu,
  fudousanTouki,
];

/**
 * アプリが参照する問題。読み込み境界で verified を正規化し、未指定は
 * false(未検証=本番非表示)に倒す(fail-closed)。配列の順序は保つ。
 */
export const QUESTIONS: Question[] = RAW_QUESTIONS.map(normalizeQuestion);
