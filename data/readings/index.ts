import type { Reading } from "@/types";
import { normalizeReading } from "@/lib/readings";
import { baikaiKeiyakuReading } from "./gyoho/baikai-keiyaku";
import { coolingOffReading } from "./gyoho/cooling-off";
import { hachishuSeigenReading } from "./gyoho/hachishu-seigen";
import { hoshouKyoukaiReading } from "./gyoho/hoshou-kyoukai";
import { hoshuReading } from "./gyoho/hoshu";
import { juuyouJikouReading } from "./gyoho/juuyou-jikou";
import { menkyoReading } from "./gyoho/menkyo";
import { sanjunanaJouReading } from "./gyoho/sanjunana-jou";
import { takkenshiReading } from "./gyoho/takkenshi";

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
];

/**
 * アプリが参照する読み物。読み込み境界で verified 等を正規化する
 * (fail-closed。`lib/readings.ts` 参照)。`topicId` → `Reading` の Map。
 */
export const READINGS: Map<string, Reading> = new Map(
  RAW_READINGS.map(normalizeReading).map((r) => [r.topicId, r] as const),
);
