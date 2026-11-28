import type { Metadata } from "next";
import { origin } from "./seo";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = localFont({
  src: "./fonts/NotoSansKR-Variable.woff2",
  variable: "--font-noto-sans-kr",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "위마켓 광고",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton duration={4000} />
        </Providers>
      </body>
    </html>
  );
}
