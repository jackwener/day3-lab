import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppInitializer, ErrorBoundary } from "@/components/layout";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "命理测算 - 个性化命理分析工具",
  description: "基于传统命理学的个性化黄历、运势问询和命格解析工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} bg-bg text-text-primary min-h-screen antialiased`}>
        <ErrorBoundary>
          <AppInitializer>{children}</AppInitializer>
        </ErrorBoundary>
      </body>
    </html>
  );
}
