import { sqlClient } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const sql = sqlClient();
  const rows = await sql`SELECT image_url FROM short_links WHERE id=${id}`;
  const value = String(rows[0]?.image_url ?? "");
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(match[2], "base64")), { headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=31536000, immutable" } });
}
