"use client";

/**
 * Service Worker(/sw.js)の登録だけを行う描画なしコンポーネント。
 * layout はサーバーコンポーネントのまま保つため、登録処理をここに分離する。
 * 開発中はキャッシュが挙動確認の邪魔になるので本番ビルドのみ登録する。
 */
import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録失敗(非対応・プライベートモード等)でもアプリ本体は動かす
    });
  }, []);
  return null;
}
