import type { Reading } from "@/types";
import { normalizeReading } from "@/lib/readings";
import { baikaiKeiyakuReading } from "./gyoho/baikai-keiyaku";
import { coolingOffReading } from "./gyoho/cooling-off";
import { coolingOffHyoushikiReading } from "./gyoho/cooling-off-hyoushiki";
import { gyoushaMeiboReading } from "./gyoho/gyousha-meibo";
import { eigyouHoshoukinReading } from "./gyoho/eigyou-hoshoukin";
import { kyoutakushoSetsumeiReading } from "./gyoho/kyoutakusho-setsumei";
import { koukokuKiseiReading } from "./gyoho/koukoku-kisei";
import { koukokuKaishiReading } from "./gyoho/koukoku-kaishi";
import { chintaiKoukokuReading } from "./gyoho/chintai-koukoku";
import { hachishuSeigenReading } from "./gyoho/hachishu-seigen";
import { hachishuSonotaReading } from "./gyoho/hachishu-sonota";
import { hanshuuhouReading } from "./gyoho/hanshuuhou";
import { hoshouKyoukaiReading } from "./gyoho/hoshou-kyoukai";
import { hoshuReading } from "./gyoho/hoshu";
import { jimushoAnnaijoReading } from "./gyoho/jimusho-annaijo";
import { juugyoushaHyoushikiReading } from "./gyoho/juugyousha-hyoushiki";
import { juugyoushaMeiboReading } from "./gyoho/juugyousha-meibo";
import { juuyouJikouReading } from "./gyoho/juuyou-jikou";
import { kashiTanpoRikouReading } from "./gyoho/kashi-tanpo-rikou";
import { kanriKanrishaHoushikiReading } from "./gyoho/kanri-kanrisha-houshiki";
import { kantokuShobunReading } from "./gyoho/kantoku-shobun";
import { menkyoReading } from "./gyoho/menkyo";
import { menkyoTodokedeReading } from "./gyoho/menkyo-todokede";
import { menkyoYohiReading } from "./gyoho/menkyo-yohi";
import { sanjunanaJouReading } from "./gyoho/sanjunana-jou";
import { shoyuukenRyuuhoReading } from "./gyoho/shoyuuken-ryuuho";
import { takkenshiReading } from "./gyoho/takkenshi";
import { ishiHyoujiReading } from "./kenri/ishi-hyouji";
import { sagiKyouhakuReading } from "./kenri/sagi-kyouhaku";
import { kaihatsuKyokaReading } from "./horei/kaihatsu-kyoka";
import { kenchikuKakuninReading } from "./horei/kenchiku-kakunin";
import { kenpeiYosekiReading } from "./horei/kenpei-yoseki";
import { kokudoTodokedeReading } from "./horei/kokudo-todokede";
import { kukakuSeiriReading } from "./horei/kukaku-seiri";
import { moridoKiseiReading } from "./horei/morido-kisei";
import { nochiHouReading } from "./horei/nochi-hou";
import { shudanKiteiReading } from "./horei/shudan-kitei";
import { tantaiKiteiReading } from "./horei/tantai-kitei";
import { toshiKeikakuReading } from "./horei/toshi-keikaku";
import { youtoChiikiReading } from "./horei/youto-chiiki";
import { yosekiCalcReading } from "./horei/yoseki-calc";
import { chikaKojiReading } from "./zei/chika-koji";
import { fudousanShutokuzeiReading } from "./zei/fudousan-shutokuzei";
import { inshizeiReading } from "./zei/inshizei";
import { joutoShotokuReading } from "./zei/jouto-shotoku";
import { kanteiHyoukaReading } from "./zei/kantei-hyouka";
import { keihinHyoujihouReading } from "./zei/keihin-hyoujihou";
import { kikouReading } from "./zei/kikou";
import { koteiShisanzeiReading } from "./zei/kotei-shisanzei";
import { tatemonoReading } from "./zei/tatemono";
import { tochiReading } from "./zei/tochi";
import { tourokuMenkyozeiReading } from "./zei/touroku-menkyozei";
import { zoyozeiReading } from "./zei/zoyozei";

/** 全読み物(生データ)。新規論点は末尾に追記する */
const RAW_READINGS: Reading[] = [
  coolingOffReading,
  menkyoReading,
  takkenshiReading,
  hoshouKyoukaiReading,
  juuyouJikouReading,
  sanjunanaJouReading,
  hachishuSeigenReading,
  baikaiKeiyakuReading,
  hoshuReading,
  kantokuShobunReading,
  hanshuuhouReading,
  kaihatsuKyokaReading,
  kokudoTodokedeReading,
  moridoKiseiReading,
  nochiHouReading,
  youtoChiikiReading,
  kenpeiYosekiReading,
  yosekiCalcReading,
  toshiKeikakuReading,
  kenchikuKakuninReading,
  kukakuSeiriReading,
  shudanKiteiReading,
  tantaiKiteiReading,
  fudousanShutokuzeiReading,
  koteiShisanzeiReading,
  inshizeiReading,
  tourokuMenkyozeiReading,
  joutoShotokuReading,
  zoyozeiReading,
  chikaKojiReading,
  kanteiHyoukaReading,
  kikouReading,
  keihinHyoujihouReading,
  tochiReading,
  tatemonoReading,
  kanriKanrishaHoushikiReading,
  coolingOffHyoushikiReading,
  hachishuSonotaReading,
  shoyuukenRyuuhoReading,
  jimushoAnnaijoReading,
  kashiTanpoRikouReading,
  juugyoushaHyoushikiReading,
  juugyoushaMeiboReading,
  menkyoYohiReading,
  menkyoTodokedeReading,
  gyoushaMeiboReading,
  eigyouHoshoukinReading,
  kyoutakushoSetsumeiReading,
  koukokuKiseiReading,
  koukokuKaishiReading,
  chintaiKoukokuReading,
  sagiKyouhakuReading,
  ishiHyoujiReading,
];

/**
 * アプリが参照する読み物。読み込み境界で verified 等を正規化する
 * (fail-closed。`lib/readings.ts` 参照)。`topicId` → `Reading` の Map。
 */
export const READINGS: Map<string, Reading> = new Map(
  RAW_READINGS.map(normalizeReading).map((r) => [r.topicId, r] as const),
);
