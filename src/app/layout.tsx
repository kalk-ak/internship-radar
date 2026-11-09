import type { Metadata, Viewport } from "next";
import { Anybody, Hanken_Grotesk } from "next/font/google";
import { appUrl } from "@/lib/env";
import "./globals.css";

const anybody = Anybody({ subsets: ["latin"], axes: ["wdth"], variable: "--font-anybody" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  applicationName: "Internship Radar",
  authors: [{ name: "Kaleb Aklilu", url: "https://github.com/kalk-ak" }],
  openGraph: { type: "website", siteName: "Internship Radar", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  title: { default: "Internship Radar: alerts when top companies open SWE internships", template: "%s | Internship Radar" },
  description:
    "Checks for new internship postings every 5 minutes and alerts you on email, Telegram, Discord or WhatsApp when FAANG+ and top quant firms open new SWE internship roles.",
};

export const viewport: Viewport = { themeColor: "#f3f5fa" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anybody.variable} ${hanken.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
