/**
 * マイソク広告(spot 間違い探し用)のディスパッチャ。
 *
 * 広告レイアウトは意図的に広告ごとの bespoke コンポーネント(components/spot-ads/)。
 * 完全データ駆動化はせず、question.id で描画する広告を振り分ける
 * (Issue #591 で判断: 4枚の広告は文言・配色・ゾーン内の構造・丸印の位置が広告ごとに固有で、
 * データで表すと JSX の再発明になる。共通部品は spot-ads/Mark.tsx に抽出済み。経緯は CLAUDE.md の既決事項)。
 * SpotEngine 自体はゾーン駆動のまま汎用。新しい広告は、広告コンポーネントを足してここに登録する。
 */
import { HibariAd } from "./spot-ads/HibariAd";
import { MidoridaiAd } from "./spot-ads/MidoridaiAd";
import { SakuraAd } from "./spot-ads/SakuraAd";
import { TsubasaAd } from "./spot-ads/TsubasaAd";
import type { SpotAdProps } from "./spot-ads/types";

type Props = SpotAdProps & { questionId: string };

export function SpotAd({ questionId, ...rest }: Props) {
  switch (questionId) {
    case "q11":
      return <SakuraAd {...rest} />;
    case "q6":
      return <MidoridaiAd {...rest} />;
    case "q57":
      return <HibariAd {...rest} />;
    case "q164":
      return <TsubasaAd {...rest} />;
    default:
      if (process.env.NODE_ENV !== "production") {
        console.warn(`SpotAd: no ad registered for questionId "${questionId}"`);
      }
      return null;
  }
}
