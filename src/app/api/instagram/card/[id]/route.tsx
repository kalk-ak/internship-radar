import { ImageResponse } from "next/og";
import sharp from "sharp";
import { locationLabel } from "@/lib/format";
import { kv } from "@/lib/kv";
import { cardKey, type InstagramCard } from "@/lib/notify";

const W = 1080;
const H = 1350;

/** Renders a portrait post card as JPEG (the only format Instagram's publishing API accepts). */
export async function GET(_request: Request, ctx: RouteContext<"/api/instagram/card/[id]">) {
  const { id } = await ctx.params;
  if (!/^[\w-]{6,20}$/.test(id)) return new Response("Not found", { status: 404 });
  const card = await kv().get<InstagramCard>(cardKey(id));
  if (!card) return new Response("Not found", { status: 404 });

  const roles = card.roles.slice(0, 5);
  const png = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0a0d14", color: "#e7eaf3", padding: 80, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: "#ffb547" }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#ffb547", display: "flex" }} />
          Internship Radar · Hot drop
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>{card.company}</div>
          <div style={{ fontSize: 54, color: "#b4bccf", marginTop: 18 }}>
            just opened {card.roles.length} internship role{card.roles.length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70, gap: 26 }}>
          {roles.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", borderLeft: "6px solid #ffb547", paddingLeft: 28 }}>
              <div style={{ fontSize: 40, fontWeight: 700 }}>{r.title.length > 60 ? `${r.title.slice(0, 57)}…` : r.title}</div>
              <div style={{ fontSize: 30, color: "#7c859e", marginTop: 6 }}>
                {[locationLabel(r), r.terms.join(", ")].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end", fontSize: 30, color: "#7c859e" }}>
          <div style={{ display: "flex" }}>Apply early. Roles fill fast.</div>
          <div style={{ display: "flex", color: "#ffb547" }}>Free alerts: link in bio</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
