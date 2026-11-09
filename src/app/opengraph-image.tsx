import { ImageResponse } from "next/og";

export const alt = "Internship Radar: free SWE internship alerts for FAANG+ and top quant firms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0d1117", color: "#f0f6fc", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, color: "#9198a1" }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="#f0f6fc" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="8.5" fill="none" stroke="#3d444d" strokeWidth="1.5" />
            <path d="M16 16 L27 8" stroke="#f0f6fc" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="22.5" cy="11" r="2.6" fill="#3fb950" />
          </svg>
          <span style={{ display: "flex" }}>kalk-ak / </span>
          <span style={{ display: "flex", color: "#f0f6fc", fontWeight: 700 }}>internship-radar</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Get alerts when top companies open SWE internships</div>
          <div style={{ fontSize: 32, color: "#9198a1", marginTop: 28 }}>
            Checks for new postings every 5 minutes. Email, Telegram, Discord, WhatsApp.
          </div>
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 6 }}>
          {Array.from({ length: 52 }, (_, i) => {
            const shades = ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"];
            const v = Math.abs(Math.sin(i * 1.7) * 5) | 0;
            return <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: shades[Math.min(4, v)] }} />;
          })}
        </div>
      </div>
    ),
    size,
  );
}
