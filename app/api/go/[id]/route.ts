import { sqlClient, recordItemClick } from "@/lib/db";
import { normalizeUrl } from "@/lib/urls";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Lien introuvable', { status: 404 });
  const sql = sqlClient();
  const rows = await sql`SELECT * FROM page_items WHERE id=${id}`;
  const item = rows[0];
  const now = new Date();
  if (!item || !item.enabled || (item.publish_at && now < new Date(String(item.publish_at))) || (item.expires_at && now > new Date(String(item.expires_at)))) return new Response('Ce lien est indisponible.', { status: 410 });
  const destination = String(item.url);
  if (request.method === 'GET') await recordItemClick(id, request);
  return new Response(null, { status: 307, headers: { Location: normalizeUrl(destination), 'Cache-Control': 'no-store' } });
}
