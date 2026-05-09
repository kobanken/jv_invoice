import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JV請求管理",
  description: "タオル・おしぼり配達/クリーニング事業向け請求管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
