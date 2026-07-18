import type { MetadataRoute } from "next";
import { PAPER } from "@/lib/tokens";

/**
 * PWA マニフェスト(Next.js の Metadata Route)。
 * ホーム画面に追加すると standalone(ブラウザUIなし)で起動する。
 *
 * インストール後も配信元オリジンは変わらないため、localStorage の成績
 * (isshi-nyukon:attempts:v1)は Android / デスクトップではブラウザと共有される。
 * iOS のみホーム画面アプリが別ストレージになるので、既存成績の引き継ぎは
 * 控え(BackupPanel の書き出し / 復元)で行う。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "一肢入魂",
    short_name: "一肢入魂",
    description: "宅建学習ゲーム。全部の肢に、理由をつけて決着をつける。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAPER,
    theme_color: PAPER,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
