import type { Sheet } from "@/types";
import { horeiSuujiSheet } from "./horei-suuji";
import { kenriAnkiSheet } from "./kenri-anki";

/** 暗記シート(横断コラム)の一覧。追加したら `public/sw.js` の PRECACHE_PAGES に `/learn/sheets/<id>` も足す */
export const SHEETS: Sheet[] = [horeiSuujiSheet, kenriAnkiSheet];
