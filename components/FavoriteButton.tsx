"use client";

/**
 * お気に入りのトグルボタン。星アイコンはSVG(絵文字UIは使わない・既決事項)。
 * 肢1件単位(play 中の ZenshiEngine)と、論点まるごと(全肢)単位
 * (判決画面の論点一覧・検地帳の論点詳細)の両方で使う共通コンポーネント。
 * どちらの単位かは呼び出し側の onClick が何を渡すかで決まる(このボタン自体は関知しない)。
 */
import { SHU, MUTED, INK, SANS, RADIUS } from "@/lib/tokens";

function StarIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path
        d="M10 1.6 12.5 7.2 18.6 7.9 14 12 15.3 18.1 10 14.9 4.7 18.1 6 12 1.4 7.9 7.5 7.2Z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteButton({
  active,
  onClick,
  size = "md",
  inactiveColor = MUTED,
  showLabel = false,
}: {
  active: boolean;
  onClick: () => void;
  /** md: 通常のテキスト付きボタン / sm: 一覧の行内に置く小さいアイコンボタン */
  size?: "sm" | "md";
  /** 未登録時の色。墨地カード等、通常の MUTED だと沈む背景に置くときに上書きする */
  inactiveColor?: string;
  /** sm のとき星の隣に短い文字を添える(アイコンだけだと意味が伝わらない場面用) */
  showLabel?: boolean;
}) {
  const color = active ? SHU : inactiveColor;
  if (size === "sm") {
    // 文字は小さいので MUTED のままだとコントラスト不足(約3.65:1)。星アイコンだけ MUTED を保つ
    const labelColor = active || inactiveColor !== MUTED ? color : INK;
    const actionLabel = active ? "お気に入りから外す" : "お気に入りに追加する";
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={actionLabel}
        title={actionLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          minWidth: 44,
          height: 44,
          padding: showLabel ? "0 8px" : 0,
          flexShrink: 0,
          fontFamily: SANS,
          fontSize: 12.5,
          fontWeight: 700,
          color: labelColor,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <StarIcon filled={active} color={color} />
        {showLabel && (active ? "登録済み" : "お気に入り")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 12px",
        fontFamily: SANS,
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: 1,
        color,
        background: "transparent",
        border: `1.5px solid ${color}`,
        borderRadius: RADIUS,
        cursor: "pointer",
      }}
    >
      <StarIcon filled={active} color={color} />
      {active ? "お気に入り済み" : "お気に入りに追加"}
    </button>
  );
}
