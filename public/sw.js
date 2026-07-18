/**
 * 一肢入魂 — Service Worker(オフライン対応)
 *
 * 通勤中(圏外・地下)でも一度開いたアプリを遊べるようにする。
 * 成績(localStorage)には一切触れない。ここで扱うのは HTTP レスポンスの
 * キャッシュだけで、localStorage とは別領域。SW の更新・削除で成績は消えない。
 *
 * 方針(古いキャッシュを配り続けない):
 * - /_next/static/ … ファイル名にハッシュを含む不変アセット。キャッシュ優先
 * - ページ遷移(navigate)… ネットワーク優先。オフライン時だけキャッシュへ
 * - それ以外(RSC ペイロード等)… 介入しない(素通し)。オフライン時の
 *   クライアント遷移は Next 側がフルページ遷移にフォールバックするので、
 *   上の navigate 経路で拾える
 */

// キャッシュの世代。キャッシュの持ち方を変えるときに上げる
// (通常のデプロイでは上げなくてよい。HTMLはネットワーク優先で常に更新される)
const CACHE = "isshi-nyukon-sw-v1";

// インストール時に控えておくページ(全ルート)とアプリアイコン。
// ページ本体の JS/CSS は初回表示時に /_next/static/ 経路でキャッシュされる
const PRECACHE = [
  "/",
  "/play",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 一部が取れなくても SW 自体は有効化する(ベストエフォート)
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 旧世代のキャッシュを掃除してから制御を引き継ぐ
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** ハッシュ付き不変アセット: キャッシュ優先、初回だけネットワーク */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

/** ページ遷移: ネットワーク優先(常に最新)。オフライン時のみ控えを返す */
async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch {
    // クエリ違い(?theme= 等)でも同じページの控えを使えるよう search を無視する
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    // 最後の手段としてトップページを返す(アプリ内から復帰できるように)
    const home = await cache.match("/");
    if (home) return home;
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // それ以外は介入しない(ブラウザの通常処理に任せる)
});
