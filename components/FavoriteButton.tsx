"use client";

/**
 * お気に入り(論点)のトグルボタン。星アイコンはSVG(絵文字UIは使わない・既決事項)。
 * 判決画面(論点ごとの一覧)と検地帳の論点詳細の2箇所で使う共通コンポーネント。
 */
import { SHU, MUTED, SANS } from "@/lib/tokens";

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
}: {
  active: boolean;
  onClick: () => void;
  /** md: 通常のテキスト付きボタン / sm: 一覧の行内に置く小さいアイコンボタン */
  size?: "sm" | "md";
  /** 未登録時の色。墨地カード等、通常の MUTED だと沈む背景に置くときに上書きする */
  inactiveColor?: string;
}) {
  const color = active ? SHU : inactiveColor;
  if (size === "sm") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? "お気に入りから外す" : "お気に入りに追加する"}
        title={active ? "お気に入りから外す" : "お気に入りに追加する"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          flexShrink: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <StarIcon filled={active} color={color} />
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
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      <StarIcon filled={active} color={color} />
      {active ? "お気に入り済み" : "お気に入りに追加"}
    </button>
  );
}
