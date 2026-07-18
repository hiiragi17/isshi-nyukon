import type { Metadata, Viewport } from "next";
import { PAPER } from "@/lib/tokens";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

/**
 * OGP 等の絶対URL解決に使うベースURL。
 * Vercel では VERCEL_URL が自動注入される。ローカルや未設定時は開発URLにフォールバックする
 * (環境変数なしでもビルド・動作する前提を崩さない)。
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const title = "一肢入魂";
const description = "宅建学習ゲーム。全部の肢に、理由をつけて決着をつける。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: title,
  // iOS でホーム画面に追加したとき standalone(ブラウザUIなし)で開くための指定。
  // Android / デスクトップは app/manifest.ts の display: "standalone" が効く
  appleWebApp: {
    capable: true,
    title,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: title,
    title,
    description,
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: PAPER,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
