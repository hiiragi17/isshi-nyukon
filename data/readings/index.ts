import type { Reading } from "@/types";
import { normalizeReading } from "@/lib/readings";
import { coolingOffReading } from "./gyoho/cooling-off";
import { menkyoReading } from "./gyoho/menkyo";

/** 全読み物(生データ)。新規論点は末尾に追記する */
const RAW_READINGS: Reading[] = [coolingOffReading, menkyoReading];

/**
 * アプリが参照する読み物。読み込み境界で verified 等を正規化する
 * (fail-closed。`lib/readings.ts` 参照)。`topicId` → `Reading` の Map。
 */
export const READINGS: Map<string, Reading> = new Map(
  RAW_READINGS.map(normalizeReading).map((r) => [r.topicId, r] as const),
);
