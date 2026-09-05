import type { Reading } from "@/types";
import { normalizeReading } from "@/lib/readings";
import { baikaiKeiyakuReading } from "./gyoho/baikai-keiyaku";
import { coolingOffReading } from "./gyoho/cooling-off";
import { hachishuSeigenReading } from "./gyoho/hachishu-seigen";
import { hanshuuhouReading } from "./gyoho/hanshuuhou";
import { hoshouKyoukaiReading } from "./gyoho/hoshou-kyoukai";
import { hoshuReading } from "./gyoho/hoshu";
import { juuyouJikouReading } from "./gyoho/juuyou-jikou";
import { kantokuShobunReading } from "./gyoho/kantoku-shobun";
import { menkyoReading } from "./gyoho/menkyo";
import { sanjunanaJouReading } from "./gyoho/sanjunana-jou";
import { takkenshiReading } from "./gyoho/takkenshi";
import { kaihatsuKyokaReading } from "./horei/kaihatsu-kyoka";
import { kenpeiYosekiReading } from "./horei/kenpei-yoseki";
import { kokudoTodokedeReading } from "./horei/kokudo-todokede";
import { moridoKiseiReading } from "./horei/morido-kisei";
import { nochiHouReading } from "./horei/nochi-hou";
import { toshiKeikakuReading } from "./horei/toshi-keikaku";
import { youtoChiikiReading } from "./horei/youto-chiiki";
import { yosekiCalcReading } from "./horei/yoseki-calc";

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
];

/**
 * アプリが参照する読み物。読み込み境界で verified 等を正規化する
 * (fail-closed。`lib/readings.ts` 参照)。`topicId` → `Reading` の Map。
 */
export const READINGS: Map<string, Reading> = new Map(
  RAW_READINGS.map(normalizeReading).map((r) => [r.topicId, r] as const),
);
