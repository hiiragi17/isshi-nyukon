/**
 * マイソク広告(spot 間違い探し用)のディスパッチャ。
 *
 * 広告レイアウトは意図的に広告ごとの bespoke コンポーネント(components/spot-ads/)。
 * 完全データ駆動化はせず、question.id で描画する広告を振り分ける
 * (既決事項「広告2枚目を作る時に判断」→ 忠実性優先でハードコード継続)。
 * SpotEngine 自体はゾーン駆動のまま汎用。
 */
import { MidoridaiAd } from "./spot-ads/MidoridaiAd";
import { SakuraAd } from "./spot-ads/SakuraAd";
import type { SpotAdProps } from "./spot-ads/types";

type Props = SpotAdProps & { questionId: string };

export function SpotAd({ questionId, ...rest }: Props) {
  switch (questionId) {
    case "q11":
      return <SakuraAd {...rest} />;
    case "q6":
      return <MidoridaiAd {...rest} />;
    default:
      if (process.env.NODE_ENV !== "production") {
        console.warn(`SpotAd: no ad registered for questionId "${questionId}"`);
      }
      return null;
  }
}
