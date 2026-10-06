import type { Sheet } from "@/types";
import { horeiSuujiSheet } from "./horei-suuji";

/** 暗記シート(横断コラム)の一覧。追加したら `public/sw.js` の PRECACHE_PAGES にも足す */
export const SHEETS: Sheet[] = [horeiSuujiSheet];
