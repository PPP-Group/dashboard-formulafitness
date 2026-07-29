import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";

/** Sora is the typeface the Formula Fitness site ships. */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${brand.name} — Metrics Dashboard`,
  description: `Live GoHighLevel metrics for ${brand.name}.`,
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
