/**
 * 一肢入魂 — お気に入り(論点)
 *
 * 「あとで出せる」ためのしおり。単位は topicId(検地帳マトリクスの1マスと同じ
 * 論点グループ)。頻出論点の2周目(同じ topicId の別バリアント)は、
 * 検地帳と同じくまとめて1件のお気に入りとして扱う。
 *
 * 永続化は StorageAdapter(lib/storage の getFavorites / saveFavorites)経由。
 * ここは DOM に依存しない純粋な集合操作だけを担う。
 */

/** 指定した topicId のお気に入りを反転させた新しい配列を返す(重複を作らない) */
export function toggleFavorite(topicIds: string[], topicId: string): string[] {
  const set = new Set(topicIds);
  if (set.has(topicId)) set.delete(topicId);
  else set.add(topicId);
  return [...set];
}
