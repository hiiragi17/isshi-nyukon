/**
 * 一肢入魂 — お気に入り(肢)
 *
 * 「あとで出せる」ためのしおり。単位は itemKey(`${questionId}-${choiceIndex}`。
 * lib/storage の itemKey と同じ粒度=1肢)。calc / spot は1問=1肢なので、
 * 結果としてその問題まるごとの登録になる。
 *
 * 論点(topicId)単位でまとめて登録・解除したいとき(ダッシュボード・判決画面の
 * 論点カード)は toggleFavoriteGroup を使う。その論点に属する全 itemKey が
 * 渡されたグループを1単位として扱い、中間状態(一部だけ登録済み)は
 * 「未選択」とみなして全登録側に倒す(チェックボックスの全選択と同じ挙動)。
 *
 * 永続化は StorageAdapter(lib/storage の getFavorites / saveFavorites)経由。
 * ここは DOM に依存しない純粋な集合操作だけを担う。
 */

/** 指定した itemKey のお気に入りを反転させた新しい配列を返す(重複を作らない) */
export function toggleFavorite(itemKeys: string[], itemKey: string): string[] {
  const set = new Set(itemKeys);
  if (set.has(itemKey)) set.delete(itemKey);
  else set.add(itemKey);
  return [...set];
}

/**
 * groupKeys(ある論点に属する全 itemKey)をまとめて反転させた新しい配列を返す。
 * groupKeys が1つでも欠けていれば全て追加、全て揃っていれば全て取り除く。
 */
export function toggleFavoriteGroup(
  itemKeys: string[],
  groupKeys: string[],
): string[] {
  const set = new Set(itemKeys);
  const allIn = groupKeys.every((k) => set.has(k));
  for (const k of groupKeys) {
    if (allIn) set.delete(k);
    else set.add(k);
  }
  return [...set];
}
