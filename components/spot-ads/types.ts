/** マイソク広告コンポーネント共通の props(SpotEngine から渡る) */
export type SpotAdProps = {
  /** 認容済みゾーンの id(タップ順)。丸印バッジの番号に使う */
  found: string[];
  /** 申立て確認中のゾーン id(青枠) */
  pending: string | null;
  /** 全違反を摘発し終えたか(「摘発」スタンプ表示) */
  done: boolean;
  /** ゾーンをタップしたとき */
  onTap: (id: string) => void;
};
