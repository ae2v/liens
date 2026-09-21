import { ImageResponse } from "next/og";
import { sqlClient } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sql = sqlClient();
  const rows = await sql`SELECT * FROM short_links WHERE id=${id}`;
  const link = rows[0];
  if (!link) return new Response(null, { status: 404 });
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "white", background: String(link.embed_color || "#d60106"), fontFamily: "Arial" }}><div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>AE2V · BDE de Vélizy</div><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: 70, lineHeight: 1.05, fontWeight: 800, maxWidth: 1040 }}>{String(link.title)}</div><div style={{ display: "flex", marginTop: 22, fontSize: 30, opacity: .85 }}>{String(link.description || "Always further, together")}</div></div><div style={{ display: "flex", fontSize: 24, opacity: .72 }}>liens.ae2v.fr/{String(link.slug)}</div></div>, { width: 1200, height: 630 });
}
