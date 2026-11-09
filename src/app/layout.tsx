import type { Metadata, Viewport } from "next";
import { Anybody, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const anybody = Anybody({ subsets: ["latin"], axes: ["wdth"], variable: "--font-anybody" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

export const metadata: Metadata = {
  title: { default: "Internship Radar: alerts when top companies open SWE internships", template: "%s | Internship Radar" },
  description:
    "Watches the SimplifyJobs internship list every 5 minutes and alerts you on email, Telegram, Discord or WhatsApp when FAANG+ and top quant firms open new SWE internship roles.",
};

export const viewport: Viewport = { themeColor: "#f3f5fa" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anybody.variable} ${hanken.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
