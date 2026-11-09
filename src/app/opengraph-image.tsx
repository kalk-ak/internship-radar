import { ImageResponse } from "next/og";

export const alt = "Internship Radar: free SWE internship alerts for FAANG+ and top quant firms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0a0d14", color: "#e7eaf3", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, color: "#7c859e" }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="#333d57" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="8.5" fill="none" stroke="#333d57" strokeWidth="1.5" />
            <path d="M16 16 L27 8" stroke="#e7eaf3" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="22.5" cy="11" r="2.6" fill="#ffb547" />
          </svg>
                    <span style={{ display: "flex", color: "#e7eaf3", fontWeight: 700 }}>internship-radar</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Get alerts when top companies open SWE internships</div>
          <div style={{ fontSize: 32, color: "#b4bccf", marginTop: 28 }}>
            Checks for new postings every 5 minutes. Email, Telegram, Discord, WhatsApp.
          </div>
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 6 }}>
          {Array.from({ length: 52 }, (_, i) => {
            const shades = ["#161b2a", "#3b2d18", "#6f4d1e", "#b87b28", "#ffb547"];
            const v = Math.abs(Math.sin(i * 1.7) * 5) | 0;
            return <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: shades[Math.min(4, v)] }} />;
          })}
        </div>
      </div>
    ),
    size,
  );
}
